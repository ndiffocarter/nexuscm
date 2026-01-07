import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  client_id: string;
}

// Generate a random password
function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
    console.log("[reset-client-password]", {
      method: req.method,
      hasAuth: Boolean(authHeader),
    });

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

    // Check if requester is admin
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
      return new Response(JSON.stringify({ error: "Forbidden - Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id }: ResetPasswordRequest = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get client profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", client_id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      client_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to reset password" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Password reset successful for:", profile.email);

    // Send email with new credentials
    const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke(
      "send-email",
      {
        body: {
          type: "credentials",
          to: profile.email,
          data: { 
            name: profile.full_name, 
            email: profile.email, 
            password: newPassword 
          },
        },
      }
    );

    if (emailError) {
      console.error("Email send error:", emailError);
      // Password was reset but email failed
      return new Response(
        JSON.stringify({
          success: true,
          password_reset: true,
          email_sent: false,
          email_error: emailError.message,
          new_password: newPassword, // Return password if email fails
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if email was actually sent (Resend might return success but with validation error)
    const emailHasError = emailResult?.statusCode === 403 || emailResult?.name === "validation_error";

    return new Response(
      JSON.stringify({
        success: true,
        password_reset: true,
        email_sent: !emailHasError,
        email_error: emailHasError ? emailResult?.message : null,
        new_password: emailHasError ? newPassword : undefined, // Only return if email failed
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in reset-client-password:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
