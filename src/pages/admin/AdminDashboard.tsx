import { useEffect, useState } from 'react';
import { 
  Users, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  FileText,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  totalBalance: number;
  pendingLoans: number;
  recentTransactions: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalBalance: 0,
    pendingLoans: 0,
    recentTransactions: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch clients count (role stored in user_roles)
        const { count: clientsCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client');

        // Fetch total balance
        const { data: accounts } = await supabase
          .from('accounts')
          .select('balance');
        
        const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

        // Fetch pending loans
        const { count: pendingLoans } = await supabase
          .from('loans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch recent transactions (no FK relationship is defined in DB, so we hydrate account_number manually)
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('id, created_at, transaction_type, amount, description, account_id')
          .order('created_at', { ascending: false })
          .limit(5);

        if (txError) throw txError;

        const recentTransactions = await Promise.all(
          (txData || []).map(async (tx) => {
            const { data: accountData } = await supabase
              .from('accounts')
              .select('account_number')
              .eq('id', tx.account_id)
              .maybeSingle();

            return {
              ...tx,
              account: accountData ? { account_number: accountData.account_number } : null,
            };
          })
        );

        setStats({
          totalClients: clientsCount || 0,
          totalBalance,
          pendingLoans: pendingLoans || 0,
          recentTransactions
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Tableau de bord" 
        subtitle="Vue d'ensemble de votre système bancaire" 
      />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            change="+12%"
            changeType="positive"
            icon={Users}
          />
          <StatCard
            title="Solde Total"
            value={formatCurrency(stats.totalBalance)}
            change="+8.5%"
            changeType="positive"
            icon={Wallet}
            iconColor="text-success"
          />
          <StatCard
            title="Demandes de prêt"
            value={stats.pendingLoans}
            icon={FileText}
            iconColor="text-warning"
          />
          <StatCard
            title="Croissance mensuelle"
            value="+15%"
            change="Ce mois"
            changeType="neutral"
            icon={TrendingUp}
            iconColor="text-accent"
          />
        </div>

        {/* Quick Actions & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/admin/clients/new">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Créer un nouveau client
                </Button>
              </Link>
              <Link to="/admin/accounts/new">
                <Button variant="outline" className="w-full justify-start">
                  <Wallet className="w-4 h-4 mr-2" />
                  Ouvrir un compte
                </Button>
              </Link>
              <Link to="/admin/loans">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Gérer les prêts
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Transactions récentes</CardTitle>
              <Link to="/admin/transactions">
                <Button variant="ghost" size="sm">Voir tout</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-shimmer rounded-lg" />
                  ))}
                </div>
              ) : stats.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentTransactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.transaction_type === 'credit' 
                            ? 'bg-success/10 text-success' 
                            : tx.transaction_type === 'debit'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {tx.transaction_type === 'credit' ? (
                            <ArrowDownRight className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{tx.description || 'Transaction'}</p>
                          <p className="text-sm text-muted-foreground">
                            {tx.account?.account_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          tx.transaction_type === 'credit' ? 'text-success' : 'text-destructive'
                        }`}>
                          {tx.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune transaction récente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
