import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Wallet, AlertTriangle, TrendingUp, Trash2, Edit2 } from 'lucide-react';

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  current_spending: number;
  month: number;
  year: number;
  alert_threshold: number;
  alert_sent: boolean;
}

const BUDGET_CATEGORIES = [
  { value: 'alimentation', label: 'Alimentation', icon: '🍽️' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'logement', label: 'Logement', icon: '🏠' },
  { value: 'sante', label: 'Santé', icon: '🏥' },
  { value: 'loisirs', label: 'Loisirs', icon: '🎮' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'education', label: 'Éducation', icon: '📚' },
  { value: 'services', label: 'Services', icon: '💼' },
  { value: 'autres', label: 'Autres', icon: '📦' },
];

export default function BudgetManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    monthly_limit: '',
    alert_threshold: '80'
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      fetchBudgets();
      calculateSpending();
    }
  }, [user]);

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('category');

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSpending = async () => {
    try {
      // Get user's accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user?.id);

      if (!accounts || accounts.length === 0) return;

      const accountIds = accounts.map(a => a.id);
      
      // Get transactions for current month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .in('account_id', accountIds)
        .eq('transaction_type', 'debit')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (!transactions) return;

      // Group spending by category (using description as category hint)
      const spendingByCategory: Record<string, number> = {};
      transactions.forEach(tx => {
        const category = categorizeTransaction(tx.description || '');
        spendingByCategory[category] = (spendingByCategory[category] || 0) + Number(tx.amount);
      });

      // Update budgets with current spending
      for (const [category, spending] of Object.entries(spendingByCategory)) {
        const budget = budgets.find(b => b.category === category);
        if (budget && budget.current_spending !== spending) {
          await supabase
            .from('budgets')
            .update({ current_spending: spending })
            .eq('id', budget.id);

          // Check if alert should be sent
          const percentage = (spending / budget.monthly_limit) * 100;
          if (percentage >= budget.alert_threshold && !budget.alert_sent) {
            await sendBudgetAlert(budget, percentage);
          }
        }
      }

      fetchBudgets();
    } catch (error) {
      console.error('Error calculating spending:', error);
    }
  };

  const categorizeTransaction = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('restaurant') || desc.includes('food') || desc.includes('supermarché')) return 'alimentation';
    if (desc.includes('transport') || desc.includes('uber') || desc.includes('taxi') || desc.includes('carburant')) return 'transport';
    if (desc.includes('loyer') || desc.includes('électricité') || desc.includes('eau')) return 'logement';
    if (desc.includes('pharmacie') || desc.includes('médecin') || desc.includes('hôpital')) return 'sante';
    if (desc.includes('cinéma') || desc.includes('netflix') || desc.includes('spotify')) return 'loisirs';
    if (desc.includes('achat') || desc.includes('boutique') || desc.includes('mode')) return 'shopping';
    if (desc.includes('école') || desc.includes('formation') || desc.includes('livre')) return 'education';
    return 'autres';
  };

  const sendBudgetAlert = async (budget: Budget, percentage: number) => {
    try {
      // Create notification
      await supabase.from('notifications').insert([{
        user_id: user?.id,
        title: 'Alerte Budget',
        message: `Vous avez atteint ${percentage.toFixed(0)}% de votre budget ${getCategoryLabel(budget.category)}. Limite: ${formatCurrency(budget.monthly_limit)}`,
        notification_type: 'general' as const
      }]);

      // Mark alert as sent
      await supabase
        .from('budgets')
        .update({ alert_sent: true })
        .eq('id', budget.id);

      toast({
        title: "Alerte Budget",
        description: `Vous avez atteint ${percentage.toFixed(0)}% de votre budget ${getCategoryLabel(budget.category)}`,
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error sending budget alert:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update({
            monthly_limit: parseFloat(formData.monthly_limit),
            alert_threshold: parseInt(formData.alert_threshold),
            alert_sent: false
          })
          .eq('id', editingBudget.id);

        if (error) throw error;
        toast({ title: "Budget modifié avec succès" });
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert({
            user_id: user?.id,
            category: formData.category,
            monthly_limit: parseFloat(formData.monthly_limit),
            alert_threshold: parseInt(formData.alert_threshold),
            month: currentMonth,
            year: currentYear
          });

        if (error) throw error;
        toast({ title: "Budget créé avec succès" });
      }

      setDialogOpen(false);
      setEditingBudget(null);
      setFormData({ category: '', monthly_limit: '', alert_threshold: '80' });
      fetchBudgets();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (budgetId: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;
      toast({ title: "Budget supprimé" });
      fetchBudgets();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      monthly_limit: budget.monthly_limit.toString(),
      alert_threshold: budget.alert_threshold.toString()
    });
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryLabel = (value: string) => {
    return BUDGET_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getCategoryIcon = (value: string) => {
    return BUDGET_CATEGORIES.find(c => c.value === value)?.icon || '📦';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 80) return 'bg-warning';
    return 'bg-success';
  };

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.monthly_limit), 0);
  const totalSpending = budgets.reduce((sum, b) => sum + Number(b.current_spending), 0);
  const totalPercentage = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0;

  const existingCategories = budgets.map(b => b.category);
  const availableCategories = BUDGET_CATEGORIES.filter(c => !existingCategories.includes(c.value));

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="h-48 animate-shimmer rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Budgets Mensuels
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingBudget(null);
            setFormData({ category: '', monthly_limit: '', alert_threshold: '80' });
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={availableCategories.length === 0 && !editingBudget}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? 'Modifier le budget' : 'Créer un budget'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingBudget && (
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Limite mensuelle (XAF)</Label>
                <Input
                  type="number"
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                  placeholder="Ex: 100000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Seuil d'alerte (%)</Label>
                <Select
                  value={formData.alert_threshold}
                  onValueChange={(value) => setFormData({ ...formData, alert_threshold: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="60">60%</SelectItem>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingBudget ? 'Modifier' : 'Créer le budget'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        {budgets.length > 0 && (
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-medium">Résumé du mois</span>
              </div>
              <Badge variant={totalPercentage >= 80 ? "destructive" : "secondary"}>
                {totalPercentage.toFixed(0)}% utilisé
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total dépensé</span>
                <p className="font-bold text-lg">{formatCurrency(totalSpending)}</p>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Budget total</span>
                <p className="font-bold text-lg">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
            <Progress 
              value={Math.min(totalPercentage, 100)} 
              className="mt-3 h-2"
            />
          </div>
        )}

        {/* Budget list */}
        {budgets.length > 0 ? (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const percentage = (Number(budget.current_spending) / Number(budget.monthly_limit)) * 100;
              const remaining = Number(budget.monthly_limit) - Number(budget.current_spending);
              
              return (
                <div 
                  key={budget.id}
                  className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(budget.category)}</span>
                      <div>
                        <p className="font-medium">{getCategoryLabel(budget.category)}</p>
                        <p className="text-sm text-muted-foreground">
                          Limite: {formatCurrency(budget.monthly_limit)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {percentage >= budget.alert_threshold && (
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openEditDialog(budget)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(budget.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{formatCurrency(budget.current_spending)} dépensé</span>
                      <span className={remaining < 0 ? 'text-destructive' : 'text-success'}>
                        {remaining >= 0 ? `${formatCurrency(remaining)} restant` : `${formatCurrency(Math.abs(remaining))} dépassé`}
                      </span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={Math.min(percentage, 100)} 
                        className="h-3"
                      />
                      <div 
                        className="absolute top-0 h-3 w-0.5 bg-foreground/50" 
                        style={{ left: `${budget.alert_threshold}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(0)}% • Alerte à {budget.alert_threshold}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun budget défini pour ce mois</p>
            <p className="text-sm mt-1">Créez votre premier budget pour suivre vos dépenses</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
