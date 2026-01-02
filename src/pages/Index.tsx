import { Link } from 'react-router-dom';
import { Building2, Shield, ArrowRight, CreditCard, TrendingUp, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">SecureBank</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/admin/login">
            <Button variant="ghost" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="gradient">
              Se connecter
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Lock className="w-4 h-4" />
            Banque en ligne sécurisée
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Gérez vos finances <br />
            <span className="gradient-text">en toute confiance</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            SecureBank vous offre une expérience bancaire moderne et sécurisée. 
            Consultez vos comptes, effectuez des virements et gérez vos prêts depuis n'importe où.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button variant="gradient" size="xl" className="min-w-48">
                Accéder à mon compte
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/admin/login">
              <Button variant="outline" size="xl" className="min-w-48">
                <Shield className="w-5 h-5 mr-2" />
                Espace administrateur
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-card rounded-2xl p-6 text-left">
            <div className="w-12 h-12 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gestion de comptes</h3>
            <p className="text-muted-foreground text-sm">
              Consultez vos soldes et historiques de transactions en temps réel.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-left">
            <div className="w-12 h-12 rounded-xl [background:var(--gradient-gold)] flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Virements instantanés</h3>
            <p className="text-muted-foreground text-sm">
              Transférez de l'argent facilement vers n'importe quel compte.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sécurité maximale</h3>
            <p className="text-muted-foreground text-sm">
              Protection avancée avec cryptage SSL 256-bit pour vos données.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-sm text-muted-foreground">
        <p>© 2026 SecureBank. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default Index;
