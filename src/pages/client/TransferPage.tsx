import { useEffect, useState } from 'react';
import { Send, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Account {
  id: string;
  account_number: string;
  account_type: 'checking' | 'savings';
  balance: number;
}

export default function TransferPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountNumber: '',
    amount: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, account_number, account_type, balance')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0) {
        setForm(prev => ({ ...prev, fromAccountId: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = Number(form.amount);
      const fromAccount = accounts.find(a => a.id === form.fromAccountId);

      if (!fromAccount) {
        throw new Error('Compte source non trouvé');
      }

      if (amount <= 0) {
        throw new Error('Le montant doit être supérieur à 0');
      }

      if (amount > fromAccount.balance) {
        throw new Error('Solde insuffisant');
      }

      const { error: transferError } = await supabase.functions.invoke('process-transfer', {
        body: {
          fromAccountId: form.fromAccountId,
          toAccountNumber: form.toAccountNumber,
          amount,
          description: form.description,
        },
      });

      if (transferError) {
        throw new Error(transferError.message);
      }

      setSuccess(true);
      toast({
        title: "Virement effectué",
        description: `${formatCurrency(amount)} envoyé avec succès`,
      });

      // Reset form after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setForm({ fromAccountId: accounts[0]?.id || '', toAccountNumber: '', amount: '', description: '' });
        fetchAccounts();
      }, 3000);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const selectedAccount = accounts.find(a => a.id === form.fromAccountId);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-96 animate-shimmer rounded-2xl" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="glass-card-elevated max-w-md w-full animate-scale-in">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Virement effectué !</h2>
            <p className="text-muted-foreground mb-4">
              {formatCurrency(Number(form.amount))} ont été envoyés vers {form.toAccountNumber}
            </p>
            <div className="w-full h-1 bg-success/20 rounded-full overflow-hidden">
              <div className="h-full bg-success animate-[progress_3s_linear]" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Effectuer un virement</h1>
        <p className="text-muted-foreground">Transférez de l'argent vers un autre compte</p>
      </div>

      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transfer form */}
          <Card className="glass-card animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Nouveau virement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Compte source</Label>
                  <Select
                    value={form.fromAccountId}
                    onValueChange={(value) => setForm({ ...form, fromAccountId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_type === 'checking' ? 'Courant' : 'Épargne'} - {account.account_number} ({formatCurrency(account.balance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toAccount">Numéro de compte destinataire</Label>
                  <Input
                    id="toAccount"
                    placeholder="BK1234567890"
                    value={form.toAccountNumber}
                    onChange={(e) => setForm({ ...form, toAccountNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (XAF)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    min="1"
                    max={selectedAccount?.balance}
                  />
                  {selectedAccount && (
                    <p className="text-sm text-muted-foreground">
                      Solde disponible: {formatCurrency(selectedAccount.balance)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea
                    id="description"
                    placeholder="Motif du virement..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                      Traitement en cours...
                    </div>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Effectuer le virement
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info card */}
          <div className="space-y-6">
            <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-lg">Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full [background:var(--gradient-primary)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium">Sélectionnez le compte source</p>
                    <p className="text-sm text-muted-foreground">Choisissez le compte à débiter</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full [background:var(--gradient-primary)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium">Entrez le numéro de compte</p>
                    <p className="text-sm text-muted-foreground">Le numéro commence par BK suivi de 10 chiffres</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full [background:var(--gradient-primary)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium">Indiquez le montant</p>
                    <p className="text-sm text-muted-foreground">Le virement est instantané et gratuit</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-warning/20 bg-warning/5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-4">
                <p className="text-sm">
                  <strong>⚠️ Important:</strong> Vérifiez bien le numéro de compte destinataire. Les virements sont irréversibles.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-16 text-center">
            <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Aucun compte disponible</h3>
            <p className="text-muted-foreground">
              Vous devez avoir un compte pour effectuer des virements
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
