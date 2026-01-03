import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar, AdminMenuButton } from '@/components/admin/AdminSidebar';
import { FullPageLoader } from '@/components/LoadingSpinner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const { user, isLoading, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-b border-border z-20 px-4 flex items-center justify-between">
        <AdminMenuButton onClick={() => setSidebarOpen(true)} />
        <span className="font-semibold">SecureBank Admin</span>
        <ThemeToggle />
      </header>
      
      <main className={cn(
        "min-h-screen transition-all duration-300",
        "pt-16 lg:pt-0", // Account for mobile header
        "lg:ml-72" // Sidebar width on desktop
      )}>
        <Outlet />
      </main>
    </div>
  );
}
