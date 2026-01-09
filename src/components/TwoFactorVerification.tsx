import { useState, useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorVerificationProps {
  userId: string;
  email: string;
  fullName?: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function TwoFactorVerification({ 
  userId, 
  email, 
  fullName, 
  onVerified, 
  onCancel 
}: TwoFactorVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Send initial code
    sendCode();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function sendCode() {
    if (countdown > 0) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: { user_id: userId, email, full_name: fullName }
      });

      if (error) throw error;

      toast({
        title: "Code envoyé",
        description: `Un code de vérification a été envoyé à ${email}`,
      });

      setCountdown(60); // 60 seconds cooldown
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le code",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { user_id: userId, code }
      });

      if (error) throw error;

      if (data.valid) {
        toast({
          title: "Vérification réussie",
          description: "Bienvenue !",
        });
        onVerified();
      } else {
        toast({
          title: "Code invalide",
          description: "Le code est incorrect ou a expiré",
          variant: "destructive",
        });
        setCode('');
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le code",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  }

  useEffect(() => {
    if (code.length === 6) {
      verifyCode();
    }
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 [background:var(--gradient-primary)] opacity-5" />
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <Card className="w-full max-w-md glass-card-elevated animate-fade-in-up">
        <CardHeader className="text-center">
          <div className="w-20 h-20 rounded-2xl [background:var(--gradient-primary)] flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl">Vérification à deux facteurs</CardTitle>
          <CardDescription>
            Entrez le code à 6 chiffres envoyé à<br />
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {isVerifying && (
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={sendCode}
              disabled={countdown > 0 || isSending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSending ? 'animate-spin' : ''}`} />
              {countdown > 0 ? `Renvoyer dans ${countdown}s` : 'Renvoyer le code'}
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Annuler
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}