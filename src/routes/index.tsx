import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout.tsx';
import { RequireAuth } from '@/features/auth/RequireAuth.tsx';
import { LoginPage } from '@/features/auth/LoginPage.tsx';

// Portal routes - lazy loaded
const PortalLayout = lazy(() => import('@/features/portal/index.ts').then(m => ({ default: m.PortalLayout })));
const PortalLoginPage = lazy(() => import('@/features/portal/index.ts').then(m => ({ default: m.PortalLoginPage })));
const PortalDashboardPage = lazy(() => import('@/features/portal/index.ts').then(m => ({ default: m.PortalDashboardPage })));
const PortalWorkOrdersPage = lazy(() => import('@/features/portal/index.ts').then(m => ({ default: m.PortalWorkOrdersPage })));
const PortalInvoicesPage = lazy(() => import('@/features/portal/index.ts').then(m => ({ default: m.PortalInvoicesPage })));
const PortalRequestServicePage = lazy(() => import('@/features/portal/index.ts').then(m => ({ default: m.PortalRequestServicePage })));
const RequirePortalAuth = lazy(() => import('@/features/portal/index.ts').then(m => ({ default: m.RequirePortalAuth })));

// Loading spinner for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Lazy load feature modules for code splitting
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage.tsx').then(m => ({ default: m.DashboardPage })));
const ProspectsPage = lazy(() => import('@/features/prospects/ProspectsPage.tsx').then(m => ({ default: m.ProspectsPage })));
const ProspectDetailPage = lazy(() => import('@/features/prospects/ProspectDetailPage.tsx').then(m => ({ default: m.ProspectDetailPage })));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage.tsx').then(m => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('@/features/customers/CustomerDetailPage.tsx').then(m => ({ default: m.CustomerDetailPage })));
const TechniciansPage = lazy(() => import('@/features/technicians/TechniciansPage.tsx').then(m => ({ default: m.TechniciansPage })));
const TechnicianDetailPage = lazy(() => import('@/features/technicians/TechnicianDetailPage.tsx').then(m => ({ default: m.TechnicianDetailPage })));
const WorkOrdersPage = lazy(() => import('@/features/workorders/WorkOrdersPage.tsx').then(m => ({ default: m.WorkOrdersPage })));
const WorkOrderDetailPage = lazy(() => import('@/features/workorders/WorkOrderDetailPage.tsx').then(m => ({ default: m.WorkOrderDetailPage })));
const SchedulePage = lazy(() => import('@/features/schedule/SchedulePage.tsx').then(m => ({ default: m.SchedulePage })));

// Marketing routes - lazy loaded
const MarketingHubPage = lazy(() => import('@/features/marketing/MarketingHubPage.tsx').then(m => ({ default: m.MarketingHubPage })));
const GoogleAdsPage = lazy(() => import('@/features/marketing/google-ads/GoogleAdsPage.tsx').then(m => ({ default: m.GoogleAdsPage })));
const ReviewsPage = lazy(() => import('@/features/marketing/reviews/ReviewsPage.tsx').then(m => ({ default: m.ReviewsPage })));
const AIContentPage = lazy(() => import('@/features/marketing/ai-content/AIContentPage.tsx').then(m => ({ default: m.AIContentPage })));
const EmailMarketingPage = lazy(() => import('@/features/email-marketing/EmailMarketingPage.tsx').then(m => ({ default: m.EmailMarketingPage })));

// Reports - lazy loaded
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage.tsx').then(m => ({ default: m.ReportsPage })));
const RevenueReport = lazy(() => import('@/features/reports/pages/RevenueReport.tsx').then(m => ({ default: m.RevenueReport })));
const TechnicianPerformance = lazy(() => import('@/features/reports/pages/TechnicianPerformance.tsx').then(m => ({ default: m.TechnicianPerformance })));

