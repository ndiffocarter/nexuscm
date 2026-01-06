import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminDeleteClientRequest {
  client_id: string;
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

    // Authenticated user client (for checking requester + role)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = userData.user.id;

    const { data: isAdmin, error: roleError } = await supabaseUser.rpc("has_role", {
      _user_id: requesterId,
      _role: "admin",
    });

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id }: AdminDeleteClientRequest = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "Missing client_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client (delete user)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify that the user exists and has the client role
    const { data: isClient, error: isClientError } = await supabaseAdmin.rpc("has_role", {
      _user_id: client_id,
      _role: "client",
    });

    if (isClientError) {
      console.error("Client role check error:", isClientError);
      return new Response(JSON.stringify({ error: "Could not verify client" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isClient) {
      return new Response(JSON.stringify({ error: "User is not a client or does not exist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete user from auth (this will cascade to profiles and user_roles via triggers/RLS)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(client_id);

    if (deleteError) {
      console.error("Delete user error:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also clean up related data manually (in case no cascade)
    await supabaseAdmin.from("profiles").delete().eq("id", client_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", client_id);
    await supabaseAdmin.from("accounts").delete().eq("user_id", client_id);
    await supabaseAdmin.from("notifications").delete().eq("user_id", client_id);
    await supabaseAdmin.from("support_tickets").delete().eq("user_id", client_id);
    await supabaseAdmin.from("loans").delete().eq("user_id", client_id);

    console.log("Client deleted successfully:", client_id);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-delete-client:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
