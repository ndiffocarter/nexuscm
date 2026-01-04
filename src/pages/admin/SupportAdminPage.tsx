import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Clock, CheckCircle, Send, User, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

type ProfileLite = { id: string; full_name: string; email: string };

export default function SupportAdminPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, user_id, subject, message, status, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      const rows = (data || []) as Ticket[];
      setTickets(rows);

      const userIds = Array.from(new Set(rows.map(t => t.user_id)));
      if (userIds.length === 0) {
        setProfiles({});
        return;
      }

      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const map: Record<string, ProfileLite> = {};
      (profileRows || []).forEach((p: any) => {
        map[p.id] = p;
      });
      setProfiles(map);
    } catch (e: any) {
      console.error('Error fetching support tickets:', e);
      toast({
        title: 'Erreur',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const closed = tickets.filter(t => t.status === 'closed').length;
    return { open, inProgress, closed };
  }, [tickets]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <MessageSquare className="w-3 h-3 mr-1" />
            En cours
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Résolu
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            {status}
          </Badge>
        );
    }
  };

  async function updateStatus(ticket: Ticket, status: string) {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticket.id);

      if (error) throw error;

      setTickets(prev => prev.map(t => (t.id === ticket.id ? { ...t, status } : t)));
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e.message,
        variant: 'destructive',
      });
    }
  }

  function openReply(ticket: Ticket) {
    setActiveTicket(ticket);
    setReplyText('');
    setReplyOpen(true);
  }

  async function sendReply() {
    if (!activeTicket) return;
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      // 1) Envoi d'une réponse au client sous forme de notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: activeTicket.user_id,
        title: `Support: ${activeTicket.subject}`,
        message: replyText.trim(),
        notification_type: 'general',
      });

      if (notifError) throw notifError;

      // 2) Marquer le ticket comme “in_progress” si besoin
      if (activeTicket.status === 'open') {
        await updateStatus(activeTicket, 'in_progress');
      }

      toast({
        title: 'Réponse envoyée',
        description: 'Le client recevra votre message dans ses notifications.',
      });

      setReplyOpen(false);
      setActiveTicket(null);
      setReplyText('');
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader
        title="Support"
        subtitle={`${tickets.length} tickets • ${stats.open} en attente • ${stats.inProgress} en cours • ${stats.closed} résolus`}
      />

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-shimmer rounded-2xl" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">Aucun ticket</h2>
              <p className="text-muted-foreground">Les demandes des clients apparaîtront ici.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {tickets.map((t) => {
              const p = profiles[t.user_id];
              return (
                <Card key={t.id} className="glass-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {statusBadge(t.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <CardTitle className="text-base truncate">{t.subject}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateStatus(t, 'open')}>
                          Open
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(t, 'in_progress')}>
                          En cours
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(t, 'closed')}>
                          Résolu
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.message}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full [background:var(--gradient-primary)] flex items-center justify-center text-white font-bold">
                          {p?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {p?.full_name || 'Client'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {p?.email || t.user_id}
                          </p>
                        </div>
                      </div>

                      <Button variant="gradient" onClick={() => openReply(t)} className="sm:self-end">
                        <Send className="w-4 h-4 mr-2" />
                        Répondre
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Répondre au ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-sm text-muted-foreground">{activeTicket?.subject}</p>
            </div>

            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Votre réponse au client…"
              rows={6}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyOpen(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button variant="gradient" onClick={sendReply} disabled={isSubmitting || !replyText.trim()}>
                {isSubmitting ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
