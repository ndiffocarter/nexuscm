import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Search, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          account:accounts!transactions_account_id_fkey(
            account_number,
            user_id,
            profiles:user_id(full_name)
          ),
          recipient_account:accounts!transactions_recipient_account_id_fkey(account_number)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
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

  const filteredTransactions = transactions.filter(tx =>
    tx.account?.account_number.includes(searchQuery) ||
    tx.account?.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Historique des transactions" 
        subtitle={`${transactions.length} transactions enregistrées`}
      />
      
      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par compte, client ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
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
