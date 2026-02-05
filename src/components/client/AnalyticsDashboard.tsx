import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, PieChart } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts';

interface Transaction {
  id: string;
  transaction_type: 'credit' | 'debit' | 'transfer';
  amount: number;
  description: string | null;
  created_at: string;
  account_id: string;
}

interface BalanceHistory {
  date: string;
  balance: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(215, 80%, 45%)', 'hsl(150, 70%, 40%)', 'hsl(45, 90%, 50%)', 'hsl(0, 75%, 55%)', 'hsl(280, 60%, 55%)', 'hsl(180, 60%, 45%)'];

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentation': 'hsl(150, 70%, 40%)',
  'Transport': 'hsl(215, 80%, 45%)',
  'Shopping': 'hsl(280, 60%, 55%)',
  'Factures': 'hsl(0, 75%, 55%)',
  'Loisirs': 'hsl(45, 90%, 50%)',
  'Transferts': 'hsl(180, 60%, 45%)',
  'Autres': 'hsl(220, 15%, 60%)'
};

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('30');
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseCategory[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netChange: 0,
    transactionCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, period]);

  const categorizeTransaction = (description: string | null): string => {
    if (!description) return 'Autres';
    const desc = description.toLowerCase();
    
    if (desc.includes('alimentation') || desc.includes('restaurant') || desc.includes('supermarché') || desc.includes('nourriture')) {
      return 'Alimentation';
    }
    if (desc.includes('transport') || desc.includes('taxi') || desc.includes('bus') || desc.includes('carburant') || desc.includes('essence')) {
      return 'Transport';
    }
    if (desc.includes('shopping') || desc.includes('vêtement') || desc.includes('achat') || desc.includes('boutique')) {
      return 'Shopping';
    }
    if (desc.includes('facture') || desc.includes('électricité') || desc.includes('eau') || desc.includes('loyer') || desc.includes('internet')) {
      return 'Factures';
    }
    if (desc.includes('loisir') || desc.includes('cinéma') || desc.includes('sport') || desc.includes('divertissement')) {
      return 'Loisirs';
    }
    if (desc.includes('transfert') || desc.includes('virement')) {
      return 'Transferts';
    }
    return 'Autres';
  };

  async function fetchAnalytics() {
    try {
      setIsLoading(true);
      
      // Fetch accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, balance')
        .eq('user_id', user?.id);

      if (!accounts || accounts.length === 0) {
        setIsLoading(false);
        return;
      }

      const accountIds = accounts.map(a => a.id);
      const currentBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

      // Calculate date range
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .in('account_id', accountIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (!transactions) {
        setIsLoading(false);
        return;
      }

      // Calculate balance history (simulate based on current balance and transactions)
      const balanceData: BalanceHistory[] = [];
      let runningBalance = currentBalance;
      
      // Calculate the balance before the period
      transactions.forEach(tx => {
        if (tx.transaction_type === 'credit') {
          runningBalance -= tx.amount;
        } else {
          runningBalance += tx.amount;
        }
      });

      // Generate daily balance points
      const dailyBalances: Record<string, number> = {};
      let tempBalance = runningBalance;

      for (let i = 0; i <= daysAgo; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyBalances[dateStr] = tempBalance;
      }

      // Apply transactions to daily balances
      transactions.forEach(tx => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        const txDates = Object.keys(dailyBalances).filter(d => d >= txDate);
        
        txDates.forEach(d => {
          if (tx.transaction_type === 'credit') {
            dailyBalances[d] += tx.amount;
          } else {
            dailyBalances[d] -= tx.amount;
          }
        });
      });

      // Format for chart
      Object.entries(dailyBalances).forEach(([date, balance]) => {
        balanceData.push({
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          balance: Math.max(0, balance)
        });
      });

      setBalanceHistory(balanceData);

      // Calculate expenses by category
      const categoryTotals: Record<string, number> = {};
      let totalIncome = 0;
      let totalExpenses = 0;

      transactions.forEach(tx => {
        if (tx.transaction_type === 'credit') {
          totalIncome += tx.amount;
        } else {
          totalExpenses += tx.amount;
          const category = categorizeTransaction(tx.description);
          categoryTotals[category] = (categoryTotals[category] || 0) + tx.amount;
        }
      });

      const categoryData: ExpenseCategory[] = Object.entries(categoryTotals)
        .map(([name, value]) => ({
          name,
          value,
          color: CATEGORY_COLORS[name] || 'hsl(220, 15%, 60%)'
        }))
        .sort((a, b) => b.value - a.value);

      setExpensesByCategory(categoryData);
      setMonthlyStats({
        totalIncome,
        totalExpenses,
        netChange: totalIncome - totalExpenses,
        transactionCount: transactions.length
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
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

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <div className="h-48 animate-shimmer rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Analyses financières
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visualisez l'évolution de vos finances
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenus</p>
                <p className="text-lg font-bold text-success">{formatCompact(monthlyStats.totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dépenses</p>
                <p className="text-lg font-bold text-destructive">{formatCompact(monthlyStats.totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${monthlyStats.netChange >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {monthlyStats.netChange >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variation</p>
                <p className={`text-lg font-bold ${monthlyStats.netChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {monthlyStats.netChange >= 0 ? '+' : ''}{formatCompact(monthlyStats.netChange)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-lg font-bold">{monthlyStats.transactionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Evolution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Évolution du solde
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={balanceHistory}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(215, 80%, 45%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(215, 80%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => formatCompact(value)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Solde']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(215, 80%, 45%)" 
                    strokeWidth={2}
                    fill="url(#balanceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <p>Aucune donnée disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Dépenses par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center lg:flex-col lg:gap-1">
                  {expensesByCategory.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-muted-foreground">{category.name}</span>
                      <span className="font-medium">{formatCompact(category.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <p>Aucune dépense enregistrée</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Comparison Bar Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Comparaison revenus / dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={[
                  { name: 'Revenus', value: monthlyStats.totalIncome, fill: 'hsl(150, 70%, 40%)' },
                  { name: 'Dépenses', value: monthlyStats.totalExpenses, fill: 'hsl(0, 75%, 55%)' }
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => formatCompact(value)}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {[
                    { name: 'Revenus', value: monthlyStats.totalIncome, fill: 'hsl(150, 70%, 40%)' },
                    { name: 'Dépenses', value: monthlyStats.totalExpenses, fill: 'hsl(0, 75%, 55%)' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
