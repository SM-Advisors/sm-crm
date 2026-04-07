import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import Dashboard from "./pages/Dashboard";
import ContactsPage from "./pages/Contacts";
import ContactDetailPage from "./pages/ContactDetail";
import CompaniesPage from "./pages/Companies";
import CompanyDetailPage from "./pages/CompanyDetail";
import SalesPipelinePage from "./pages/SalesPipeline";
import DeliveryPipelinePage from "./pages/DeliveryPipeline";
import InvoicesPage from "./pages/Invoices";
import InvoiceDetailPage from "./pages/InvoiceDetail";
import ReportsPage from "./pages/Reports";
import AgentLogPage from "./pages/AgentLog";
import SettingsPage from "./pages/SettingsPage";
import NotesPage from "./pages/Notes";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* Contacts */}
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/:id" element={<ContactDetailPage />} />

            {/* Companies */}
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/:id" element={<CompanyDetailPage />} />

            {/* Pipelines */}
            <Route path="/sales-pipeline" element={<SalesPipelinePage />} />
            <Route path="/delivery-pipeline" element={<DeliveryPipelinePage />} />

            {/* Invoices */}
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />

            {/* Notes */}
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/new-engagement" element={<Navigate to="/notes" replace />} />

            {/* Other */}
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/agent-log" element={<AgentLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Legacy short paths */}
            <Route path="/sales" element={<Navigate to="/sales-pipeline" replace />} />
            <Route path="/delivery" element={<Navigate to="/delivery-pipeline" replace />} />
            <Route path="/agent" element={<Navigate to="/agent-log" replace />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
