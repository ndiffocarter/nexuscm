import { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight, Send, FileText, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AnalyticsDashboard from '@/components/client/AnalyticsDashboard';
import BudgetManager from '@/components/client/BudgetManager';
import MonthlyStatementGenerator from '@/components/client/MonthlyStatementGenerator';

interface Account {
  id: string;
  account_number: string;
  account_type: 'checking' | 'savings';
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  transaction_type: 'credit' | 'debit' | 'transfer';
  amount: number;
  description: string;
  created_at: string;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    try {
      const [profileRes, accountsRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user?.id).single(),
        supabase.from('accounts').select('*').eq('user_id', user?.id)
      ]);

      setProfile(profileRes.data);
      setAccounts(accountsRes.data || []);

      if (accountsRes.data && accountsRes.data.length > 0) {
        const accountIds = accountsRes.data.map(a => a.id);
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .in('account_id', accountIds)
          .order('created_at', { ascending: false })
          .limit(5);
        setTransactions(txData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-32 animate-shimmer rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 animate-shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome section */}
      <div className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold">
          {getGreeting()}, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue dans votre espace client SecureBank
        </p>
      </div>

      {/* Total balance card */}
      <Card className="glass-card-elevated overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 [background:var(--gradient-primary)] opacity-10" />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                Solde total
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setShowBalance(!showBalance)}
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </p>
              <p className="text-4xl md:text-5xl font-bold mt-2">
                {showBalance ? formatCurrency(totalBalance) : '••••••••'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="bg-success/10 text-success">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {accounts.length} compte(s) actif(s)
                </Badge>
              </div>
            </div>
            <div className="hidden md:block w-24 h-24 rounded-2xl [background:var(--gradient-primary)] flex items-center justify-center opacity-20">
              <CreditCard className="w-12 h-12 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <Link to="/dashboard/transfer">
          <Card className="glass-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
            <CardContent className="p-4 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Send className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-sm">Virement</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/loans">
          <Card className="glass-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
            <CardContent className="p-4 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl [background:var(--gradient-gold)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-sm">Prêt</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/accounts">
          <Card className="glass-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
            <CardContent className="p-4 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">Comptes</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/support">
          <Card className="glass-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
            <CardContent className="p-4 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium text-sm">Support</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Accounts and transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Mes comptes</CardTitle>
            <Link to="/dashboard/accounts">
              <Button variant="ghost" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length > 0 ? accounts.map((account) => (
              <div 
                key={account.id}
                className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${account.account_type === 'checking' ? '[background:var(--gradient-primary)]' : '[background:var(--gradient-gold)]'}`}>
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {account.account_type === 'checking' ? 'Compte Courant' : 'Compte Épargne'}
                      </p>
                      <p className="text-sm text-muted-foreground">{account.account_number}</p>
                    </div>
                  </div>
                  <p className="font-bold text-lg">
                    {showBalance ? formatCurrency(account.balance) : '••••'}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun compte pour le moment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Transactions récentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length > 0 ? transactions.map((tx) => (
              <div 
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
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
                    <p className="font-medium text-sm">{tx.description || 'Transaction'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  tx.transaction_type === 'credit' ? 'text-success' : 'text-destructive'
                }`}>
                  {tx.transaction_type === 'credit' ? '+' : '-'}
                  {showBalance ? formatCurrency(tx.amount) : '••••'}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowUpRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune transaction récente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Dashboard */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <AnalyticsDashboard />
      </div>

      {/* Budget Manager & Monthly Statements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <BudgetManager />
        <MonthlyStatementGenerator accounts={accounts} />
      </div>
    </div>
  );
}
