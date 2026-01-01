import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'credentials' | 'transfer_sent' | 'transfer_received' | 'loan_approved' | 'loan_rejected';
  to: string;
  data: {
    name?: string;
    email?: string;
    password?: string;
    amount?: number;
    accountNumber?: string;
    recipientAccountNumber?: string;
    senderName?: string;
    description?: string;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(amount);
};

const getEmailContent = (type: string, data: EmailRequest['data']) => {
  switch (type) {
    case 'credentials':
      return {
        subject: 'Bienvenue sur SecureBank - Vos identifiants de connexion',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 40px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 40px; }
              .credentials-box { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #d4af37; }
              .credential { margin: 12px 0; }
              .label { color: #64748b; font-size: 14px; }
              .value { color: #1e3a5f; font-size: 18px; font-weight: bold; margin-top: 4px; }
              .warning { background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 20px; color: #92400e; font-size: 14px; }
              .button { display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin-top: 24px; font-weight: bold; }
              .footer { background: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏦 SecureBank</h1>
                <p style="margin-top: 8px; opacity: 0.9;">Votre banque de confiance</p>
              </div>
              <div class="content">
                <h2 style="color: #1e3a5f; margin-top: 0;">Bienvenue ${data.name} !</h2>
                <p style="color: #475569; line-height: 1.6;">Votre compte bancaire a été créé avec succès. Voici vos identifiants de connexion :</p>
                
                <div class="credentials-box">
                  <div class="credential">
                    <div class="label">📧 Email</div>
                    <div class="value">${data.email}</div>
                  </div>
                  <div class="credential">
                    <div class="label">🔐 Mot de passe</div>
                    <div class="value">${data.password}</div>
                  </div>
                </div>
                
                <div class="warning">
                  ⚠️ Pour votre sécurité, nous vous recommandons de changer votre mot de passe lors de votre première connexion.
                </div>
                
                <center>
                  <a href="${Deno.env.get('SITE_URL') || 'https://lovable.dev'}/login" class="button">
                    Se connecter
                  </a>
                </center>
              </div>
              <div class="footer">
                <p>© 2024 SecureBank. Tous droits réservés.</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
    
    case 'transfer_sent':
      return {
        subject: `Virement effectué - ${formatCurrency(data.amount || 0)}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 40px; text-align: center; }
              .content { padding: 40px; }
              .amount { font-size: 36px; font-weight: bold; color: #dc2626; text-align: center; margin: 24px 0; }
              .details { background: #f8fafc; border-radius: 12px; padding: 24px; }
              .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
              .detail-row:last-child { border-bottom: none; }
              .footer { background: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💸 Virement effectué</h1>
              </div>
              <div class="content">
                <p style="color: #475569;">Bonjour ${data.name},</p>
                <p style="color: #475569;">Un virement a été effectué depuis votre compte.</p>
                
                <div class="amount">-${formatCurrency(data.amount || 0)}</div>
                
                <div class="details">
                  <div class="detail-row">
                    <span style="color: #64748b;">De</span>
                    <span style="font-weight: bold; color: #1e3a5f;">${data.accountNumber}</span>
                  </div>
                  <div class="detail-row">
                    <span style="color: #64748b;">Vers</span>
                    <span style="font-weight: bold; color: #1e3a5f;">${data.recipientAccountNumber}</span>
                  </div>
                  <div class="detail-row">
                    <span style="color: #64748b;">Description</span>
                    <span style="color: #1e3a5f;">${data.description || 'Virement'}</span>
                  </div>
                </div>
              </div>
              <div class="footer">
                <p>© 2024 SecureBank. Tous droits réservés.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
    
    case 'transfer_received':
      return {
        subject: `Virement reçu - ${formatCurrency(data.amount || 0)}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 40px; text-align: center; }
              .content { padding: 40px; }
              .amount { font-size: 36px; font-weight: bold; color: #059669; text-align: center; margin: 24px 0; }
              .details { background: #f8fafc; border-radius: 12px; padding: 24px; }
              .detail-row { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
              .detail-row:last-child { border-bottom: none; }
              .footer { background: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💰 Virement reçu</h1>
              </div>
              <div class="content">
                <p style="color: #475569;">Bonjour ${data.name},</p>
                <p style="color: #475569;">Vous avez reçu un virement sur votre compte.</p>
                
                <div class="amount">+${formatCurrency(data.amount || 0)}</div>
                
                <div class="details">
                  <div class="detail-row">
                    <span style="color: #64748b;">De</span>
                    <span style="font-weight: bold; color: #1e3a5f; display: block; margin-top: 4px;">${data.senderName || 'Client SecureBank'}</span>
                  </div>
                  <div class="detail-row">
                    <span style="color: #64748b;">Sur le compte</span>
                    <span style="font-weight: bold; color: #1e3a5f; display: block; margin-top: 4px;">${data.accountNumber}</span>
                  </div>
                  <div class="detail-row">
                    <span style="color: #64748b;">Description</span>
                    <span style="color: #1e3a5f; display: block; margin-top: 4px;">${data.description || 'Virement'}</span>
                  </div>
                </div>
              </div>
              <div class="footer">
                <p>© 2024 SecureBank. Tous droits réservés.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
    
    default:
      return {
        subject: 'Notification SecureBank',
        html: `<p>Notification de SecureBank</p>`
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();
    
    console.log(`Sending ${type} email to ${to}`);
    
    const { subject, html } = getEmailContent(type, data);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SecureBank <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: emailResponse.ok ? 200 : 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
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
