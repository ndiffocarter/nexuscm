import { useEffect, useState } from 'react';
import { FileText, Calculator, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Account {
  id: string;
  account_number: string;
  account_type: 'checking' | 'savings';
}

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  duration_months: number;
  monthly_payment: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  created_at: string;
  admin_notes?: string;
}

export default function LoanRequestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    accountId: '',
    amount: 100000,
    duration: 12,
    reason: ''
  });

  const INTEREST_RATE = 8.5; // Fixed interest rate

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    try {
      const [accountsRes, loansRes] = await Promise.all([
        supabase.from('accounts').select('id, account_number, account_type').eq('user_id', user?.id),
        supabase.from('loans').select('*').eq('user_id', user?.id).order('created_at', { ascending: false })
      ]);

      setAccounts(accountsRes.data || []);
      setLoans(loansRes.data || []);
      
      if (accountsRes.data && accountsRes.data.length > 0) {
        setForm(prev => ({ ...prev, accountId: accountsRes.data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const calculateLoan = () => {
    const principal = form.amount;
    const monthlyRate = INTEREST_RATE / 100 / 12;
    const months = form.duration;
    
    const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                          (Math.pow(1 + monthlyRate, months) - 1);
    const totalAmount = monthlyPayment * months;
    
    return {
      monthlyPayment: Math.round(monthlyPayment),
      totalAmount: Math.round(totalAmount),
      interestTotal: Math.round(totalAmount - principal)
    };
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { monthlyPayment, totalAmount } = calculateLoan();

      const { error } = await supabase.from('loans').insert({
        user_id: user?.id,
        account_id: form.accountId,
        amount: form.amount,
        interest_rate: INTEREST_RATE,
        duration_months: form.duration,
        monthly_payment: monthlyPayment,
        total_amount: totalAmount,
        reason: form.reason,
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "Demande envoyée",
        description: "Votre demande de prêt a été soumise avec succès",
      });

      setForm({ accountId: accounts[0]?.id || '', amount: 100000, duration: 12, reason: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approuvé
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="w-3 h-3 mr-1" />
            Refusé
          </Badge>
        );
      default:
        return null;
    }
  };

  const loanCalc = calculateLoan();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-96 animate-shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demander un prêt</h1>
        <p className="text-muted-foreground">Simulez et demandez un prêt bancaire</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan form */}
        <div className="lg:col-span-2">
          <Card className="glass-card animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Simulateur de prêt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Compte à créditer</Label>
                  <Select
                    value={form.accountId}
                    onValueChange={(value) => setForm({ ...form, accountId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_type === 'checking' ? 'Courant' : 'Épargne'} - {account.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Montant du prêt</Label>
                    <span className="font-bold text-primary">{formatCurrency(form.amount)}</span>
                  </div>
                  <Slider
                    value={[form.amount]}
                    onValueChange={([value]) => setForm({ ...form, amount: value })}
                    min={50000}
                    max={10000000}
                    step={50000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50 000 XAF</span>
                    <span>10 000 000 XAF</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Durée du prêt</Label>
                    <span className="font-bold text-primary">{form.duration} mois</span>
                  </div>
                  <Slider
                    value={[form.duration]}
                    onValueChange={([value]) => setForm({ ...form, duration: value })}
                    min={3}
                    max={60}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3 mois</span>
                    <span>60 mois</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Motif du prêt</Label>
                  <Textarea
                    id="reason"
                    placeholder="Décrivez l'objet de votre demande de prêt..."
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="gradient" 
                  size="xl"
                  className="w-full"
                  disabled={isSubmitting || !form.accountId}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi en cours...
                    </div>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      Soumettre la demande
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Loan summary */}
        <div className="space-y-6">
          <Card className="glass-card-elevated animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="text-lg">Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant emprunté</span>
                <span className="font-semibold">{formatCurrency(form.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taux d'intérêt</span>
                <span className="font-semibold">{INTEREST_RATE}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durée</span>
                <span className="font-semibold">{form.duration} mois</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mensualité</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(loanCalc.monthlyPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût total du crédit</span>
                <span className="font-semibold text-warning">{formatCurrency(loanCalc.interestTotal)}</span>
              </div>
              <div className="p-4 rounded-xl [background:var(--gradient-primary)] text-white">
                <p className="text-sm opacity-80">Montant total à rembourser</p>
                <p className="text-2xl font-bold">{formatCurrency(loanCalc.totalAmount)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Existing loans */}
      {loans.length > 0 && (
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Mes demandes de prêt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loans.map((loan) => (
                <div 
                  key={loan.id}
                  className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(loan.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(loan.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="font-semibold text-lg">{formatCurrency(loan.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {loan.duration_months} mois à {loan.interest_rate}% - Mensualité: {formatCurrency(loan.monthly_payment)}
                      </p>
                      {loan.reason && (
                        <p className="text-sm mt-2 text-muted-foreground">{loan.reason}</p>
                      )}
                      {loan.admin_notes && loan.status === 'rejected' && (
                        <p className="text-sm mt-2 text-destructive">Note: {loan.admin_notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total à rembourser</p>
                      <p className="font-bold text-lg">{formatCurrency(loan.total_amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
