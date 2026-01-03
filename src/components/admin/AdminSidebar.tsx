import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  ArrowLeftRight, 
  FileText, 
  LogOut,
  Building2,
  X,
  Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/admin' },
  { icon: Users, label: 'Clients', path: '/admin/clients' },
  { icon: CreditCard, label: 'Comptes', path: '/admin/accounts' },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/admin/transactions' },
  { icon: FileText, label: 'Demandes de prêt', path: '/admin/loans' },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen w-72 bg-sidebar flex flex-col z-40 transition-transform duration-300",
        !isOpen && "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo + Close button */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">SecureBank</h1>
              <p className="text-xs text-sidebar-foreground/60">Administration</p>
            </div>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggle}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onToggle()}
                className={cn(
                  'sidebar-nav-item',
                  isActive && 'active'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sidebar-accent mb-3">
            <div className="w-10 h-10 rounded-full [background:var(--gradient-gold)] flex items-center justify-center text-foreground font-bold">
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                Administrateur
              </p>
            </div>
          </div>
          
          <button
            onClick={signOut}
            className="sidebar-nav-item w-full text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// Hamburger button component
export function AdminMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="lg:hidden"
    >
      <Menu className="w-6 h-6" />
    </Button>
  );
}
