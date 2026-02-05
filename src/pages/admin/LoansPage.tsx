import { useEffect, useState } from 'react';
import { FileText, Check, X, Clock, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  duration_months: number;
  monthly_payment: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  admin_notes?: string;
  created_at: string;
  user_id: string;
  account_id: string;
  profiles?: { full_name: string; email: string };
  accounts?: { account_number: string };
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchLoans();
  }, []);

  async function fetchLoans() {
    try {
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

      if (loansError) throw loansError;

      // Fetch profiles and accounts for each loan
      const loansWithDetails = await Promise.all(
        (loansData || []).map(async (loan) => {
          const [profileRes, accountRes] = await Promise.all([
            supabase.from('profiles').select('full_name, email').eq('id', loan.user_id).single(),
            supabase.from('accounts').select('account_number').eq('id', loan.account_id).single()
          ]);
          
          return {
            ...loan,
            profiles: profileRes.data || { full_name: 'N/A', email: '' },
            accounts: accountRes.data || { account_number: 'N/A' }
          };
        })
      );

      setLoans(loansWithDetails);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateLoanStatus(loanId: string, status: 'approved' | 'rejected') {
    try {
      const loan = loans.find(l => l.id === loanId);
      if (!loan) return;

      const { error } = await supabase
        .from('loans')
        .update({ 
          status, 
          admin_notes: adminNotes 
        })
        .eq('id', loanId);

      if (error) throw error;

      // If approved, credit the account
      if (status === 'approved') {
        const { data: account } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', loan.account_id)
          .single();

        if (account) {
          await supabase
            .from('accounts')
            .update({ balance: Number(account.balance) + Number(loan.amount) })
            .eq('id', loan.account_id);

          await supabase
            .from('transactions')
            .insert({
              account_id: loan.account_id,
              transaction_type: 'credit',
              amount: loan.amount,
              description: `Prêt approuvé - Durée: ${loan.duration_months} mois`
            });
        }
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: loan.user_id,
          title: status === 'approved' ? 'Prêt approuvé' : 'Prêt refusé',
          message: status === 'approved' 
            ? `Votre demande de prêt de ${formatCurrency(loan.amount)} a été approuvée. Le montant a été crédité sur votre compte.`
            : `Votre demande de prêt de ${formatCurrency(loan.amount)} a été refusée.${adminNotes ? ` Raison: ${adminNotes}` : ''}`,
          notification_type: status === 'approved' ? 'loan_approved' : 'loan_rejected'
        });

      toast({
        title: status === 'approved' ? 'Prêt approuvé' : 'Prêt refusé',
        description: `La demande de prêt a été ${status === 'approved' ? 'approuvée' : 'refusée'}`,
      });

      setSelectedLoan(null);
      setAdminNotes('');
      fetchLoans();
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
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">En attente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Refusé</Badge>;
      default:
        return null;
    }
  };

  const filteredLoans = statusFilter === 'all' 
    ? loans 
    : loans.filter(l => l.status === statusFilter);

  const pendingCount = loans.filter(l => l.status === 'pending').length;

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Demandes de prêt" 
        subtitle={`${pendingCount} demande${pendingCount > 1 ? 's' : ''} en attente`}
      />
      
      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' && 'Toutes'}
              {status === 'pending' && (
                <>
                  <Clock className="w-4 h-4 mr-1" />
                  En attente ({loans.filter(l => l.status === 'pending').length})
                </>
              )}
              {status === 'approved' && 'Approuvées'}
              {status === 'rejected' && 'Refusées'}
            </Button>
          ))}
        </div>

        {/* Loans Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Mensualité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLoans.length > 0 ? (
                  filteredLoans.map((loan) => (
                    <TableRow key={loan.id} className="table-row-hover">
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{loan.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>{loan.interest_rate}%</TableCell>
                      <TableCell>{loan.duration_months} mois</TableCell>
                      <TableCell>{formatCurrency(loan.monthly_payment)}</TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(loan.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {loan.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success hover:bg-success/10"
                              onClick={() => setSelectedLoan(loan)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setSelectedLoan(loan)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setSelectedLoan(loan)}>
                            Voir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Aucune demande de prêt</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Loan Details Dialog */}
        <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Détails de la demande de prêt</DialogTitle>
            </DialogHeader>
            {selectedLoan && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted">
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-semibold">{selectedLoan.profiles?.full_name}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted">
                    <p className="text-sm text-muted-foreground">Compte</p>
                    <p className="font-semibold">{selectedLoan.accounts?.account_number}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted">
                    <p className="text-sm text-muted-foreground">Montant demandé</p>
                    <p className="font-semibold text-lg">{formatCurrency(selectedLoan.amount)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted">
                    <p className="text-sm text-muted-foreground">Montant total</p>
                    <p className="font-semibold text-lg">{formatCurrency(selectedLoan.total_amount)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted">
                    <p className="text-sm text-muted-foreground">Taux d'intérêt</p>
                    <p className="font-semibold">{selectedLoan.interest_rate}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted">
                    <p className="text-sm text-muted-foreground">Mensualité</p>
                    <p className="font-semibold">{formatCurrency(selectedLoan.monthly_payment)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Raison de la demande</p>
                  <p className="p-4 rounded-xl bg-muted">{selectedLoan.reason}</p>
                </div>

                {selectedLoan.status === 'pending' && (
                  <>
                    <div className="space-y-2">
                      <Label>Notes administrateur</Label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Ajouter des notes (optionnel)..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="default"
                        className="flex-1 bg-success hover:bg-success/90"
                        onClick={() => handleUpdateLoanStatus(selectedLoan.id, 'approved')}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approuver
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleUpdateLoanStatus(selectedLoan.id, 'rejected')}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Refuser
                      </Button>
                    </div>
                  </>
                )}

                {selectedLoan.status !== 'pending' && selectedLoan.admin_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Notes administrateur</p>
                    <p className="p-4 rounded-xl bg-muted">{selectedLoan.admin_notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
