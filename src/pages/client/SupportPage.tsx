import { useEffect, useState } from 'react';
import { HelpCircle, Send, MessageSquare, Clock, CheckCircle, Phone, Mail, MapPin, ChevronDown, ChevronUp, Reply } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  subject: string;
  message: string;
  status: string;
  created_at: string;
  replies?: TicketReply[];
}

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    message: ''
  });
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  async function fetchTickets() {
    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch replies for all tickets
      const ticketIds = (ticketsData || []).map(t => t.id);
      
      if (ticketIds.length > 0) {
        const { data: repliesData, error: repliesError } = await supabase
          .from('ticket_replies')
          .select('*')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        const ticketsWithReplies = (ticketsData || []).map(ticket => ({
          ...ticket,
          replies: (repliesData || []).filter(r => r.ticket_id === ticket.id)
        }));

        setTickets(ticketsWithReplies);
      } else {
        setTickets(ticketsData || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id,
        subject: form.subject,
        message: form.message,
        status: 'open'
      });

      if (error) throw error;

      toast({
        title: "Ticket créé",
        description: "Notre équipe vous répondra dans les plus brefs délais",
      });

      setForm({ subject: '', message: '' });
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReply(ticketId: string) {
    if (!replyText.trim()) return;
    setIsReplying(true);

    try {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message: replyText.trim(),
        is_admin: false
      });

      if (error) throw error;

      // Update ticket status to open if it was closed
      await supabase
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', ticketId);

      toast({
        title: "Réponse envoyée",
        description: "Votre message a été envoyé au support",
      });

      setReplyText('');
      setReplyingTo(null);
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReplying(false);
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

  const getStatusBadge = (status: string) => {
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
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-64 animate-shimmer rounded-2xl" />
        <div className="h-48 animate-shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support client</h1>
        <p className="text-muted-foreground">Besoin d'aide ? Nous sommes là pour vous</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact form */}
        <div className="lg:col-span-2">
          <Card className="glass-card animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Nouveau ticket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet</Label>
                  <Input
                    id="subject"
                    placeholder="Résumez votre demande..."
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Décrivez votre problème ou question en détail..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                    rows={6}
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="gradient" 
                  size="xl"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi en cours...
                    </div>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Envoyer le ticket
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Contact info */}
        <div className="space-y-6">
          <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="text-lg">Nous contacter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full [background:var(--gradient-primary)] flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">+237 6XX XXX XXX</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full [background:var(--gradient-primary)] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">support@securebank.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full [background:var(--gradient-primary)] flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">Douala, Cameroun</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20 bg-primary/5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Horaires d'ouverture</p>
                  <p className="text-sm text-muted-foreground">
                    Lun-Ven: 8h00 - 18h00<br />
                    Sam: 9h00 - 14h00
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Existing tickets */}
      {tickets.length > 0 && (
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle>Mes tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const isExpanded = expandedTickets.has(ticket.id);
                const hasReplies = ticket.replies && ticket.replies.length > 0;
                
                return (
                  <Collapsible 
                    key={ticket.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(ticket.id)}
                  >
                    <div className="rounded-xl bg-muted/50 overflow-hidden">
                      <CollapsibleTrigger className="w-full p-4 hover:bg-muted transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusBadge(ticket.status)}
                              <span className="text-sm text-muted-foreground">
                                {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                              </span>
                              {hasReplies && (
                                <Badge variant="secondary" className="text-xs">
                                  {ticket.replies!.length} réponse{ticket.replies!.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.message}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4">
                          {/* Original message */}
                          <div className="border-t border-border pt-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Message original</p>
                            <div className="p-3 rounded-lg bg-background">
                              <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                            </div>
                          </div>

                          {/* Replies */}
                          {hasReplies && (
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-muted-foreground">Conversation</p>
                              {ticket.replies!.map((reply) => (
                                <div 
                                  key={reply.id}
                                  className={`p-3 rounded-lg ${
                                    reply.is_admin 
                                      ? 'bg-primary/10 border border-primary/20 ml-4' 
                                      : 'bg-background mr-4'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium">
                                      {reply.is_admin ? '🛡️ Support' : '👤 Vous'}
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
                          {replyingTo === ticket.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Votre réponse..."
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText('');
                                  }}
                                  disabled={isReplying}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  variant="gradient"
                                  size="sm"
                                  onClick={() => handleReply(ticket.id)}
                                  disabled={isReplying || !replyText.trim()}
                                >
                                  {isReplying ? 'Envoi...' : 'Envoyer'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReplyingTo(ticket.id)}
                            >
                              <Reply className="w-4 h-4 mr-2" />
                              Répondre
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
