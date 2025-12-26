import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout.tsx';
import { RequireAuth } from '@/features/auth/RequireAuth.tsx';
import { LoginPage } from '@/features/auth/LoginPage.tsx';
import { DashboardPage } from '@/features/dashboard/DashboardPage.tsx';
import { ProspectsPage } from '@/features/prospects/ProspectsPage.tsx';
import { ProspectDetailPage } from '@/features/prospects/ProspectDetailPage.tsx';
import { CustomersPage } from '@/features/customers/CustomersPage.tsx';
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage.tsx';
import { TechniciansPage } from '@/features/technicians/TechniciansPage.tsx';
import { TechnicianDetailPage } from '@/features/technicians/TechnicianDetailPage.tsx';
import { WorkOrdersPage } from '@/features/workorders/WorkOrdersPage.tsx';
import { WorkOrderDetailPage } from '@/features/workorders/WorkOrderDetailPage.tsx';
import { SchedulePage } from '@/features/schedule/SchedulePage.tsx';
import { EmailMarketingPage } from '@/features/email-marketing/EmailMarketingPage.tsx';
import { ReportsPage } from '@/features/reports/pages/ReportsPage.tsx';
import { RevenueReport } from '@/features/reports/pages/RevenueReport.tsx';
import { TechnicianPerformance } from '@/features/reports/pages/TechnicianPerformance.tsx';
import { EquipmentPage } from '@/features/equipment/EquipmentPage.tsx';
import { InventoryPage } from '@/features/inventory/InventoryPage.tsx';
import { TicketsPage } from '@/features/tickets/TicketsPage.tsx';
import { TicketDetailPage } from '@/features/tickets/TicketDetailPage.tsx';
import { FleetMapPage } from '@/features/fleet/index.ts';
import { IntegrationsPage } from '@/features/integrations/index.ts';
import { InvoicesPage } from '@/features/invoicing/InvoicesPage.tsx';
import { InvoiceDetailPage } from '@/features/invoicing/InvoiceDetailPage.tsx';
import { PaymentsPage } from '@/features/payments/PaymentsPage.tsx';
import { QuotesPage } from '@/features/quotes/QuotesPage.tsx';
import { QuoteDetailPage } from '@/features/quotes/QuoteDetailPage.tsx';
import { UsersPage } from '@/features/users/UsersPage.tsx';
import { AdminSettingsPage } from '@/features/admin/AdminSettingsPage.tsx';

/**
 * App routes - basename="/app" is set in BrowserRouter
 * All paths here are relative to /app/
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public login route at /app/login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected app routes at /app/* */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* Default redirect to dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard */}
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Prospects */}
        <Route path="prospects" element={<ProspectsPage />} />
        <Route path="prospects/:id" element={<ProspectDetailPage />} />

        {/* Customers */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />

        {/* Technicians */}
        <Route path="technicians" element={<TechniciansPage />} />
        <Route path="technicians/:id" element={<TechnicianDetailPage />} />

        {/* Work Orders */}
        <Route path="work-orders" element={<WorkOrdersPage />} />
        <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />

        {/* Schedule */}
        <Route path="schedule" element={<SchedulePage />} />

        {/* Email Marketing */}
        <Route path="email-marketing" element={<EmailMarketingPage />} />

        {/* Reports */}
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/revenue" element={<RevenueReport />} />
        <Route path="reports/technicians" element={<TechnicianPerformance />} />

        {/* Equipment */}
        <Route path="equipment" element={<EquipmentPage />} />

        {/* Inventory */}
        <Route path="inventory" element={<InventoryPage />} />

        {/* Tickets */}
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />

        {/* Fleet Tracking */}
        <Route path="fleet" element={<FleetMapPage />} />

        {/* Integrations */}
        <Route path="integrations" element={<IntegrationsPage />} />

        {/* Invoices */}
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />

        {/* Payments */}
        <Route path="payments" element={<PaymentsPage />} />

        {/* Quotes */}
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="quotes/:id" element={<QuoteDetailPage />} />

        {/* Users Management */}
        <Route path="users" element={<UsersPage />} />

        {/* Admin Settings */}
        <Route path="admin" element={<AdminSettingsPage />} />

        {/* 404 within app */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
                <p className="text-text-secondary mb-4">Page not found</p>
                <Link to="/dashboard" className="text-primary hover:underline">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
