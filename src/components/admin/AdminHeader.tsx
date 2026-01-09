import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  user_id: string;
  user_name?: string;
}

export function AdminHeader({ title, subtitle, children }: AdminHeaderProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchRecentNotifications();
  }, []);

  async function fetchRecentNotifications() {
    try {
      // Fetch recent notifications (last 10 unread from all clients)
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get user profiles for notifications
      const userIds = [...new Set((notificationsData || []).map(n => n.user_id))];
      
      let profiles: { id: string; full_name: string }[] = [];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        profiles = profilesData || [];
      }

      const enrichedNotifications = (notificationsData || []).map(n => ({
        ...n,
        user_name: profiles.find(p => p.id === n.user_id)?.full_name || 'Client',
      }));

      setNotifications(enrichedNotifications);
      
      // Count unread notifications
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 md:px-6 py-4">
      <div className="flex flex-col gap-4">
        {/* Top row: title and actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground hidden sm:block">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="w-64 pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary">{unreadCount} non lues</Badge>
                  )}
                </div>
                
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Aucune notification récente
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex flex-col items-start gap-1 p-4 cursor-pointer ${
                          !notification.is_read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="font-medium text-sm flex-1 truncate">
                            {notification.title}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between w-full mt-1">
                          <span className="text-xs text-muted-foreground">
                            {notification.user_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'dd MMM HH:mm', { locale: fr })}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </ScrollArea>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center text-primary font-medium py-3 cursor-pointer"
                  onClick={() => navigate('/admin/notifications')}
                >
                  Voir toutes les notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <ThemeToggle />
          </div>
        </div>
        
        {/* Children row (e.g., period selector) - shown below on mobile */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
