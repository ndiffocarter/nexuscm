import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layouts/AdminLayout";
import ClientLayout from "./layouts/ClientLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ClientsPage from "./pages/admin/ClientsPage";
import AccountsPage from "./pages/admin/AccountsPage";
import LoansPage from "./pages/admin/LoansPage";
import TransactionsPage from "./pages/admin/TransactionsPage";
import SupportAdminPage from "./pages/admin/SupportAdminPage";
import NotificationsAdminPage from "./pages/admin/NotificationsAdminPage";
import SettingsPage from "./pages/admin/SettingsPage";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientAccountsPage from "./pages/client/ClientAccountsPage";
import TransferPage from "./pages/client/TransferPage";
import TransferHistoryPage from "./pages/client/TransferHistoryPage";
import LoanRequestPage from "./pages/client/LoanRequestPage";
import NotificationsPage from "./pages/client/NotificationsPage";
import SupportPage from "./pages/client/SupportPage";
import VirtualCardsPage from "./pages/client/VirtualCardsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/new" element={<ClientsPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="accounts/new" element={<AccountsPage />} />
                <Route path="loans" element={<LoansPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
                <Route path="notifications" element={<NotificationsAdminPage />} />
                <Route path="support" element={<SupportAdminPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              
              {/* Client Routes */}
              <Route path="/dashboard" element={<ClientLayout />}>
                <Route index element={<ClientDashboard />} />
                <Route path="accounts" element={<ClientAccountsPage />} />
                <Route path="transfer" element={<TransferPage />} />
                <Route path="transfer-history" element={<TransferHistoryPage />} />
                <Route path="loans" element={<LoanRequestPage />} />
                <Route path="cards" element={<VirtualCardsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="support" element={<SupportPage />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
