import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(amount);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Generating weekly report...");

    // Get date range for last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Fetch all admin emails
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found");
      return new Response(
        JSON.stringify({ message: "Aucun admin trouvé" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('id', adminIds);

    const adminEmails = adminProfiles?.map(p => p.email) || [];

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "Aucun email admin trouvé" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch statistics
    // Total clients
    const { count: totalClients } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client');

    // New clients this week
    const { count: newClients } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client')
      .gte('created_at', startDate.toISOString());

    // Total balance
    const { data: accounts } = await supabase
      .from('accounts')
      .select('balance');
    const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

    // Transactions this week
    const { data: weekTransactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startDate.toISOString());

    const transactionStats = {
      total: weekTransactions?.length || 0,
      credits: weekTransactions?.filter(t => t.transaction_type === 'credit').length || 0,
      debits: weekTransactions?.filter(t => t.transaction_type === 'debit').length || 0,
      transfers: weekTransactions?.filter(t => t.transaction_type === 'transfer').length || 0,
      totalAmount: weekTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
    };

    // Pending loans
    const { count: pendingLoans } = await supabase
      .from('loans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Support tickets
    const { count: openTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Store report in database
    const reportData = {
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      clients: { total: totalClients, new: newClients },
      balance: { total: totalBalance },
      transactions: transactionStats,
      loans: { pending: pendingLoans },
      support: { openTickets }
    };

    await supabase.from('admin_reports').insert({
      report_type: 'weekly',
      report_data: reportData,
      sent_to: adminEmails
    });

    // Send email to all admins
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport Hebdomadaire SecureBank</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
        <div style="max-width: 700px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📊 Rapport Hebdomadaire</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">
              ${dateFormatter.format(startDate)} - ${dateFormatter.format(endDate)}
            </p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- Clients Section -->
            <h2 style="color: #1a365d; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">👥 Clients</h2>
            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
              <div style="flex: 1; background: #f0f9ff; padding: 20px; border-radius: 12px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">Total clients</p>
                <p style="margin: 10px 0 0 0; color: #1a365d; font-size: 32px; font-weight: bold;">${totalClients || 0}</p>
              </div>
              <div style="flex: 1; background: #f0fdf4; padding: 20px; border-radius: 12px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">Nouveaux cette semaine</p>
                <p style="margin: 10px 0 0 0; color: #16a34a; font-size: 32px; font-weight: bold;">+${newClients || 0}</p>
              </div>
            </div>

            <!-- Balance Section -->
            <h2 style="color: #1a365d; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">💰 Solde Total</h2>
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <p style="margin: 0; color: #92400e; font-size: 36px; font-weight: bold;">${formatCurrency(totalBalance)}</p>
            </div>

            <!-- Transactions Section -->
            <h2 style="color: #1a365d; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📈 Transactions de la semaine</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Total transactions</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${transactionStats.total}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Crédits</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #16a34a; font-weight: bold;">${transactionStats.credits}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Débits</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #dc2626; font-weight: bold;">${transactionStats.debits}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Virements</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #2563eb; font-weight: bold;">${transactionStats.transfers}</td>
              </tr>
              <tr>
                <td style="padding: 12px;">Volume total</td>
                <td style="padding: 12px; text-align: right; font-weight: bold;">${formatCurrency(transactionStats.totalAmount)}</td>
              </tr>
            </table>

            <!-- Pending Items -->
            <h2 style="color: #1a365d; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">⏳ En attente</h2>
            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
              <div style="flex: 1; background: #fef2f2; padding: 20px; border-radius: 12px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">Prêts en attente</p>
                <p style="margin: 10px 0 0 0; color: #dc2626; font-size: 28px; font-weight: bold;">${pendingLoans || 0}</p>
              </div>
              <div style="flex: 1; background: #fff7ed; padding: 20px; border-radius: 12px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">Tickets support ouverts</p>
                <p style="margin: 10px 0 0 0; color: #ea580c; font-size: 28px; font-weight: bold;">${openTickets || 0}</p>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              SecureBank - Rapport automatique généré le ${dateFormatter.format(new Date())}<br>
              Ce rapport est envoyé automatiquement chaque semaine.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    for (const email of adminEmails) {
      await resend.emails.send({
        from: "SecureBank <onboarding@resend.dev>",
        to: [email],
        subject: `📊 Rapport Hebdomadaire SecureBank - ${dateFormatter.format(startDate)} au ${dateFormatter.format(endDate)}`,
        html: emailHtml,
      });
      console.log(`Report sent to: ${email}`);
    }

    console.log("Weekly report generated and sent successfully");

    return new Response(
      JSON.stringify({ success: true, sentTo: adminEmails }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);