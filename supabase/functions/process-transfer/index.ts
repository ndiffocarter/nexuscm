import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessTransferRequest {
  fromAccountId: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    const url = new URL(req.url);
    console.log("[process-transfer]", {
      method: req.method,
      path: url.pathname,
      hasAuth: Boolean(authHeader),
    });

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { fromAccountId, toAccountNumber, amount, description }: ProcessTransferRequest =
      await req.json();

    if (!fromAccountId || !toAccountNumber || !Number.isFinite(amount)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount <= 0) {
      return new Response(JSON.stringify({ error: "Le montant doit être supérieur à 0" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Load sender account and validate ownership
    const { data: senderAccount, error: senderError } = await supabaseAdmin
      .from("accounts")
      .select("id, user_id, account_number, balance, is_active")
      .eq("id", fromAccountId)
      .maybeSingle();

    if (senderError) {
      console.error("Sender account error:", senderError);
      return new Response(JSON.stringify({ error: "Erreur lors du chargement du compte source" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!senderAccount || !senderAccount.is_active) {
      return new Response(JSON.stringify({ error: "Compte source non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (senderAccount.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Accès refusé au compte source" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load recipient account
    const { data: recipientAccount, error: recipientError } = await supabaseAdmin
      .from("accounts")
      .select("id, user_id, account_number, balance, is_active")
      .eq("account_number", toAccountNumber)
      .eq("is_active", true)
      .maybeSingle();

    if (recipientError) {
      console.error("Recipient account error:", recipientError);
      return new Response(JSON.stringify({ error: "Erreur lors du chargement du compte destinataire" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipientAccount) {
      return new Response(JSON.stringify({ error: "Compte destinataire non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (recipientAccount.id === senderAccount.id) {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez pas effectuer un virement vers le même compte" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const senderBalance = Number(senderAccount.balance);
    const recipientBalance = Number(recipientAccount.balance);

    if (Number.isNaN(senderBalance) || Number.isNaN(recipientBalance)) {
      return new Response(JSON.stringify({ error: "Solde invalide" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount > senderBalance) {
      return new Response(JSON.stringify({ error: "Solde insuffisant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderNewBalance = senderBalance - amount;
    const recipientNewBalance = recipientBalance + amount;

    // Update balances
    const { error: senderUpdateError } = await supabaseAdmin
      .from("accounts")
      .update({ balance: senderNewBalance })
      .eq("id", senderAccount.id);

    if (senderUpdateError) {
      console.error("Sender update error:", senderUpdateError);
      return new Response(JSON.stringify({ error: "Impossible de débiter le compte source" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: recipientUpdateError } = await supabaseAdmin
      .from("accounts")
      .update({ balance: recipientNewBalance })
      .eq("id", recipientAccount.id);

    if (recipientUpdateError) {
      console.error("Recipient update error:", recipientUpdateError);
      // Best-effort rollback
      await supabaseAdmin.from("accounts").update({ balance: senderBalance }).eq("id", senderAccount.id);

      return new Response(JSON.stringify({ error: "Impossible de créditer le compte destinataire" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txDescription = description?.trim() || `Virement vers ${toAccountNumber}`;

    // Transactions
    const { error: txError } = await supabaseAdmin.from("transactions").insert([
      {
        account_id: senderAccount.id,
        transaction_type: "transfer",
        amount,
        description: txDescription,
        recipient_account_id: recipientAccount.id,
      },
      {
        account_id: recipientAccount.id,
        transaction_type: "credit",
        amount,
        description: description?.trim() || `Virement de ${senderAccount.account_number}`,
      },
    ]);

    if (txError) {
      console.error("Transaction insert error:", txError);
      // We do not rollback balances here to keep this function simple, but we log it.
    }

    // Notifications
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    const { data: recipientProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", recipientAccount.user_id)
      .maybeSingle();

    const senderName = senderProfile?.full_name ?? "Client";
    const recipientName = recipientProfile?.full_name ?? "Client";

    const { error: notifError } = await supabaseAdmin.from("notifications").insert([
      {
        user_id: userId,
        title: "Virement effectué",
        message: `Votre virement de ${amount} € vers ${toAccountNumber} a été effectué avec succès.`,
        notification_type: "transfer_sent",
      },
      {
        user_id: recipientAccount.user_id,
        title: "Virement reçu",
        message: `Vous avez reçu un virement de ${amount} € de ${senderName}.`,
        notification_type: "transfer_received",
      },
    ]);

    if (notifError) {
      console.error("Notifications insert error:", notifError);
    }

    // Emails (best-effort)
    try {
      if (senderProfile?.email) {
        await supabaseAdmin.functions.invoke("send-email", {
          body: {
            type: "transfer_sent",
            to: senderProfile.email,
            data: {
              name: senderName,
              amount,
              accountNumber: senderAccount.account_number,
              recipientAccountNumber: toAccountNumber,
              description: txDescription,
            },
          },
        });
      }

      if (recipientProfile?.email) {
        await supabaseAdmin.functions.invoke("send-email", {
          body: {
            type: "transfer_received",
            to: recipientProfile.email,
            data: {
              name: recipientName,
              amount,
              accountNumber: recipientAccount.account_number,
              senderName,
              description: txDescription,
            },
          },
        });
      }
    } catch (e) {
      console.error("Email notifications error:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sender_new_balance: senderNewBalance,
        recipient_new_balance: recipientNewBalance,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-transfer:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
