import { useEffect, useState } from 'react';
import { 
  Users, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  FileText,
  Clock,
  Download,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardStats {
  totalClients: number;
  totalBalance: number;
  pendingLoans: number;
  recentTransactions: any[];
  transactionsByDay: { date: string; credits: number; debits: number; transfers: number }[];
  clientsByMonth: { month: string; count: number }[];
  transactionsByType: { name: string; value: number }[];
  monthlyRevenue: number;
  growth: number;
}

const COLORS = ['hsl(150, 70%, 40%)', 'hsl(0, 75%, 55%)', 'hsl(215, 80%, 45%)'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalBalance: 0,
    pendingLoans: 0,
    recentTransactions: [],
    transactionsByDay: [],
    clientsByMonth: [],
    transactionsByType: [],
    monthlyRevenue: 0,
    growth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchStats();
  }, [period]);

  async function fetchStats() {
    try {
      setIsLoading(true);
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch clients count
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

      // Fetch transactions for charts
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Process transactions by day
      const txByDay: Record<string, { credits: number; debits: number; transfers: number }> = {};
      (allTransactions || []).forEach(tx => {
        const date = new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        if (!txByDay[date]) {
          txByDay[date] = { credits: 0, debits: 0, transfers: 0 };
        }
        if (tx.transaction_type === 'credit') {
          txByDay[date].credits += Number(tx.amount);
        } else if (tx.transaction_type === 'debit') {
          txByDay[date].debits += Number(tx.amount);
        } else if (tx.transaction_type === 'transfer') {
          txByDay[date].transfers += Number(tx.amount);
        }
      });

      const transactionsByDay = Object.entries(txByDay).map(([date, data]) => ({
        date,
        ...data
      }));

      // Transactions by type for pie chart
      const txByType = { credit: 0, debit: 0, transfer: 0 };
      (allTransactions || []).forEach(tx => {
        if (tx.transaction_type in txByType) {
          txByType[tx.transaction_type as keyof typeof txByType]++;
        }
      });

      const transactionsByType = [
        { name: 'Crédits', value: txByType.credit },
        { name: 'Débits', value: txByType.debit },
        { name: 'Virements', value: txByType.transfer }
      ].filter(t => t.value > 0);

      // Clients by month (last 6 months)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('role', 'client')
        .order('created_at', { ascending: true });

      const clientsByMonth: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        clientsByMonth[key] = 0;
      }

      (profiles || []).forEach(p => {
        const d = new Date(p.created_at);
        const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        if (key in clientsByMonth) {
          clientsByMonth[key]++;
        }
      });

      const clientsByMonthArray = Object.entries(clientsByMonth).map(([month, count]) => ({
        month,
        count
      }));

      // Calculate monthly revenue (sum of credits)
      const monthlyRevenue = (allTransactions || [])
        .filter(tx => tx.transaction_type === 'credit')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      // Fetch recent transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('id, created_at, transaction_type, amount, description, account_id')
        .order('created_at', { ascending: false })
        .limit(5);

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

      // Calculate growth
      const previousPeriodStart = new Date(startDate);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - daysAgo);
      
      const { data: previousTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', startDate.toISOString());

      const currentTotal = (allTransactions || []).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const previousTotal = (previousTransactions || []).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

      setStats({
        totalClients: clientsCount || 0,
        totalBalance,
        pendingLoans: pendingLoans || 0,
        recentTransactions,
        transactionsByDay,
        clientsByMonth: clientsByMonthArray,
        transactionsByType,
        monthlyRevenue,
        growth
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + 'K';
    }
    return amount.toString();
  };

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Tableau de bord" 
        subtitle="Vue d'ensemble de votre système bancaire"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">3 derniers mois</SelectItem>
              <SelectItem value="365">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminHeader>
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            change={`+${stats.clientsByMonth[stats.clientsByMonth.length - 1]?.count || 0} ce mois`}
            changeType="positive"
            icon={Users}
          />
          <StatCard
            title="Solde Total"
            value={formatCurrency(stats.totalBalance)}
            change={stats.growth >= 0 ? `+${stats.growth.toFixed(1)}%` : `${stats.growth.toFixed(1)}%`}
            changeType={stats.growth >= 0 ? "positive" : "negative"}
            icon={Wallet}
            iconColor="text-success"
          />
          <StatCard
            title="Revenus période"
            value={formatCurrency(stats.monthlyRevenue)}
            icon={TrendingUp}
            iconColor="text-accent"
          />
          <StatCard
            title="Demandes de prêt"
            value={stats.pendingLoans}
            icon={FileText}
            iconColor="text-warning"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transactions Chart */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Évolution des transactions</CardTitle>
              <Link to="/admin/transactions">
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] animate-shimmer rounded-lg" />
              ) : stats.transactionsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.transactionsByDay}>
                    <defs>
                      <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(150, 70%, 40%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(150, 70%, 40%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDebits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 75%, 55%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(0, 75%, 55%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTransfers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(215, 80%, 45%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(215, 80%, 45%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis tickFormatter={formatCompact} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area type="monotone" dataKey="credits" name="Crédits" stroke="hsl(150, 70%, 40%)" fillOpacity={1} fill="url(#colorCredits)" />
                    <Area type="monotone" dataKey="debits" name="Débits" stroke="hsl(0, 75%, 55%)" fillOpacity={1} fill="url(#colorDebits)" />
                    <Area type="monotone" dataKey="transfers" name="Virements" stroke="hsl(215, 80%, 45%)" fillOpacity={1} fill="url(#colorTransfers)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée pour cette période
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Clients Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Nouveaux clients par mois</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] animate-shimmer rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.clientsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" name="Nouveaux clients" fill="hsl(215, 80%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaction Types Pie */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Répartition des transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] animate-shimmer rounded-lg" />
              ) : stats.transactionsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.transactionsByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.transactionsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée
                </div>
              )}
              <div className="flex justify-center gap-4 mt-4">
                {stats.transactionsByType.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
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
