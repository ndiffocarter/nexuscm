import { useEffect, useState } from 'react';
import { CreditCard, ArrowUpRight, ArrowDownRight, Send, FileDown, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { exportAccountStatementPDF, AccountStatement } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

interface Account {
  id: string;
  account_number: string;
  account_type: 'checking' | 'savings';
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  transaction_type: 'credit' | 'debit' | 'transfer';
  amount: number;
  description: string;
  created_at: string;
  account_id: string;
}

export default function ClientAccountsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [statementAccountId, setStatementAccountId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions(selectedAccountId);
    } else if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [selectedAccountId, accounts]);

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchTransactions(accountId: string) {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(20);
    setTransactions(data || []);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const openStatementDialog = (accountId: string) => {
    setStatementAccountId(accountId);
    setStatementDialogOpen(true);
  };

  const generateStatement = async () => {
    if (!statementAccountId) return;
    
    setIsGenerating(true);
    try {
      const account = accounts.find(a => a.id === statementAccountId);
      if (!account) throw new Error('Compte non trouvé');

      // Fetch transactions for the period
      const { data: txData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', statementAccountId)
        .gte('created_at', new Date(startDate).toISOString())
        .lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate running balance
      let runningBalance = account.balance;
      // Reverse calculate starting balance
      (txData || []).slice().reverse().forEach(tx => {
        if (tx.transaction_type === 'credit') {
          runningBalance -= Number(tx.amount);
        } else {
          runningBalance += Number(tx.amount);
        }
      });

      // Build transactions with running balance
      const statementTransactions = (txData || []).map(tx => {
        if (tx.transaction_type === 'credit') {
          runningBalance += Number(tx.amount);
        } else {
          runningBalance -= Number(tx.amount);
        }
        return {
          date: tx.created_at,
          type: tx.transaction_type === 'credit' ? 'Crédit' : 
                tx.transaction_type === 'debit' ? 'Débit' : 'Virement',
          description: tx.description || '-',
          amount: tx.transaction_type === 'credit' ? Number(tx.amount) : -Number(tx.amount),
          balance: runningBalance
        };
      });

      const statement: AccountStatement = {
        accountNumber: account.account_number,
        accountType: account.account_type === 'checking' ? 'Compte Courant' : 'Compte Épargne',
        ownerName: profile?.full_name || 'Client',
        balance: account.balance,
        transactions: statementTransactions,
        startDate,
        endDate
      };

      exportAccountStatementPDF(statement);
      
      toast({
        title: "Relevé généré",
        description: "Le relevé de compte a été téléchargé"
      });
      
      setStatementDialogOpen(false);
    } catch (error) {
      console.error('Error generating statement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le relevé",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes comptes</h1>
        <p className="text-muted-foreground">Gérez vos comptes bancaires</p>
      </div>

      {accounts.length > 0 ? (
        <>
          {/* Accounts cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((account, index) => (
              <Card 
                key={account.id}
                className={`glass-card transition-all duration-300 animate-fade-in-up ${
                  selectedAccountId === account.id ? 'ring-2 ring-primary shadow-glow' : 'hover:shadow-elevated'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`h-2 ${account.account_type === 'checking' ? '[background:var(--gradient-primary)]' : '[background:var(--gradient-gold)]'}`} />
                <CardContent className="p-6">
                  <div 
                    className="cursor-pointer"
                    onClick={() => setSelectedAccountId(account.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant={account.account_type === 'checking' ? 'default' : 'secondary'}>
                          {account.account_type === 'checking' ? 'Compte Courant' : 'Compte Épargne'}
                        </Badge>
                        <p className="font-mono text-lg mt-3">{account.account_number}</p>
                        <p className="text-3xl font-bold mt-2">{formatCurrency(account.balance)}</p>
                      </div>
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        account.account_type === 'checking' ? '[background:var(--gradient-primary)]' : '[background:var(--gradient-gold)]'
                      }`}>
                        <CreditCard className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Actif
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Ouvert le {new Date(account.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        openStatementDialog(account.id);
                      }}
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Télécharger un relevé
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Transactions */}
          <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>Historique des transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((tx, index) => (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.transaction_type === 'credit' ? 'bg-success/10' :
                          tx.transaction_type === 'debit' ? 'bg-destructive/10' : 'bg-primary/10'
                        }`}>
                          {tx.transaction_type === 'credit' ? (
                            <ArrowDownRight className="w-5 h-5 text-success" />
                          ) : tx.transaction_type === 'debit' ? (
                            <ArrowUpRight className="w-5 h-5 text-destructive" />
                          ) : (
                            <Send className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{tx.description || 'Transaction'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold text-lg ${
                        tx.transaction_type === 'credit' ? 'text-success' : 'text-destructive'
                      }`}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune transaction pour ce compte</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-16 text-center">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Aucun compte</h3>
            <p className="text-muted-foreground">
              Vous n'avez pas encore de compte bancaire. Contactez votre conseiller.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statement Dialog */}
      <Dialog open={statementDialogOpen} onOpenChange={setStatementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Générer un relevé de compte
            </DialogTitle>
            <DialogDescription>
              Sélectionnez la période pour votre relevé de compte
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Date de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              className="w-full" 
              onClick={generateStatement}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>Génération en cours...</>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Télécharger le relevé PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
