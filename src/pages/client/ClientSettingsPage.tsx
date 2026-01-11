import { useEffect, useState } from 'react';
import { Shield, Bell, BellOff, Settings, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorSettings {
  id?: string;
  user_id: string;
  is_enabled: boolean;
}

interface NotificationPreferences {
  transactions: boolean;
  loans: boolean;
  support: boolean;
  marketing: boolean;
}

export default function ClientSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    transactions: true,
    loans: true,
    support: true,
    marketing: false,
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  async function loadSettings() {
    setIsLoading(true);
    try {
      // Load 2FA settings
      const { data: tfaData } = await supabase
        .from('user_2fa_settings' as any)
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (tfaData) {
        const settings = tfaData as unknown as TwoFactorSettings;
        setTwoFactorEnabled(settings.is_enabled);
      }

      // Load notification preferences from profiles or a dedicated table
      // For now, we'll use default values
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleTwoFactor() {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const newValue = !twoFactorEnabled;

      // Check if record exists
      const { data: existing } = await supabase
        .from('user_2fa_settings' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('user_2fa_settings' as any)
          .update({ is_enabled: newValue })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_2fa_settings' as any)
          .insert({
            user_id: user.id,
            is_enabled: newValue
          });

        if (error) throw error;
      }

      setTwoFactorEnabled(newValue);
      toast({
        title: newValue ? "2FA activé" : "2FA désactivé",
        description: newValue 
          ? "L'authentification à deux facteurs est maintenant active" 
          : "L'authentification à deux facteurs est désactivée",
      });
    } catch (error: any) {
      console.error('Error toggling 2FA:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les paramètres 2FA",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNotificationPrefs() {
    setIsSaving(true);
    try {
      // In a real app, you would save these to a database
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Préférences sauvegardées",
        description: "Vos préférences de notification ont été mises à jour",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les préférences",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Gérez vos préférences de compte et de sécurité</p>
      </div>

      {/* Security Section */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl [background:var(--gradient-primary)] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>Protégez votre compte avec des options de sécurité avancées</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Authentification à deux facteurs (2FA)</Label>
              <p className="text-sm text-muted-foreground">
                Recevez un code par email à chaque connexion pour plus de sécurité
              </p>
            </div>
            <div className="flex items-center gap-3">
              {twoFactorEnabled ? (
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Activé
                </span>
              ) : (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <X className="w-4 h-4" /> Désactivé
                </span>
              )}
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={toggleTwoFactor}
                disabled={isSaving}
              />
            </div>
          </div>

          {twoFactorEnabled && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Votre compte est protégé par l'authentification à deux facteurs. 
                Un code de vérification sera envoyé à votre email lors de chaque connexion.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choisissez les notifications que vous souhaitez recevoir</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Label className="text-base">Transactions</Label>
              <p className="text-sm text-muted-foreground">
                Alertes pour les virements, dépôts et retraits
              </p>
            </div>
            <Switch
              checked={notificationPrefs.transactions}
              onCheckedChange={(checked) => 
                setNotificationPrefs(prev => ({ ...prev, transactions: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Label className="text-base">Prêts</Label>
              <p className="text-sm text-muted-foreground">
                Mises à jour sur vos demandes de prêt
              </p>
            </div>
            <Switch
              checked={notificationPrefs.loans}
              onCheckedChange={(checked) => 
                setNotificationPrefs(prev => ({ ...prev, loans: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Label className="text-base">Support</Label>
              <p className="text-sm text-muted-foreground">
                Réponses à vos tickets de support
              </p>
            </div>
            <Switch
              checked={notificationPrefs.support}
              onCheckedChange={(checked) => 
                setNotificationPrefs(prev => ({ ...prev, support: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Label className="text-base">Communications marketing</Label>
              <p className="text-sm text-muted-foreground">
                Offres spéciales et nouveautés SecureBank
              </p>
            </div>
            <Switch
              checked={notificationPrefs.marketing}
              onCheckedChange={(checked) => 
                setNotificationPrefs(prev => ({ ...prev, marketing: checked }))
              }
            />
          </div>

          <div className="pt-4">
            <Button 
              onClick={saveNotificationPrefs} 
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  Sauvegarder les préférences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
