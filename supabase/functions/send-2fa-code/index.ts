import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TwoFactorRequest {
  user_id: string;
  email: string;
  full_name?: string;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, email, full_name }: TwoFactorRequest = await req.json();

    console.log("Generating 2FA code for user:", user_id);

    // Generate a 6-digit code
    const code = generateCode();
    
    // Set expiry to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Mark any existing codes as used
    await supabase
      .from('two_factor_codes')
      .update({ used: true })
      .eq('user_id', user_id)
      .eq('used', false);

    // Insert the new code
    const { error: insertError } = await supabase
      .from('two_factor_codes')
      .insert({
        user_id,
        code,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error("Error inserting 2FA code:", insertError);
      throw insertError;
    }

    // Send email with code
    const emailResponse = await resend.emails.send({
      from: "SecureBank <onboarding@resend.dev>",
      to: [email],
      subject: "Votre code de vérification SecureBank",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Code de vérification</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 SecureBank</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Vérification à deux facteurs</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Bonjour${full_name ? ` <strong>${full_name}</strong>` : ''},
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Voici votre code de vérification pour vous connecter à SecureBank :
              </p>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                <span style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #1a365d; font-family: 'Courier New', monospace;">
                  ${code}
                </span>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                ⏱️ Ce code expire dans <strong>10 minutes</strong>.
              </p>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  ⚠️ Si vous n'avez pas demandé ce code, ignorez cet email. Ne partagez jamais ce code avec quiconque.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                SecureBank - Solutions bancaires modernes<br>
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("2FA email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Code envoyé" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-2fa-code function:", error);
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