// Other features - lazy loaded
const EquipmentPage = lazy(() => import('@/features/equipment/EquipmentPage.tsx').then(m => ({ default: m.EquipmentPage })));
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage.tsx').then(m => ({ default: m.InventoryPage })));
const TicketsPage = lazy(() => import('@/features/tickets/TicketsPage.tsx').then(m => ({ default: m.TicketsPage })));
const TicketDetailPage = lazy(() => import('@/features/tickets/TicketDetailPage.tsx').then(m => ({ default: m.TicketDetailPage })));
const FleetMapPage = lazy(() => import('@/features/fleet/index.ts').then(m => ({ default: m.FleetMapPage })));
const IntegrationsPage = lazy(() => import('@/features/integrations/index.ts').then(m => ({ default: m.IntegrationsPage })));
const InvoicesPage = lazy(() => import('@/features/invoicing/InvoicesPage.tsx').then(m => ({ default: m.InvoicesPage })));
const InvoiceDetailPage = lazy(() => import('@/features/invoicing/InvoiceDetailPage.tsx').then(m => ({ default: m.InvoiceDetailPage })));
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage.tsx').then(m => ({ default: m.PaymentsPage })));
const UsersPage = lazy(() => import('@/features/users/UsersPage.tsx').then(m => ({ default: m.UsersPage })));
const AdminSettingsPage = lazy(() => import('@/features/admin/AdminSettingsPage.tsx').then(m => ({ default: m.AdminSettingsPage })));

// Predictive Maintenance - lazy loaded
const PredictiveMaintenancePage = lazy(() => import('@/features/predictive-maintenance/index.ts').then(m => ({ default: m.PredictiveMaintenancePage })));

// Notifications - lazy loaded
const NotificationsListPage = lazy(() => import('@/features/notifications/index.ts').then(m => ({ default: m.NotificationsListPage })));
const NotificationSettingsPage = lazy(() => import('@/features/notifications/index.ts').then(m => ({ default: m.NotificationSettingsPage })));

// SMS - lazy loaded
const SMSSettingsPage = lazy(() => import('@/features/sms/index.ts').then(m => ({ default: m.SMSSettingsPage })));

// Service Intervals - lazy loaded
const ServiceIntervalsPage = lazy(() => import('@/features/service-intervals/index.ts').then(m => ({ default: m.ServiceIntervalsPage })));

// Employee Portal & Payroll - lazy loaded
const EmployeePortalPage = lazy(() => import('@/features/employee/EmployeePortalPage.tsx').then(m => ({ default: m.EmployeePortalPage })));
const PayrollPage = lazy(() => import('@/features/payroll/PayrollPage.tsx').then(m => ({ default: m.PayrollPage })));

// Phone/Communications - lazy loaded
const PhonePage = lazy(() => import('@/features/phone/index.ts').then(m => ({ default: m.PhonePage })));

// Calls/Call Center - lazy loaded
const CallsPage = lazy(() => import('@/features/calls/index.ts').then(m => ({ default: m.CallsPage })));

// Compliance - lazy loaded
const ComplianceDashboard = lazy(() => import('@/features/compliance/index.ts').then(m => ({ default: m.ComplianceDashboard })));

