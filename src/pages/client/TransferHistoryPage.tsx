import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, CalendarIcon, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Transaction {
  id: string;
  transaction_type: "credit" | "debit" | "transfer";
  amount: number;
  description: string | null;
  created_at: string;
  account_id: string;
  recipient_account_id: string | null;
  account?: {
    account_number: string;
    account_type: string;
  };
  recipient_account?: {
    account_number: string;
  } | null;
}

const ITEMS_PER_PAGE = 10;

export default function TransferHistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchQuery, typeFilter, minAmount, maxAmount, startDate, endDate]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    
    // First get user's accounts
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, account_number, account_type")
      .eq("user_id", user!.id);
    
    if (!accounts || accounts.length === 0) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const accountIds = accounts.map(a => a.id);
    const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));

    // Fetch all transactions for user's accounts
    const { data: txData, error } = await supabase
      .from("transactions")
      .select("*")
      .or(`account_id.in.(${accountIds.join(",")}),recipient_account_id.in.(${accountIds.join(",")})`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      setIsLoading(false);
      return;
    }

    // Get recipient account numbers
    const recipientIds = txData?.filter(t => t.recipient_account_id).map(t => t.recipient_account_id) || [];
    const { data: recipientAccounts } = await supabase
      .from("accounts")
      .select("id, account_number")
      .in("id", recipientIds);
    
    const recipientMap = Object.fromEntries((recipientAccounts || []).map(a => [a.id, a]));

    const enrichedTransactions = (txData || []).map(tx => ({
      ...tx,
      account: accountMap[tx.account_id],
      recipient_account: tx.recipient_account_id ? recipientMap[tx.recipient_account_id] : null,
    }));

    setTransactions(enrichedTransactions);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.description?.toLowerCase().includes(query) ||
        tx.account?.account_number.includes(query) ||
        tx.recipient_account?.account_number?.includes(query)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(tx => tx.transaction_type === typeFilter);
    }

    // Amount filters
    if (minAmount) {
      filtered = filtered.filter(tx => tx.amount >= parseFloat(minAmount));
    }
    if (maxAmount) {
      filtered = filtered.filter(tx => tx.amount <= parseFloat(maxAmount));
    }

    // Date filters
    if (startDate) {
      filtered = filtered.filter(tx => new Date(tx.created_at) >= startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => new Date(tx.created_at) <= endOfDay);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit":
        return <ArrowDownLeft className="h-5 w-5 text-green-600" />;
      case "debit":
        return <ArrowUpRight className="h-5 w-5 text-red-600" />;
      case "transfer":
        return <ArrowLeftRight className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTransactionBadge = (type: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      credit: { label: "Crédit", className: "bg-green-100 text-green-800" },
      debit: { label: "Débit", className: "bg-red-100 text-red-800" },
      transfer: { label: "Virement", className: "bg-blue-100 text-blue-800" },
    };
    const config = variants[type] || { label: type, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const hasActiveFilters = searchQuery || typeFilter !== "all" || minAmount || maxAmount || startDate || endDate;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Historique des virements</h1>
        <p className="text-muted-foreground">Consultez l'historique de toutes vos transactions</p>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher par description ou numéro de compte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  {[typeFilter !== "all", minAmount, maxAmount, startDate, endDate].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="credit">Crédit</SelectItem>
                    <SelectItem value="debit">Débit</SelectItem>
                    <SelectItem value="transfer">Virement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Montant min (€)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Montant max (€)</label>
                <Input
                  type="number"
                  placeholder="1000000"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Période</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yy", { locale: fr }) : "Début"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yy", { locale: fr }) : "Fin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <Button variant="ghost" onClick={clearFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? "s" : ""} trouvée{filteredTransactions.length > 1 ? "s" : ""}
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune transaction trouvée</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-muted">
                      {getTransactionIcon(tx.transaction_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {tx.description || "Transaction"}
                        </span>
                        {getTransactionBadge(tx.transaction_type)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {tx.account?.account_number}
                        {tx.recipient_account && (
                          <span> → {tx.recipient_account.account_number}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    tx.transaction_type === "credit" ? "text-green-600" : 
                    tx.transaction_type === "debit" ? "text-red-600" : "text-blue-600"
                  }`}>
                    {tx.transaction_type === "credit" ? "+" : tx.transaction_type === "debit" ? "-" : ""}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
