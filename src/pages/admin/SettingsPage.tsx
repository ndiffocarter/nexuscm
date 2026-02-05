import { useEffect, useState } from 'react';
import { 
  Settings, 
  Percent, 
  CreditCard, 
  Building2,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BankSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, BankSetting>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('bank_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;

      const settingsMap: Record<string, BankSetting> = {};
      const valuesMap: Record<string, string> = {};
      
      (data || []).forEach((setting: BankSetting) => {
        settingsMap[setting.setting_key] = setting;
        valuesMap[setting.setting_key] = setting.setting_value;
      });

      setSettings(settingsMap);
      setFormValues(valuesMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(formValues).map(([key, value]) => ({
        id: settings[key]?.id,
        setting_key: key,
        setting_value: value,
        setting_type: settings[key]?.setting_type || 'string',
        description: settings[key]?.description
      }));

      for (const update of updates) {
        if (update.id) {
          const { error } = await supabase
            .from('bank_settings')
            .update({ setting_value: update.setting_value })
            .eq('id', update.id);

          if (error) throw error;
        }
      }

      toast({
        title: "Succès",
        description: "Les paramètres ont été enregistrés"
      });

      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateValue = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Paramètres" 
        subtitle="Configuration générale de la banque"
      >
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </AdminHeader>
      
      <div className="p-6">
        <Tabs defaultValue="rates" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="rates">
              <Percent className="w-4 h-4 mr-2" />
              Taux
            </TabsTrigger>
            <TabsTrigger value="fees">
              <CreditCard className="w-4 h-4 mr-2" />
              Frais
            </TabsTrigger>
            <TabsTrigger value="general">
              <Building2 className="w-4 h-4 mr-2" />
              Général
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rates" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  Taux d'intérêt
                </CardTitle>
                <CardDescription>
                  Configurez les taux d'intérêt appliqués aux comptes et prêts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="interest_rate_savings">
                      Taux compte épargne (%)
                    </Label>
                    <Input
                      id="interest_rate_savings"
                      type="number"
                      step="0.1"
                      value={formValues.interest_rate_savings || ''}
                      onChange={(e) => updateValue('interest_rate_savings', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {settings.interest_rate_savings?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interest_rate_loan">
                      Taux prêt par défaut (%)
                    </Label>
                    <Input
                      id="interest_rate_loan"
                      type="number"
                      step="0.1"
                      value={formValues.interest_rate_loan || ''}
                      onChange={(e) => updateValue('interest_rate_loan', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {settings.interest_rate_loan?.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Limites de prêt</CardTitle>
                <CardDescription>
                  Définissez les montants et durées autorisés pour les prêts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="min_loan_amount">
                      Montant minimum (€)
                    </Label>
                    <Input
                      id="min_loan_amount"
                      type="number"
                      value={formValues.min_loan_amount || ''}
                      onChange={(e) => updateValue('min_loan_amount', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_loan_amount">
                      Montant maximum (€)
                    </Label>
                    <Input
                      id="max_loan_amount"
                      type="number"
                      value={formValues.max_loan_amount || ''}
                      onChange={(e) => updateValue('max_loan_amount', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_loan_duration">
                      Durée minimum (mois)
                    </Label>
                    <Input
                      id="min_loan_duration"
                      type="number"
                      value={formValues.min_loan_duration || ''}
                      onChange={(e) => updateValue('min_loan_duration', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_loan_duration">
                      Durée maximum (mois)
                    </Label>
                    <Input
                      id="max_loan_duration"
                      type="number"
                      value={formValues.max_loan_duration || ''}
                      onChange={(e) => updateValue('max_loan_duration', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Frais de virement
                </CardTitle>
                <CardDescription>
                  Configurez les frais appliqués aux virements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="transfer_fee_internal">
                      Frais virement interne (€)
                    </Label>
                    <Input
                      id="transfer_fee_internal"
                      type="number"
                      value={formValues.transfer_fee_internal || ''}
                      onChange={(e) => updateValue('transfer_fee_internal', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Virements entre comptes SecureBank
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer_fee_external">
                      Frais virement externe (€)
                    </Label>
                    <Input
                      id="transfer_fee_external"
                      type="number"
                      value={formValues.transfer_fee_external || ''}
                      onChange={(e) => updateValue('transfer_fee_external', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Virements vers d'autres banques
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Note</p>
                    <p className="text-sm text-muted-foreground">
                      Les frais sont automatiquement déduits du montant transféré lors de chaque opération.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Informations de la banque
                </CardTitle>
                <CardDescription>
                  Informations générales affichées aux clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">
                      Nom de la banque
                    </Label>
                    <Input
                      id="bank_name"
                      value={formValues.bank_name || ''}
                      onChange={(e) => updateValue('bank_name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_email">
                      Email de contact
                    </Label>
                    <Input
                      id="bank_email"
                      type="email"
                      value={formValues.bank_email || ''}
                      onChange={(e) => updateValue('bank_email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_phone">
                      Téléphone
                    </Label>
                    <Input
                      id="bank_phone"
                      value={formValues.bank_phone || ''}
                      onChange={(e) => updateValue('bank_phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_address">
                      Adresse
                    </Label>
                    <Input
                      id="bank_address"
                      value={formValues.bank_address || ''}
                      onChange={(e) => updateValue('bank_address', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