/**
 * App routes - standalone deployment at root
 * Uses React.lazy() for code splitting - each feature loads on demand
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public login route at /app/login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Customer Portal routes at /portal */}
      <Route path="/portal/login" element={<Suspense fallback={<PageLoader />}><PortalLoginPage /></Suspense>} />
      <Route
        path="/portal"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequirePortalAuth>
              <PortalLayout />
            </RequirePortalAuth>
          </Suspense>
        }
      >
        <Route index element={<Suspense fallback={<PageLoader />}><PortalDashboardPage /></Suspense>} />
        <Route path="work-orders" element={<Suspense fallback={<PageLoader />}><PortalWorkOrdersPage /></Suspense>} />
        <Route path="invoices" element={<Suspense fallback={<PageLoader />}><PortalInvoicesPage /></Suspense>} />
        <Route path="request-service" element={<Suspense fallback={<PageLoader />}><PortalRequestServicePage /></Suspense>} />
      </Route>

      {/* Protected app routes at /* */}
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
        <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />

        {/* Prospects */}
        <Route path="prospects" element={<Suspense fallback={<PageLoader />}><ProspectsPage /></Suspense>} />
        <Route path="prospects/:id" element={<Suspense fallback={<PageLoader />}><ProspectDetailPage /></Suspense>} />

        {/* Customers */}
        <Route path="customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
        <Route path="customers/:id" element={<Suspense fallback={<PageLoader />}><CustomerDetailPage /></Suspense>} />

        {/* Technicians */}
        <Route path="technicians" element={<Suspense fallback={<PageLoader />}><TechniciansPage /></Suspense>} />
        <Route path="technicians/:id" element={<Suspense fallback={<PageLoader />}><TechnicianDetailPage /></Suspense>} />

        {/* Work Orders */}
        <Route path="work-orders" element={<Suspense fallback={<PageLoader />}><WorkOrdersPage /></Suspense>} />
        <Route path="work-orders/:id" element={<Suspense fallback={<PageLoader />}><WorkOrderDetailPage /></Suspense>} />

        {/* Schedule */}
        <Route path="schedule" element={<Suspense fallback={<PageLoader />}><SchedulePage /></Suspense>} />

        {/* Predictive Maintenance */}
        <Route path="predictive-maintenance" element={<Suspense fallback={<PageLoader />}><PredictiveMaintenancePage /></Suspense>} />

        {/* Marketing Hub */}
        <Route path="marketing" element={<Suspense fallback={<PageLoader />}><MarketingHubPage /></Suspense>} />
        <Route path="marketing/ads" element={<Suspense fallback={<PageLoader />}><GoogleAdsPage /></Suspense>} />
        <Route path="marketing/reviews" element={<Suspense fallback={<PageLoader />}><ReviewsPage /></Suspense>} />
        <Route path="marketing/ai-content" element={<Suspense fallback={<PageLoader />}><AIContentPage /></Suspense>} />

        {/* Email Marketing */}
        <Route path="email-marketing" element={<Suspense fallback={<PageLoader />}><EmailMarketingPage /></Suspense>} />

        {/* Reports */}
        <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
        <Route path="reports/revenue" element={<Suspense fallback={<PageLoader />}><RevenueReport /></Suspense>} />
        <Route path="reports/technicians" element={<Suspense fallback={<PageLoader />}><TechnicianPerformance /></Suspense>} />

        {/* Equipment */}
        <Route path="equipment" element={<Suspense fallback={<PageLoader />}><EquipmentPage /></Suspense>} />

        {/* Inventory */}
        <Route path="inventory" element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />

        {/* Tickets */}
        <Route path="tickets" element={<Suspense fallback={<PageLoader />}><TicketsPage /></Suspense>} />
        <Route path="tickets/:id" element={<Suspense fallback={<PageLoader />}><TicketDetailPage /></Suspense>} />

        {/* Fleet Tracking */}
        <Route path="fleet" element={<Suspense fallback={<PageLoader />}><FleetMapPage /></Suspense>} />

        {/* Integrations */}
        <Route path="integrations" element={<Suspense fallback={<PageLoader />}><IntegrationsPage /></Suspense>} />

        {/* Invoices */}
        <Route path="invoices" element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
        <Route path="invoices/:id" element={<Suspense fallback={<PageLoader />}><InvoiceDetailPage /></Suspense>} />

        {/* Payments */}
        <Route path="payments" element={<Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>} />

        {/* Users Management */}
        <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />

        {/* Admin Settings */}
        <Route path="admin" element={<Suspense fallback={<PageLoader />}><AdminSettingsPage /></Suspense>} />

        {/* Notifications */}
        <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsListPage /></Suspense>} />
        <Route path="settings/notifications" element={<Suspense fallback={<PageLoader />}><NotificationSettingsPage /></Suspense>} />

        {/* SMS */}
        <Route path="settings/sms" element={<Suspense fallback={<PageLoader />}><SMSSettingsPage /></Suspense>} />

        {/* Service Intervals */}
        <Route path="service-intervals" element={<Suspense fallback={<PageLoader />}><ServiceIntervalsPage /></Suspense>} />

        {/* Employee Portal - Mobile-first for field technicians */}
        <Route path="employee" element={<Suspense fallback={<PageLoader />}><EmployeePortalPage /></Suspense>} />

        {/* Payroll Management */}
        <Route path="payroll" element={<Suspense fallback={<PageLoader />}><PayrollPage /></Suspense>} />

        {/* Phone/Communications */}
        <Route path="phone" element={<Suspense fallback={<PageLoader />}><PhonePage /></Suspense>} />

        {/* Calls/Call Center */}
        <Route path="calls" element={<Suspense fallback={<PageLoader />}><CallsPage /></Suspense>} />

        {/* Compliance */}
        <Route path="compliance" element={<Suspense fallback={<PageLoader />}><ComplianceDashboard /></Suspense>} />

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
