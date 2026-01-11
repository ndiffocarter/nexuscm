import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TwoFactorVerification from '@/components/TwoFactorVerification';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserEmail, setPendingUserEmail] = useState<string>('');
  const [pendingUserName, setPendingUserName] = useState<string>('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Get the user info
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check if 2FA is enabled for this user
    const { data: settings } = await supabase
      .from('user_2fa_settings' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .maybeSingle();

    if (settings) {
      // 2FA is enabled, sign out temporarily and show 2FA screen
      await supabase.auth.signOut();
      
      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      setPendingUserId(user.id);
      setPendingUserEmail(email);
      setPendingUserName(profile?.full_name || '');
      setShow2FA(true);
      
      // Send 2FA code
      try {
        await supabase.functions.invoke('send-2fa-code', {
          body: {
            user_id: user.id,
            email: email,
            full_name: profile?.full_name
          }
        });
        toast({
          title: "Code envoyé",
          description: "Vérifiez votre email pour le code de vérification",
        });
      } catch (err) {
        console.error('Error sending 2FA code:', err);
      }
    } else {
      // No 2FA, proceed normally - record login history
      try {
        await supabase.functions.invoke('record-login-history', {
          body: {
            user_id: user.id,
            ip_address: null,
            user_agent: navigator.userAgent,
            success: true
          }
        });
      } catch (err) {
        console.error('Error recording login history:', err);
      }
      
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur votre espace bancaire",
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const handle2FASuccess = async () => {
    // Re-sign in after 2FA verification
    const { error } = await signIn(email, password);
    
    if (!error) {
      // Record login history after successful 2FA
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.functions.invoke('record-login-history', {
            body: {
              user_id: user.id,
              ip_address: null,
              user_agent: navigator.userAgent,
              success: true
            }
          });
        } catch (err) {
          console.error('Error recording login history:', err);
        }
      }
      
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur votre espace bancaire",
      });
      navigate('/dashboard');
    }
  };

  const handle2FACancel = () => {
    setShow2FA(false);
    setPendingUserId(null);
    setPendingUserEmail('');
    setPendingUserName('');
  };

  if (show2FA && pendingUserId) {
    return (
      <TwoFactorVerification
        userId={pendingUserId}
        email={pendingUserEmail}
        fullName={pendingUserName}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
      />
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden [background:var(--gradient-primary)]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl animate-float" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">SecureBank</h1>
              <p className="text-white/70">Solutions bancaires modernes</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold leading-tight mb-6 animate-fade-in-up">
            Gérez vos finances <br />
            en toute <span className="gradient-gold-text">sécurité</span>
          </h2>
          
          <p className="text-lg text-white/80 max-w-md animate-fade-in-up stagger-1">
            Accédez à votre espace personnel pour consulter vos comptes, 
            effectuer des virements et gérer vos demandes de prêt.
          </p>
          
          <div className="mt-12 flex gap-8 animate-fade-in-up stagger-2">
            <div>
              <div className="text-3xl font-bold">100K+</div>
              <div className="text-white/70">Clients satisfaits</div>
            </div>
            <div>
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-white/70">Support disponible</div>
            </div>
            <div>
              <div className="text-3xl font-bold">256-bit</div>
              <div className="text-white/70">Cryptage SSL</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-6">
          <ThemeToggle />
        </div>
        
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <div className="w-12 h-12 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">SecureBank</span>
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Connexion</h2>
              <p className="text-muted-foreground">
                Entrez vos identifiants pour accéder à votre compte
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="xl"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Vous avez reçu vos identifiants par email de la part de votre administrateur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
