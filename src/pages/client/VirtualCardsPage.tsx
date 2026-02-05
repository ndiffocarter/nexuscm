import { useEffect, useState } from 'react';
import { CreditCard, Plus, Eye, EyeOff, Snowflake, Power, Settings, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

interface VirtualCard {
  id: string;
  card_number: string;
  cvv: string;
  expiry_date: string;
  card_holder_name: string;
  spending_limit: number;
  current_spending: number;
  is_active: boolean;
  is_frozen: boolean;
  created_at: string;
  account_id: string;
  user_id: string;
  account?: { account_number: string; balance: number };
}

interface Account {
  id: string;
  account_number: string;
  balance: number;
  account_type: string;
}

export default function VirtualCardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCvv, setShowCvv] = useState<Record<string, boolean>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [newCard, setNewCard] = useState({
    account_id: '',
    spending_limit: '500000'
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCards();
      fetchAccounts();
    }
  }, [user]);

  async function fetchCards() {
    try {
      const { data, error } = await supabase
        .from('virtual_cards' as any)
        .select('*')
        .eq('user_id', user?.id as string)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const cardsData = (data || []) as unknown as VirtualCard[];

      const cardsWithAccounts = await Promise.all(
        cardsData.map(async (card) => {
          const { data: accountData } = await supabase
            .from('accounts')
            .select('account_number, balance')
            .eq('id', card.account_id)
            .single();
          return { ...card, account: accountData } as VirtualCard;
        })
      );

      setCards(cardsWithAccounts);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAccounts() {
    const { data } = await supabase
      .from('accounts')
      .select('id, account_number, balance, account_type')
      .eq('user_id', user?.id as string)
      .eq('is_active', true);
    setAccounts((data || []) as Account[]);
  }

  function generateCardNumber(): string {
    const prefix = '4';
    let number = prefix;
    for (let i = 0; i < 15; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  }

  function generateCvv(): string {
    return String(Math.floor(100 + Math.random() * 900));
  }

  function generateExpiryDate(): string {
    const now = new Date();
    const year = now.getFullYear() + 3;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${month}/${String(year).slice(-2)}`;
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setIsCreating(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('virtual_cards' as any)
        .insert({
          user_id: user.id,
          account_id: newCard.account_id,
          card_number: generateCardNumber(),
          cvv: generateCvv(),
          expiry_date: generateExpiryDate(),
          card_holder_name: profile?.full_name?.toUpperCase() || 'TITULAIRE',
          spending_limit: parseFloat(newCard.spending_limit),
        });

      if (error) throw error;

      toast({ title: "Carte créée", description: "Votre nouvelle carte virtuelle est prête" });
      setIsCreateDialogOpen(false);
      setNewCard({ account_id: '', spending_limit: '500000' });
      fetchCards();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleCardStatus(card: VirtualCard, action: 'freeze' | 'activate' | 'deactivate') {
    try {
      const updates: Record<string, boolean> = {};
      if (action === 'freeze') updates.is_frozen = !card.is_frozen;
      else if (action === 'activate') { updates.is_active = true; updates.is_frozen = false; }
      else updates.is_active = false;

      const { error } = await supabase
        .from('virtual_cards' as any)
        .update(updates)
        .eq('id', card.id);
      
      if (error) throw error;
      toast({ 
        title: action === 'freeze' 
          ? (card.is_frozen ? "Carte dégelée" : "Carte gelée") 
          : action === 'activate' 
            ? "Carte activée" 
            : "Carte désactivée" 
      });
      fetchCards();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }

  async function updateSpendingLimit() {
    if (!selectedCard || !newLimit) return;
    try {
      const { error } = await supabase
        .from('virtual_cards' as any)
        .update({ spending_limit: parseFloat(newLimit) })
        .eq('id', selectedCard.id);
      
      if (error) throw error;
      toast({ title: "Limite mise à jour", description: `Nouvelle limite: ${formatCurrency(parseFloat(newLimit))}` });
      setIsLimitDialogOpen(false);
      setNewLimit('');
      setSelectedCard(null);
      fetchCards();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  const formatCardNumber = (number: string) => number.replace(/(.{4})/g, '$1 ').trim();
  const maskCardNumber = (number: string) => '•••• •••• •••• ' + number.slice(-4);

  if (isLoading) {
    return <div className="p-6 space-y-4">{[1, 2].map((i) => <div key={i} className="h-48 animate-shimmer rounded-2xl" />)}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartes Virtuelles</h1>
          <p className="text-muted-foreground">Gérez vos cartes bancaires virtuelles</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient"><Plus className="w-4 h-4 mr-2" />Nouvelle carte</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une carte virtuelle</DialogTitle>
              <DialogDescription>Créez une nouvelle carte virtuelle liée à l'un de vos comptes</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div className="space-y-2">
                <Label>Compte associé</Label>
                <Select value={newCard.account_id} onValueChange={(value) => setNewCard(prev => ({ ...prev, account_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez un compte" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_number} - {formatCurrency(acc.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Limite de dépenses mensuelle</Label>
                <Input 
                  type="number" 
                  value={newCard.spending_limit} 
                  onChange={(e) => setNewCard(prev => ({ ...prev, spending_limit: e.target.value }))} 
                  min="10000" 
                  step="10000" 
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={!newCard.account_id || isCreating}>
                  {isCreating ? 'Création...' : 'Créer la carte'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cards.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((card, index) => {
            const spendingPercent = (card.current_spending / card.spending_limit) * 100;
            const isOverLimit = spendingPercent >= 90;
            return (
              <Card 
                key={card.id} 
                className={`glass-card overflow-hidden animate-fade-in-up ${!card.is_active ? 'opacity-60' : card.is_frozen ? 'ring-2 ring-blue-400' : ''}`} 
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative h-48 [background:var(--gradient-primary)] p-6 text-white overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-10 w-32 h-32 rounded-full border-2 border-white/30" />
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    {!card.is_active && <Badge variant="destructive">Désactivée</Badge>}
                    {card.is_frozen && card.is_active && <Badge className="bg-blue-500">Gelée</Badge>}
                  </div>
                  <div className="w-12 h-10 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-md mb-4" />
                  <div className="font-mono text-xl tracking-wider mb-4">
                    {showCvv[card.id] ? formatCardNumber(card.card_number) : maskCardNumber(card.card_number)}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-white/70 mb-1">TITULAIRE</p>
                      <p className="font-medium">{card.card_holder_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/70 mb-1">EXPIRE</p>
                      <p className="font-mono">{card.expiry_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/70 mb-1">CVV</p>
                      <p className="font-mono">{showCvv[card.id] ? card.cvv : '•••'}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Dépenses du mois</span>
                      <span className={isOverLimit ? 'text-destructive font-medium' : ''}>
                        {formatCurrency(card.current_spending)} / {formatCurrency(card.spending_limit)}
                      </span>
                    </div>
                    <Progress value={Math.min(spendingPercent, 100)} className={isOverLimit ? '[&>div]:bg-destructive' : ''} />
                    {isOverLimit && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" />Limite bientôt atteinte
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Compte lié</span>
                    <span className="font-mono">{card.account?.account_number}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => setShowCvv(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                    >
                      {showCvv[card.id] ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                      {showCvv[card.id] ? 'Masquer' : 'Afficher'}
                    </Button>
                    {card.is_active && (
                      <Button variant="outline" size="sm" onClick={() => toggleCardStatus(card, 'freeze')}>
                        <Snowflake className={`w-4 h-4 ${card.is_frozen ? 'text-blue-500' : ''}`} />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { 
                        setSelectedCard(card); 
                        setNewLimit(String(card.spending_limit)); 
                        setIsLimitDialogOpen(true); 
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant={card.is_active ? "destructive" : "default"} 
                      size="sm" 
                      onClick={() => toggleCardStatus(card, card.is_active ? 'deactivate' : 'activate')}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-16 text-center">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Aucune carte virtuelle</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre première carte virtuelle pour effectuer des paiements en ligne
            </p>
            <Button variant="gradient" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Créer une carte
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la limite</DialogTitle>
            <DialogDescription>Définissez une nouvelle limite de dépenses mensuelle</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouvelle limite (€)</Label>
              <Input 
                type="number" 
                value={newLimit} 
                onChange={(e) => setNewLimit(e.target.value)} 
                min="10000" 
                step="10000" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLimitDialogOpen(false)}>Annuler</Button>
            <Button onClick={updateSpendingLimit}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
