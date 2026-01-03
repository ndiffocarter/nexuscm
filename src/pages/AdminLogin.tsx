import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
        description: "Identifiants administrateur incorrects",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Connexion admin réussie",
        description: "Bienvenue dans l'espace administration",
      });
      navigate('/admin');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 [background:var(--gradient-primary)] opacity-5" />
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="glass-card-elevated rounded-3xl p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl [background:var(--gradient-primary)] flex items-center justify-center mb-4 shadow-glow">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">SecureBank</span>
            </div>
            <h1 className="text-2xl font-bold">Espace Administrateur</h1>
            <p className="text-muted-foreground text-center mt-2">
              Accès réservé aux administrateurs autorisés
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email administrateur</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@securebank.com"
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
                  Authentification...
                </div>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Accéder à l'administration
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                Retour à la connexion client
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
