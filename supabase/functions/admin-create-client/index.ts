import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminCreateClientRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
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
    console.log("[admin-create-client]", {
      method: req.method,
      path: url.pathname,
      hasAuth: Boolean(authHeader),
    });

    // Authenticated user client (for checking requester + role)
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

    const { email, password, full_name, phone = null, address = null }: AdminCreateClientRequest =
      await req.json();

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client (create user + write profile/roles)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError || !createData.user) {
      console.error("Create user error:", createError);
      return new Response(JSON.stringify({ error: createError?.message ?? "Create user failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = createData.user.id;

    // Ensure profile exists
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: newUserId,
      email,
      full_name,
      phone,
      address,
    });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      return new Response(JSON.stringify({ error: "Profile creation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure role row exists (roles are stored in user_roles)
    const { error: rolesError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: "client",
    });

    if (rolesError) {
      // If it already exists, we don't want to fail the entire flow.
      // Still log it so we can debug misconfigurations.
      console.warn("User role insert warning:", rolesError);
    }

    // Send credentials email
    const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke(
      "send-email",
      {
        body: {
          type: "credentials",
          to: email,
          data: { name: full_name, email, password },
        },
      }
    );

    if (emailError) {
      console.error("Credentials email error:", emailError);
      // We don't fail the user creation; we report partial success.
      return new Response(
        JSON.stringify({
          success: true,
          user_id: newUserId,
          email_sent: false,
          email_error: emailError.message,
          email_result: emailResult ?? null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId, email_sent: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-create-client:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
