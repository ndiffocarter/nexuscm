import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, User, Trash2, Edit, Eye, KeyRound, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFunctionErrorMessage } from '@/lib/getFunctionErrorMessage';

interface Client {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  created_at: string;
  accounts?: { id: string; account_type: string; balance: number }[];
}

export default function ClientsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isNewRoute = location.pathname === '/admin/clients/new';
  const { session } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    email: '',
    full_name: '',
    phone: '',
    address: '',
    password: ''
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (isNewRoute) {
      setIsDialogOpen(true);
    }
  }, [isNewRoute]);

  useEffect(() => {
    const filtered = clients.filter(client => 
      client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  async function fetchClients() {
    try {
      // Roles are stored in user_roles; we first list client user_ids then load their profiles.
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'client');

      if (roleError) throw roleError;

      const clientIds = (roleRows || []).map(r => r.user_id);

      if (clientIds.length === 0) {
        setClients([]);
        setFilteredClients([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch accounts for each profile
      const clientsWithAccounts = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: accountsData } = await supabase
            .from('accounts')
            .select('id, account_type, balance')
            .eq('user_id', profile.id);
          
          return {
            ...profile,
            accounts: accountsData || []
          };
        })
      );

      setClients(clientsWithAccounts);
      setFilteredClients(clientsWithAccounts);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      if (!session?.access_token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const { data, error } = await supabase.functions.invoke('admin-create-client', {
        body: {
          email: newClient.email,
          password: newClient.password,
          full_name: newClient.full_name,
          phone: newClient.phone || null,
          address: newClient.address || null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data && (data as any).email_sent === false) {
        toast({
          title: "Client créé",
          description: "Le client a été créé, mais l'email n'a pas pu être envoyé.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Client créé avec succès",
          description: `Les identifiants ont été envoyés à ${newClient.email}`,
        });
      }

      setIsDialogOpen(false);
      setNewClient({ email: '', full_name: '', phone: '', address: '', password: '' });
      fetchClients();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: getFunctionErrorMessage(error),
        variant: "destructive",
      });
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTotalBalance = (accounts?: { balance: number }[]) => {
    return accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
  };

  async function handleDeleteClient() {
    if (!selectedClient) return;
    setIsDeleting(true);
    
    try {
      if (!session?.access_token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const { data, error } = await supabase.functions.invoke('admin-delete-client', {
        body: { client_id: selectedClient.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Client supprimé",
        description: `${selectedClient.full_name} a été supprimé avec succès`,
      });

      setDeleteDialogOpen(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: getFunctionErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Gestion des clients" 
        subtitle={`${clients.length} clients enregistrés`}
      />
      
      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtrer
            </Button>
            
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open && isNewRoute) {
                  navigate('/admin/clients', { replace: true });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau client</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateClient} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nom complet</Label>
                    <Input
                      id="full_name"
                      value={newClient.full_name}
                      onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe initial</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newClient.password}
                      onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={newClient.address}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    />
                  </div>
                  <Button type="submit" variant="gradient" className="w-full">
                    Créer le client
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Clients Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 animate-shimmer rounded-2xl" />
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client, index) => (
              <Card 
                key={client.id} 
                className="glass-card hover:shadow-elevated transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full [background:var(--gradient-primary)] flex items-center justify-center text-white font-bold text-lg">
                      {client.full_name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{client.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedClient(client);
                        setViewDialogOpen(true);
                      }}>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir le profil
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedClient(client);
                          setNewPassword(null);
                          setResetPasswordDialogOpen(true);
                        }}
                      >
                        <KeyRound className="w-4 h-4 mr-2" />
                        Réinitialiser mot de passe
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedClient(client);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </span>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Solde total</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(getTotalBalance(client.accounts))}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {client.accounts?.map((acc) => (
                        <Badge key={acc.id} variant="secondary" className="text-xs">
                          {acc.account_type === 'checking' ? 'Courant' : 'Épargne'}
                        </Badge>
                      ))}
                      {(!client.accounts || client.accounts.length === 0) && (
                        <Badge variant="outline" className="text-xs">
                          Aucun compte
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Aucun client trouvé</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Aucun résultat pour votre recherche' : 'Commencez par créer votre premier client'}
            </p>
            {!searchQuery && (
              <Button variant="gradient" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un client
              </Button>
            )}
          </div>
        )}
      </div>

      {/* View Client Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Profil du client</DialogTitle>
            <DialogDescription>Informations détaillées du client</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full [background:var(--gradient-primary)] flex items-center justify-center text-white font-bold text-2xl">
                  {selectedClient.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedClient.full_name}</h3>
                  <p className="text-muted-foreground">{selectedClient.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{selectedClient.phone || 'Non renseigné'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{selectedClient.address || 'Non renseignée'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date d'inscription</p>
                  <p className="font-medium">{new Date(selectedClient.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Solde total</p>
                  <p className="font-medium">{formatCurrency(getTotalBalance(selectedClient.accounts))}</p>
                </div>
              </div>

              {selectedClient.accounts && selectedClient.accounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Comptes</p>
                  <div className="space-y-2">
                    {selectedClient.accounts.map((acc) => (
                      <div key={acc.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                        <span className="text-sm">{acc.account_type === 'checking' ? 'Courant' : 'Épargne'}</span>
                        <span className="font-medium">{formatCurrency(acc.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données du client ({selectedClient?.full_name}) seront supprimées, y compris ses comptes, transactions et prêts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(open) => {
        setResetPasswordDialogOpen(open);
        if (!open) {
          setNewPassword(null);
          setPasswordCopied(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              {newPassword 
                ? "Le mot de passe a été réinitialisé avec succès."
                : `Générer un nouveau mot de passe pour ${selectedClient?.full_name}`
              }
            </DialogDescription>
          </DialogHeader>
          
          {newPassword ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Nouveau mot de passe :</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded font-mono text-sm">
                    {newPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      setPasswordCopied(true);
                      setTimeout(() => setPasswordCopied(false), 2000);
                    }}
                  >
                    {passwordCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                ⚠️ L'email n'a pas pu être envoyé (domaine non vérifié sur Resend). Veuillez communiquer ce mot de passe au client manuellement.
              </p>
              <Button 
                onClick={() => setResetPasswordDialogOpen(false)}
                className="w-full"
              >
                Fermer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Un nouveau mot de passe sera généré automatiquement. Si l'envoi par email échoue, vous pourrez le copier et le transmettre manuellement.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResetPasswordDialogOpen(false)}
                  disabled={isResettingPassword}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedClient || !session?.access_token) return;
                    setIsResettingPassword(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('reset-client-password', {
                        body: { client_id: selectedClient.id },
                        headers: { Authorization: `Bearer ${session.access_token}` },
                      });
                      
                      if (error) throw error;
                      if (data?.error) throw new Error(data.error);
                      
                      if (data?.new_password) {
                        setNewPassword(data.new_password);
                      } else if (data?.email_sent) {
                        toast({
                          title: "Mot de passe réinitialisé",
                          description: "Le nouveau mot de passe a été envoyé par email",
                        });
                        setResetPasswordDialogOpen(false);
                      }
                    } catch (error: any) {
                      toast({
                        title: "Erreur",
                        description: getFunctionErrorMessage(error),
                        variant: "destructive",
                      });
                    } finally {
                      setIsResettingPassword(false);
                    }
                  }}
                  disabled={isResettingPassword}
                  className="flex-1"
                >
                  {isResettingPassword ? 'Réinitialisation...' : 'Réinitialiser'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
