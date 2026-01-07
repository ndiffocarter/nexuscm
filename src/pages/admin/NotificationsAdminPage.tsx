import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { toast } from "@/hooks/use-toast";
import { Bell, Send, Users, User, Search, Plus, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type NotificationType = Database["public"]["Enums"]["notification_type"];

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  created_at: string;
  user_id: string;
  user?: {
    full_name: string;
    email: string;
  };
}

interface Client {
  id: string;
  full_name: string;
  email: string;
}

const notificationTypes: { value: NotificationType; label: string }[] = [
  { value: "general", label: "Général" },
  { value: "transfer_sent", label: "Virement envoyé" },
  { value: "transfer_received", label: "Virement reçu" },
  { value: "loan_approved", label: "Prêt approuvé" },
  { value: "loan_rejected", label: "Prêt refusé" },
  { value: "account_credited", label: "Compte crédité" },
  { value: "account_debited", label: "Compte débité" },
];

export default function NotificationsAdminPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // New notification form
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    notification_type: "general" as NotificationType,
    target: "all" as "all" | "single",
    user_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch clients
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "client");

    if (rolesData && rolesData.length > 0) {
      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      setClients(profilesData || []);

      // Fetch all notifications
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (notificationsData) {
        const enrichedNotifications = notificationsData.map(n => ({
          ...n,
          user: profilesData?.find(p => p.id === n.user_id),
        }));
        setNotifications(enrichedNotifications);
      }
    }

    setIsLoading(false);
  };

  const handleSendNotification = async () => {
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre et le message sont requis",
        variant: "destructive",
      });
      return;
    }

    if (newNotification.target === "single" && !newNotification.user_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const targetUserIds = newNotification.target === "all" 
        ? clients.map(c => c.id)
        : [newNotification.user_id];

      const notificationsToInsert = targetUserIds.map(userId => ({
        user_id: userId,
        title: newNotification.title,
        message: newNotification.message,
        notification_type: newNotification.notification_type,
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);

      if (error) throw error;

      toast({
        title: "Notification envoyée",
        description: `Notification envoyée à ${targetUserIds.length} client${targetUserIds.length > 1 ? "s" : ""}`,
      });

      setNewNotification({
        title: "",
        message: "",
        notification_type: "general",
        target: "all",
        user_id: "",
      });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "loan_approved":
      case "account_credited":
      case "transfer_received":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "loan_rejected":
      case "account_debited":
      case "transfer_sent":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "general":
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getNotificationBadge = (type: NotificationType) => {
    const config = notificationTypes.find(t => t.value === type);
    return <Badge variant="outline">{config?.label || type}</Badge>;
  };

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    today: notifications.filter(n => 
      new Date(n.created_at).toDateString() === new Date().toDateString()
    ).length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Notifications"
        subtitle={`${stats.total} notifications envoyées`}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unread}</p>
                <p className="text-sm text-muted-foreground">Non lues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Send className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-sm text-muted-foreground">Aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher une notification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Envoyer une notification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Destinataire</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newNotification.target === "all" ? "default" : "outline"}
                    onClick={() => setNewNotification(prev => ({ ...prev, target: "all", user_id: "" }))}
                    className="flex-1 gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Tous les clients
                  </Button>
                  <Button
                    type="button"
                    variant={newNotification.target === "single" ? "default" : "outline"}
                    onClick={() => setNewNotification(prev => ({ ...prev, target: "single" }))}
                    className="flex-1 gap-2"
                  >
                    <User className="h-4 w-4" />
                    Un client
                  </Button>
                </div>
              </div>

              {newNotification.target === "single" && (
                <div className="space-y-2">
                  <Label>Sélectionner le client</Label>
                  <Select
                    value={newNotification.user_id}
                    onValueChange={(value) => setNewNotification(prev => ({ ...prev, user_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Type de notification</Label>
                <Select
                  value={newNotification.notification_type}
                  onValueChange={(value) => setNewNotification(prev => ({ 
                    ...prev, 
                    notification_type: value as NotificationType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Titre</Label>
                <Input
                  placeholder="Titre de la notification"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Contenu de la notification..."
                  value={newNotification.message}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleSendNotification} 
                disabled={isSending}
                className="w-full gap-2"
              >
                <Send className="h-4 w-4" />
                {isSending ? "Envoi en cours..." : "Envoyer la notification"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.is_read ? "bg-card" : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-muted mt-1">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{notification.title}</span>
                          {getNotificationBadge(notification.notification_type)}
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">Non lue</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>
                            Envoyée à: {notification.user?.full_name || "Client"}
                          </span>
                          <span>•</span>
                          <span>
                            {format(new Date(notification.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
