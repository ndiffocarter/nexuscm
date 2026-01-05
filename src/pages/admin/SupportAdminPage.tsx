import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Clock, CheckCircle, Send, User, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  replies?: TicketReply[];
}

type ProfileLite = { id: string; full_name: string; email: string };

export default function SupportAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
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
      
      // Fetch replies
      const ticketIds = rows.map(t => t.id);
      let repliesMap: Record<string, TicketReply[]> = {};
      
      if (ticketIds.length > 0) {
        const { data: repliesData, error: repliesError } = await supabase
          .from('ticket_replies')
          .select('*')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: true });

        if (!repliesError && repliesData) {
          (repliesData as TicketReply[]).forEach((r) => {
            if (!repliesMap[r.ticket_id]) repliesMap[r.ticket_id] = [];
            repliesMap[r.ticket_id].push(r);
          });
        }
      }

      const ticketsWithReplies = rows.map(t => ({
        ...t,
        replies: repliesMap[t.id] || []
      }));
      
      setTickets(ticketsWithReplies);

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
      (profileRows || []).forEach((p: ProfileLite) => {
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

  const toggleExpanded = (ticketId: string) => {
    setExpandedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

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

  async function sendReply(ticketId: string, ticketUserId: string, ticketSubject: string) {
    if (!replyText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // 1) Insert reply
      const { error: replyError } = await supabase.from('ticket_replies').insert({
        ticket_id: ticketId,
        user_id: user.id,
        message: replyText.trim(),
        is_admin: true,
      });

      if (replyError) throw replyError;

      // 2) Send notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: ticketUserId,
        title: `Support: ${ticketSubject}`,
        message: replyText.trim(),
        notification_type: 'general',
      });

      if (notifError) console.error('Notification error:', notifError);

      // 3) Update status to in_progress
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket && ticket.status === 'open') {
        await updateStatus(ticket, 'in_progress');
      }

      toast({
        title: 'Réponse envoyée',
        description: 'Le client recevra votre message.',
      });

      setReplyingTo(null);
      setReplyText('');
      fetchTickets();
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
          <div className="space-y-4">
            {tickets.map((t) => {
              const p = profiles[t.user_id];
              const isExpanded = expandedTickets.has(t.id);
              const hasReplies = t.replies && t.replies.length > 0;
              
              return (
                <Collapsible
                  key={t.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(t.id)}
                >
                  <Card className="glass-card overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              {statusBadge(t.status)}
                              <span className="text-xs text-muted-foreground">
                                {new Date(t.created_at).toLocaleString('fr-FR')}
                              </span>
                              {hasReplies && (
                                <Badge variant="secondary" className="text-xs">
                                  {t.replies!.length} réponse{t.replies!.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base truncate">{t.subject}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-6 h-6 rounded-full [background:var(--gradient-primary)] flex items-center justify-center text-white text-xs font-bold">
                                {p?.full_name?.charAt(0) || 'U'}
                              </div>
                              <span className="text-sm text-muted-foreground">{p?.full_name || 'Client'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        {/* Status buttons */}
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(t, 'open'); }}>
                            En attente
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(t, 'in_progress'); }}>
                            En cours
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(t, 'closed'); }}>
                            Résolu
                          </Button>
                        </div>

                        {/* Original message */}
                        <div className="rounded-xl bg-muted/50 p-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Message original</p>
                          <p className="text-sm whitespace-pre-wrap">{t.message}</p>
                        </div>

                        {/* Client info */}
                        <div className="flex items-center gap-3">
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

                        {/* Replies */}
                        {hasReplies && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">Conversation</p>
                            {t.replies!.map((reply) => (
                              <div 
                                key={reply.id}
                                className={`p-3 rounded-lg ${
                                  reply.is_admin 
                                    ? 'bg-primary/10 border border-primary/20 ml-4' 
                                    : 'bg-background mr-4 border border-border'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {reply.is_admin ? '🛡️ Support' : '👤 Client'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(reply.created_at).toLocaleString('fr-FR')}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply form */}
                        {replyingTo === t.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Votre réponse au client..."
                              rows={4}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                                disabled={isSubmitting}
                              >
                                Annuler
                              </Button>
                              <Button
                                variant="gradient"
                                size="sm"
                                onClick={() => sendReply(t.id, t.user_id, t.subject)}
                                disabled={isSubmitting || !replyText.trim()}
                              >
                                {isSubmitting ? 'Envoi...' : 'Envoyer'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="gradient" onClick={() => setReplyingTo(t.id)}>
                            <Send className="w-4 h-4 mr-2" />
                            Répondre
                          </Button>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
