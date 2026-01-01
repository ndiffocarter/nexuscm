import { useEffect, useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, User, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

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
      // Fetch profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
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
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newClient.email,
        password: newClient.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: newClient.full_name,
            role: 'client'
          }
        }
      });

      if (authError) throw authError;

      // Update profile with additional info
      if (authData.user) {
        await supabase
          .from('profiles')
          .update({
            phone: newClient.phone,
            address: newClient.address
          })
          .eq('id', authData.user.id);
      }

      toast({
        title: "Client créé avec succès",
        description: `Les identifiants ont été envoyés à ${newClient.email}`,
      });

      setIsDialogOpen(false);
      setNewClient({ email: '', full_name: '', phone: '', address: '', password: '' });
      fetchClients();
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
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTotalBalance = (accounts?: { balance: number }[]) => {
    return accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
  };

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
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                      <DropdownMenuItem>Voir le profil</DropdownMenuItem>
                      <DropdownMenuItem>Gérer les comptes</DropdownMenuItem>
                      <DropdownMenuItem>Envoyer un message</DropdownMenuItem>
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
    </div>
  );
}
