import { Link } from 'react-router-dom';
import { Building2, Shield, ArrowRight, CreditCard, TrendingUp, Lock, Users, Smartphone, Headphones, Globe, CheckCircle, Star, ChevronRight, Mail, Phone, MapPin } from 'lucide-react';
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
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 md:px-12">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold">SecureBank</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Link to="/admin/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="gradient" size="sm" className="sm:size-default">
              <span className="hidden sm:inline">Se connecter</span>
              <span className="sm:hidden">Connexion</span>
              <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-20 md:py-32 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 mb-6 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
              <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
              Banque en ligne sécurisée
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Gérez vos finances <br />
              <span className="gradient-text">en toute confiance</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-4">
              SecureBank vous offre une expérience bancaire moderne et sécurisée. 
              Consultez vos comptes, effectuez des virements et gérez vos prêts depuis n'importe où.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link to="/login">
                <Button variant="gradient" size="xl" className="min-w-48 w-full sm:w-auto">
                  Accéder à mon compte
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/admin/login">
                <Button variant="outline" size="xl" className="min-w-48 w-full sm:w-auto">
                  <Shield className="w-5 h-5 mr-2" />
                  Espace administrateur
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 sm:py-16 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2">100K+</div>
                  <p className="text-sm sm:text-base text-muted-foreground">Clients actifs</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2">€5M+</div>
                  <p className="text-sm sm:text-base text-muted-foreground">Transactions/jour</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2">99.9%</div>
                  <p className="text-sm sm:text-base text-muted-foreground">Disponibilité</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2">24/7</div>
                  <p className="text-sm sm:text-base text-muted-foreground">Support client</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                Des outils puissants pour gérer vos finances au quotidien
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="glass-card rounded-2xl p-6 text-left hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Gestion de comptes</h3>
                <p className="text-muted-foreground text-sm">
                  Consultez vos soldes et historiques de transactions en temps réel.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 text-left hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-xl [background:var(--gradient-gold)] flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Virements instantanés</h3>
                <p className="text-muted-foreground text-sm">
                  Transférez de l'argent facilement vers n'importe quel compte.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 text-left hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Sécurité maximale</h3>
                <p className="text-muted-foreground text-sm">
                  Protection avancée avec cryptage SSL 256-bit et 2FA.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 text-left hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Cartes virtuelles</h3>
                <p className="text-muted-foreground text-sm">
                  Créez des cartes virtuelles pour vos achats en ligne en toute sécurité.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 text-left hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-warning flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Accès mondial</h3>
                <p className="text-muted-foreground text-sm">
                  Gérez vos comptes depuis n'importe où dans le monde.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 text-left hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-destructive flex items-center justify-center mb-4">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Support 24/7</h3>
                <p className="text-muted-foreground text-sm">
                  Une équipe dédiée disponible à tout moment pour vous aider.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Comment ça marche ?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                Commencez en quelques étapes simples
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full [background:var(--gradient-primary)] flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-3">Recevez vos identifiants</h3>
                <p className="text-muted-foreground text-sm">
                  Votre administrateur vous envoie vos identifiants de connexion sécurisés par email.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full [background:var(--gradient-gold)] flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-3">Connectez-vous</h3>
                <p className="text-muted-foreground text-sm">
                  Utilisez vos identifiants pour accéder à votre espace client sécurisé.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3">Gérez vos finances</h3>
                <p className="text-muted-foreground text-sm">
                  Effectuez des virements, consultez vos comptes et demandez des prêts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Ce que disent nos clients
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                Des milliers de clients nous font confiance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "SecureBank a transformé ma façon de gérer mes finances. L'interface est intuitive et les virements sont instantanés !"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full [background:var(--gradient-primary)] flex items-center justify-center text-white font-semibold">
                    M
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Marie Dupont</p>
                    <p className="text-xs text-muted-foreground">Cliente depuis 2024</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "Le support client est excellent et disponible 24/7. J'ai eu une réponse en moins de 5 minutes à ma question."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full [background:var(--gradient-gold)] flex items-center justify-center text-white font-semibold">
                    P
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Pierre Martin</p>
                    <p className="text-xs text-muted-foreground">Client depuis 2023</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "Les cartes virtuelles sont parfaites pour mes achats en ligne. Je me sens en sécurité avec la double authentification."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center text-white font-semibold">
                    S
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Sophie Lambert</p>
                    <p className="text-xs text-muted-foreground">Cliente depuis 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center [background:var(--gradient-primary)]">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
                Prêt à démarrer ?
              </h2>
              <p className="text-white/80 max-w-2xl mx-auto mb-8 text-sm sm:text-base">
                Rejoignez des milliers de clients satisfaits et prenez le contrôle de vos finances dès aujourd'hui.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login">
                  <Button variant="secondary" size="xl" className="min-w-48 w-full sm:w-auto">
                    Accéder à mon compte
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-slate-900 dark:bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">SecureBank</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">
                Votre partenaire bancaire de confiance pour une gestion financière moderne et sécurisée.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Comptes courants</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Comptes épargne</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Virements</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Prêts</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Cartes virtuelles</a></li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Conditions générales</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Mentions légales</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Cookies</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4" />
                  <span>support@securebank.com</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4" />
                  <span>+33 1 23 45 67 89</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>123 Avenue des Champs-Élysées<br />75008 Paris, France</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <p>© 2026 SecureBank. Tous droits réservés.</p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Paiements sécurisés
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Certifié PCI DSS
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;