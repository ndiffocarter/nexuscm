import { useEffect, useState } from 'react';
import { CreditCard, ArrowUpRight, ArrowDownRight, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
                className={`glass-card cursor-pointer transition-all duration-300 animate-fade-in-up ${
                  selectedAccountId === account.id ? 'ring-2 ring-primary shadow-glow' : 'hover:shadow-elevated'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setSelectedAccountId(account.id)}
              >
                <div className={`h-2 ${account.account_type === 'checking' ? '[background:var(--gradient-primary)]' : '[background:var(--gradient-gold)]'}`} />
                <CardContent className="p-6">
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
    </div>
  );
}
