import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Search, Calendar, Filter } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportButtons } from '@/components/ExportButtons';

interface Transaction {
  id: string;
  transaction_type: 'credit' | 'debit' | 'transfer';
  amount: number;
  description: string;
  created_at: string;
  account_id: string;
  recipient_account_id?: string;
  account?: { account_number: string; user_id: string; profiles?: { full_name: string } };
  recipient_account?: { account_number: string };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  useEffect(() => {
    fetchTransactions();
  }, [dateRange, typeFilter]);

  async function fetchTransactions() {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateRange.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter as 'credit' | 'debit' | 'transfer');
      }

      const { data: txData, error: txError } = await query.limit(500);

      if (txError) throw txError;

      // Fetch account details for each transaction
      const txWithDetails = await Promise.all(
        (txData || []).map(async (tx) => {
          const { data: accountData } = await supabase
            .from('accounts')
            .select('account_number, user_id')
            .eq('id', tx.account_id)
            .single();

          let profiles = { full_name: 'N/A' };
          if (accountData?.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', accountData.user_id)
              .single();
            if (profileData) profiles = profileData;
          }

          let recipientAccount = null;
          if (tx.recipient_account_id) {
            const { data: recipientData } = await supabase
              .from('accounts')
              .select('account_number')
              .eq('id', tx.recipient_account_id)
              .single();
            recipientAccount = recipientData;
          }

          return {
            ...tx,
            account: { ...accountData, profiles },
            recipient_account: recipientAccount
          };
        })
      );

      setTransactions(txWithDetails);
    } catch (error) {
      console.error('Error fetching transactions:', error);
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <ArrowDownRight className="w-5 h-5 text-success" />;
      case 'debit':
        return <ArrowUpRight className="w-5 h-5 text-destructive" />;
      case 'transfer':
        return <ArrowLeftRight className="w-5 h-5 text-primary" />;
      default:
        return null;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'credit':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Crédit</Badge>;
      case 'debit':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Débit</Badge>;
      case 'transfer':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Virement</Badge>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit': return 'Crédit';
      case 'debit': return 'Débit';
      case 'transfer': return 'Virement';
      default: return type;
    }
  };

  const filteredTransactions = transactions.filter(tx =>
    tx.account?.account_number?.includes(searchQuery) ||
    tx.account?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export columns configuration
  const exportColumns = [
    { header: 'Date', accessor: (row: Transaction) => format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) },
    { header: 'Type', accessor: (row: Transaction) => getTypeLabel(row.transaction_type) },
    { header: 'Client', accessor: (row: Transaction) => row.account?.profiles?.full_name || '-' },
    { header: 'Compte', accessor: (row: Transaction) => row.account?.account_number || '-' },
    { header: 'Description', accessor: (row: Transaction) => row.description || '-' },
    { header: 'Montant (€)', accessor: (row: Transaction) => row.amount },
  ];

  const exportTitle = 'Historique des transactions';
  const exportSubtitle = `Période: ${dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: fr }) : '-'} au ${dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: fr }) : '-'}${typeFilter !== 'all' ? ` | Type: ${getTypeLabel(typeFilter)}` : ''}`;

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Historique des transactions" 
        subtitle={`${filteredTransactions.length} transactions${typeFilter !== 'all' ? ` (${getTypeLabel(typeFilter)})` : ''}`}
      />
      
      <div className="p-6">
        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par compte, client ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[240px] justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd MMM', { locale: fr })} - {format(dateRange.to, 'dd MMM yyyy', { locale: fr })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd MMM yyyy', { locale: fr })
                  )
                ) : (
                  'Sélectionner une période'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="credit">Crédits</SelectItem>
              <SelectItem value="debit">Débits</SelectItem>
              <SelectItem value="transfer">Virements</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Export Buttons */}
          <ExportButtons
            filename="transactions"
            title={exportTitle}
            subtitle={exportSubtitle}
            columns={exportColumns}
            data={filteredTransactions}
            disabled={isLoading}
          />
        </div>

        {/* Transactions Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx, index) => (
                    <TableRow 
                      key={tx.id} 
                      className="table-row-hover animate-fade-in"
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {getTransactionIcon(tx.transaction_type)}
                          </div>
                          {getTransactionBadge(tx.transaction_type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.account?.profiles?.full_name || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm">{tx.account?.account_number}</p>
                          {tx.transaction_type === 'transfer' && tx.recipient_account && (
                            <p className="text-xs text-muted-foreground">
                              → {tx.recipient_account.account_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          tx.transaction_type === 'credit' ? 'text-success' : 
                          tx.transaction_type === 'debit' ? 'text-destructive' : ''
                        }`}>
                          {tx.transaction_type === 'credit' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Aucune transaction trouvée</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}