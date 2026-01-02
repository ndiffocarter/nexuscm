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
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientAccountsPage from "./pages/client/ClientAccountsPage";
import TransferPage from "./pages/client/TransferPage";
import LoanRequestPage from "./pages/client/LoanRequestPage";
import NotificationsPage from "./pages/client/NotificationsPage";
import SupportPage from "./pages/client/SupportPage";

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
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="loans" element={<LoansPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
              </Route>
              
              {/* Client Routes */}
              <Route path="/dashboard" element={<ClientLayout />}>
                <Route index element={<ClientDashboard />} />
                <Route path="accounts" element={<ClientAccountsPage />} />
                <Route path="transfer" element={<TransferPage />} />
                <Route path="loans" element={<LoanRequestPage />} />
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
