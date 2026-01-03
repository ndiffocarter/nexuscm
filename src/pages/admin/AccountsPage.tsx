import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, CreditCard, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Account {
  id: string;
  account_number: string;
  account_type: 'checking' | 'savings';
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string; email: string };
}

interface Client {
  id: string;
  full_name: string;
  email: string;
}

export default function AccountsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isNewRoute = location.pathname === '/admin/accounts/new';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [newAccount, setNewAccount] = useState({
    user_id: '',
    account_type: 'checking' as 'checking' | 'savings',
    initial_balance: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
    fetchClients();
  }, []);

  useEffect(() => {
    if (isNewRoute) {
      setIsCreateDialogOpen(true);
    }
  }, [isNewRoute]);

  async function fetchAccounts() {
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch profiles for each account
      const accountsWithProfiles = await Promise.all(
        (accountsData || []).map(async (account) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', account.user_id)
            .single();
          
          return {
            ...account,
            profiles: profileData || { full_name: 'N/A', email: '' }
          };
        })
      );

      setAccounts(accountsWithProfiles);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchClients() {
    const { data: roleRows, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'client');

    if (roleError) {
      setClients([]);
      return;
    }

    const clientIds = (roleRows || []).map(r => r.user_id);
    if (clientIds.length === 0) {
      setClients([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', clientIds)
      .order('full_name', { ascending: true });

    setClients(data || []);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      // Generate account number
      const accountNumber = 'BK' + Math.random().toString().slice(2, 12);
      
      const { error } = await supabase
        .from('accounts')
        .insert({
          user_id: newAccount.user_id,
          account_number: accountNumber,
          account_type: newAccount.account_type,
          balance: Number(newAccount.initial_balance) || 0
        });

      if (error) throw error;

      toast({
        title: "Compte créé avec succès",
        description: `Numéro de compte: ${accountNumber}`,
      });

      setIsCreateDialogOpen(false);
      setNewAccount({ user_id: '', account_type: 'checking', initial_balance: '' });
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;

    try {
      const amount = Number(transactionAmount);
      const newBalance = transactionType === 'credit' 
        ? Number(selectedAccount.balance) + amount 
        : Number(selectedAccount.balance) - amount;

      if (newBalance < 0) {
        throw new Error('Solde insuffisant');
      }

      // Update account balance
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', selectedAccount.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          account_id: selectedAccount.id,
          transaction_type: transactionType,
          amount: amount,
          description: transactionDescription || (transactionType === 'credit' ? 'Crédit' : 'Débit')
        });

      if (txError) throw txError;

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedAccount.user_id,
          title: transactionType === 'credit' ? 'Crédit reçu' : 'Débit effectué',
          message: `${transactionType === 'credit' ? 'Votre compte a été crédité de' : 'Un débit de'} ${formatCurrency(amount)} a été effectué sur votre compte ${selectedAccount.account_number}`,
          notification_type: transactionType === 'credit' ? 'account_credited' : 'account_debited'
        });

      toast({
        title: "Transaction effectuée",
        description: `${transactionType === 'credit' ? 'Crédit' : 'Débit'} de ${formatCurrency(amount)}`,
      });

      setIsTransactionDialogOpen(false);
      setTransactionAmount('');
      setTransactionDescription('');
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.account_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Gestion des comptes" 
        subtitle={`${accounts.length} comptes bancaires`}
      />
      
      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro de compte ou nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open && isNewRoute) {
                navigate('/admin/accounts', { replace: true });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau compte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau compte</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAccount} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={newAccount.user_id}
                    onValueChange={(value) => setNewAccount({ ...newAccount, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type de compte</Label>
                  <Select
                    value={newAccount.account_type}
                    onValueChange={(value: 'checking' | 'savings') => 
                      setNewAccount({ ...newAccount, account_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Compte courant</SelectItem>
                      <SelectItem value="savings">Compte épargne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Solde initial (XAF)</Label>
                  <Input
                    type="number"
                    value={newAccount.initial_balance}
                    onChange={(e) => setNewAccount({ ...newAccount, initial_balance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <Button type="submit" variant="gradient" className="w-full">
                  Créer le compte
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Accounts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-shimmer rounded-2xl" />
            ))}
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map((account, index) => (
              <Card 
                key={account.id}
                className="glass-card overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={`h-2 ${account.account_type === 'checking' ? '[background:var(--gradient-primary)]' : '[background:var(--gradient-gold)]'}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={account.account_type === 'checking' ? 'default' : 'secondary'}>
                      {account.account_type === 'checking' ? 'Compte Courant' : 'Compte Épargne'}
                    </Badge>
                    <Badge variant={account.is_active ? 'outline' : 'destructive'}>
                      {account.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{account.account_number}</CardTitle>
                  <p className="text-sm text-muted-foreground">{account.profiles?.full_name}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Solde disponible</p>
                    <p className="text-3xl font-bold">{formatCurrency(account.balance)}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedAccount(account);
                        setTransactionType('credit');
                        setIsTransactionDialogOpen(true);
                      }}
                    >
                      <ArrowDownRight className="w-4 h-4 mr-1 text-success" />
                      Créditer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedAccount(account);
                        setTransactionType('debit');
                        setIsTransactionDialogOpen(true);
                      }}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1 text-destructive" />
                      Débiter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Aucun compte trouvé</h3>
            <p className="text-muted-foreground">Créez un nouveau compte pour commencer</p>
          </div>
        )}

        {/* Transaction Dialog */}
        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {transactionType === 'credit' ? 'Créditer le compte' : 'Débiter le compte'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTransaction} className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-muted">
                <p className="text-sm text-muted-foreground">Compte</p>
                <p className="font-semibold">{selectedAccount?.account_number}</p>
                <p className="text-sm">{selectedAccount?.profiles?.full_name}</p>
              </div>
              <div className="space-y-2">
                <Label>Montant (XAF)</Label>
                <Input
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="0"
                  required
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  placeholder="Description de la transaction"
                />
              </div>
              <Button 
                type="submit" 
                variant={transactionType === 'credit' ? 'default' : 'destructive'} 
                className="w-full"
              >
                {transactionType === 'credit' ? 'Créditer' : 'Débiter'} {transactionAmount && formatCurrency(Number(transactionAmount))}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
