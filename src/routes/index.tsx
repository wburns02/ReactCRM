import React, { lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout.tsx";
import { RequireAuth } from "@/features/auth/RequireAuth.tsx";
import { LoginPage } from "@/features/auth/LoginPage.tsx";

// Portal routes - lazy loaded
const PortalLayout = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalLayout,
  })),
);
const PortalLoginPage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalLoginPage,
  })),
);
const PortalDashboardPage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalDashboardPage,
  })),
);
const PortalWorkOrdersPage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalWorkOrdersPage,
  })),
);
const PortalInvoicesPage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalInvoicesPage,
  })),
);
const PortalRequestServicePage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalRequestServicePage,
  })),
);
const RequirePortalAuth = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.RequirePortalAuth,
  })),
);

// Public tracking page - lazy loaded (no auth required)
const CustomerTrackingPage = lazy(() =>
  import("@/features/tracking/index.ts").then((m) => ({
    default: m.CustomerTrackingPage,
  })),
);

// Tracking dashboard - lazy loaded
const TrackingDashboard = lazy(() =>
  import("@/features/tracking/index.ts").then((m) => ({
    default: m.TrackingDashboard,
  })),
);
const TechnicianTracker = lazy(() =>
  import("@/features/tracking/index.ts").then((m) => ({
    default: m.TechnicianTracker,
  })),
);

// ============================================================================
// NEW LAZY IMPORTS - FIELD SERVICE
// ============================================================================
const FieldLayout = lazy(() =>
  import("@/features/field/FieldLayout.tsx").then((m) => ({
    default: m.FieldLayout,
  })),
);
const MyJobsPage = lazy(() =>
  import("@/features/field/pages/MyJobsPage.tsx").then((m) => ({
    default: m.MyJobsPage,
  })),
);
const JobDetailPage = lazy(() =>
  import("@/features/field/pages/JobDetailPage.tsx").then((m) => ({
    default: m.JobDetailPage,
  })),
);
const JobCompletionFlow = lazy(() =>
  import("@/features/field/pages/JobCompletionFlow.tsx").then((m) => ({
    default: m.JobCompletionFlow,
  })),
);
const RouteView = lazy(() =>
  import("@/features/field/pages/RouteView.tsx").then((m) => ({
    default: m.RouteView,
  })),
);
const RouteDetail = lazy(() =>
  import("@/features/field/pages/RouteDetail.tsx").then((m) => ({
    default: m.RouteDetail,
  })),
);
const TechStatsPage = lazy(() =>
  import("@/features/field/pages/TechStatsPage.tsx").then((m) => ({
    default: m.TechStatsPage,
  })),
);
const TechProfilePage = lazy(() =>
  import("@/features/field/pages/TechProfilePage.tsx").then((m) => ({
    default: m.TechProfilePage,
  })),
);

// ============================================================================
// NEW LAZY IMPORTS - COMMUNICATIONS
// ============================================================================
const CommunicationsOverview = lazy(() =>
  import("@/features/communications/pages/CommunicationsOverview.tsx").then(
    (m) => ({ default: m.CommunicationsOverview }),
  ),
);
const SMSInbox = lazy(() =>
  import("@/features/communications/pages/SMSInbox.tsx").then((m) => ({
    default: m.SMSInbox,
  })),
);
const SMSConversation = lazy(() =>
  import("@/features/communications/pages/SMSConversation.tsx").then((m) => ({
    default: m.SMSConversation,
  })),
);
const EmailInbox = lazy(() =>
  import("@/features/communications/pages/EmailInbox.tsx").then((m) => ({
    default: m.EmailInbox,
  })),
);
const EmailConversation = lazy(() =>
  import("@/features/communications/pages/EmailConversation.tsx").then((m) => ({
    default: m.EmailConversation,
  })),
);
const AllTemplates = lazy(() =>
  import("@/features/communications/pages/AllTemplates.tsx").then((m) => ({
    default: m.AllTemplates,
  })),
);
const SMSTemplates = lazy(() =>
  import("@/features/communications/pages/SMSTemplates.tsx").then((m) => ({
    default: m.SMSTemplates,
  })),
);
const EmailTemplates = lazy(() =>
  import("@/features/communications/pages/EmailTemplates.tsx").then((m) => ({
    default: m.EmailTemplates,
  })),
);
const ReminderConfig = lazy(() =>
  import("@/features/communications/pages/ReminderConfig.tsx").then((m) => ({
    default: m.ReminderConfig,
  })),
);
const ReminderDetail = lazy(() =>
  import("@/features/communications/pages/ReminderDetail.tsx").then((m) => ({
    default: m.ReminderDetail,
  })),
);

// ============================================================================
// NEW LAZY IMPORTS - BILLING
// ============================================================================
const BillingOverview = lazy(() =>
  import("@/features/billing/pages/BillingOverview.tsx").then((m) => ({
    default: m.BillingOverview,
  })),
);
const EstimatesPage = lazy(() =>
  import("@/features/billing/pages/EstimatesPage.tsx").then((m) => ({
    default: m.EstimatesPage,
  })),
);
const EstimateDetailPage = lazy(() =>
  import("@/features/billing/pages/EstimateDetailPage.tsx").then((m) => ({
    default: m.EstimateDetailPage,
  })),
);
const PaymentPlansPage = lazy(() =>
  import("@/features/billing/pages/PaymentPlansPage.tsx").then((m) => ({
    default: m.PaymentPlansPage,
  })),
);
const PaymentPlanDetailPage = lazy(() =>
  import("@/features/billing/pages/PaymentPlanDetailPage.tsx").then((m) => ({
    default: m.PaymentPlanDetailPage,
  })),
);
const PublicPaymentPage = lazy(() =>
  import("@/features/billing/pages/PublicPaymentPage.tsx").then((m) => ({
    default: m.PublicPaymentPage,
  })),
);
const InvoiceCreatePage = lazy(() =>
  import("@/features/invoicing/InvoiceCreatePage.tsx").then((m) => ({
    default: m.InvoiceCreatePage,
  })),
);

// ============================================================================
// NEW LAZY IMPORTS - WORK ORDERS VIEWS
// ============================================================================
const CalendarView = lazy(() =>
  import("@/features/workorders/views/CalendarView.tsx").then((m) => ({
    default: m.CalendarView,
  })),
);
const KanbanBoard = lazy(() =>
  import("@/features/workorders/views/KanbanBoard.tsx").then((m) => ({
    default: m.KanbanBoard,
  })),
);
const MapView = lazy(() =>
  import("@/features/workorders/views/MapView.tsx").then((m) => ({
    default: m.MapView,
  })),
);

// Loading spinner for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Widget wrapper that parses URL params and passes to child widget
function WidgetWrapper({ children }: { children: React.ReactElement }) {
  const [searchParams] = useSearchParams();

  // Parse all URL params into props
  const widgetProps: Record<string, string | number | boolean> = {};
  searchParams.forEach((value, key) => {
    // Try to parse as number or boolean
    if (value === "true") widgetProps[key] = true;
    else if (value === "false") widgetProps[key] = false;
    else if (!isNaN(Number(value)) && value !== "")
      widgetProps[key] = Number(value);
    else widgetProps[key] = value;
  });

  // Clone child with parsed props
  return (
    <div className="min-h-screen bg-bg-body p-4 flex items-center justify-center">
      {React.cloneElement(children, widgetProps)}
    </div>
  );
}

// Lazy load feature modules for code splitting
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage.tsx").then((m) => ({
    default: m.DashboardPage,
  })),
);
const CommandCenter = lazy(() =>
  import("@/features/dashboard/CommandCenter.tsx").then((m) => ({
    default: m.CommandCenter,
  })),
);
const ProspectsPage = lazy(() =>
  import("@/features/prospects/ProspectsPage.tsx").then((m) => ({
    default: m.ProspectsPage,
  })),
);
const ProspectDetailPage = lazy(() =>
  import("@/features/prospects/ProspectDetailPage.tsx").then((m) => ({
    default: m.ProspectDetailPage,
  })),
);
const CustomersPage = lazy(() =>
  import("@/features/customers/CustomersPage.tsx").then((m) => ({
    default: m.CustomersPage,
  })),
);
const CustomerDetailPage = lazy(() =>
  import("@/features/customers/CustomerDetailPage.tsx").then((m) => ({
    default: m.CustomerDetailPage,
  })),
);
const TechniciansPage = lazy(() =>
  import("@/features/technicians/TechniciansPage.tsx").then((m) => ({
    default: m.TechniciansPage,
  })),
);
const TechnicianDetailPage = lazy(() =>
  import("@/features/technicians/TechnicianDetailPage.tsx").then((m) => ({
    default: m.TechnicianDetailPage,
  })),
);
const WorkOrdersPage = lazy(() =>
  import("@/features/workorders/WorkOrdersPage.tsx").then((m) => ({
    default: m.WorkOrdersPage,
  })),
);
const WorkOrderDetailPage = lazy(() =>
  import("@/features/workorders/WorkOrderDetailPage.tsx").then((m) => ({
    default: m.WorkOrderDetailPage,
  })),
);
const SchedulePage = lazy(() =>
  import("@/features/schedule/SchedulePage.tsx").then((m) => ({
    default: m.SchedulePage,
  })),
);

// Marketing routes - lazy loaded
const MarketingHubPage = lazy(() =>
  import("@/features/marketing/MarketingHubPage.tsx").then((m) => ({
    default: m.MarketingHubPage,
  })),
);
const GoogleAdsPage = lazy(() =>
  import("@/features/marketing/google-ads/GoogleAdsPage.tsx").then((m) => ({
    default: m.GoogleAdsPage,
  })),
);
const ReviewsPage = lazy(() =>
  import("@/features/marketing/reviews/ReviewsPage.tsx").then((m) => ({
    default: m.ReviewsPage,
  })),
);
const AIContentPage = lazy(() =>
  import("@/features/marketing/ai-content/AIContentPage.tsx").then((m) => ({
    default: m.AIContentPage,
  })),
);
const EmailMarketingPage = lazy(() =>
  import("@/features/email-marketing/EmailMarketingPage.tsx").then((m) => ({
    default: m.EmailMarketingPage,
  })),
);

// Reports - lazy loaded
const ReportsPage = lazy(() =>
  import("@/features/reports/pages/ReportsPage.tsx").then((m) => ({
    default: m.ReportsPage,
  })),
);
const RevenueReport = lazy(() =>
  import("@/features/reports/pages/RevenueReport.tsx").then((m) => ({
    default: m.RevenueReport,
  })),
);
const TechnicianPerformance = lazy(() =>
  import("@/features/reports/pages/TechnicianPerformance.tsx").then((m) => ({
    default: m.TechnicianPerformance,
  })),
);
const CLVReportPage = lazy(() =>
  import("@/features/reports/pages/CLVReportPage.tsx").then((m) => ({
    default: m.CLVReportPage,
  })),
);
const ServiceReportPage = lazy(() =>
  import("@/features/reports/pages/ServiceReportPage.tsx").then((m) => ({
    default: m.ServiceReportPage,
  })),
);
const LocationReportPage = lazy(() =>
  import("@/features/reports/pages/LocationReportPage.tsx").then((m) => ({
    default: m.LocationReportPage,
  })),
);

// Analytics - lazy loaded
const FTFRDashboard = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.FTFRDashboard,
  })),
);
const BIDashboard = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.BIDashboard,
  })),
);
const OperationsCommandCenter = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.OperationsCommandCenter,
  })),
);
const FinancialDashboard = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.FinancialDashboard,
  })),
);
const PerformanceScorecard = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.PerformanceScorecard,
  })),
);
const AIInsightsPanel = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.AIInsightsPanel,
  })),
);

// Enterprise - lazy loaded
const MultiRegionDashboard = lazy(() =>
  import("@/features/enterprise/index.ts").then((m) => ({
    default: m.MultiRegionDashboard,
  })),
);
const FranchiseManagement = lazy(() =>
  import("@/features/enterprise/index.ts").then((m) => ({
    default: m.FranchiseManagement,
  })),
);
const RolePermissions = lazy(() =>
  import("@/features/enterprise/index.ts").then((m) => ({
    default: m.RolePermissions,
  })),
);
const EnterpriseComplianceDashboard = lazy(() =>
  import("@/features/enterprise/index.ts").then((m) => ({
    default: m.ComplianceDashboard,
  })),
);

// Other features - lazy loaded
const EquipmentPage = lazy(() =>
  import("@/features/equipment/EquipmentPage.tsx").then((m) => ({
    default: m.EquipmentPage,
  })),
);
const EquipmentHealthPage = lazy(() =>
  import("@/features/equipment/index.ts").then((m) => ({
    default: m.EquipmentHealthPage,
  })),
);
const InventoryPage = lazy(() =>
  import("@/features/inventory/InventoryPage.tsx").then((m) => ({
    default: m.InventoryPage,
  })),
);
const TicketsPage = lazy(() =>
  import("@/features/tickets/TicketsPage.tsx").then((m) => ({
    default: m.TicketsPage,
  })),
);
const TicketDetailPage = lazy(() =>
  import("@/features/tickets/TicketDetailPage.tsx").then((m) => ({
    default: m.TicketDetailPage,
  })),
);
const FleetMapPage = lazy(() =>
  import("@/features/fleet/index.ts").then((m) => ({
    default: m.FleetMapPage,
  })),
);
const IntegrationsPage = lazy(() =>
  import("@/features/integrations/index.ts").then((m) => ({
    default: m.IntegrationsPage,
  })),
);
const InvoicesPage = lazy(() =>
  import("@/features/invoicing/InvoicesPage.tsx").then((m) => ({
    default: m.InvoicesPage,
  })),
);
const InvoiceDetailPage = lazy(() =>
  import("@/features/invoicing/InvoiceDetailPage.tsx").then((m) => ({
    default: m.InvoiceDetailPage,
  })),
);
const PaymentsPage = lazy(() =>
  import("@/features/payments/PaymentsPage.tsx").then((m) => ({
    default: m.PaymentsPage,
  })),
);
const UsersPage = lazy(() =>
  import("@/features/users/UsersPage.tsx").then((m) => ({
    default: m.UsersPage,
  })),
);
const AdminSettingsPage = lazy(() =>
  import("@/features/admin/AdminSettingsPage.tsx").then((m) => ({
    default: m.AdminSettingsPage,
  })),
);

// Predictive Maintenance - lazy loaded
const PredictiveMaintenancePage = lazy(() =>
  import("@/features/predictive-maintenance/index.ts").then((m) => ({
    default: m.PredictiveMaintenancePage,
  })),
);

// Notifications - lazy loaded
const NotificationsListPage = lazy(() =>
  import("@/features/notifications/index.ts").then((m) => ({
    default: m.NotificationsListPage,
  })),
);
const NotificationSettingsPage = lazy(() =>
  import("@/features/notifications/index.ts").then((m) => ({
    default: m.NotificationSettingsPage,
  })),
);

// SMS - lazy loaded
const SMSSettingsPage = lazy(() =>
  import("@/features/sms/index.ts").then((m) => ({
    default: m.SMSSettingsPage,
  })),
);

// Service Intervals - lazy loaded
const ServiceIntervalsPage = lazy(() =>
  import("@/features/service-intervals/index.ts").then((m) => ({
    default: m.ServiceIntervalsPage,
  })),
);

// Employee Portal & Payroll - lazy loaded
const EmployeePortalPage = lazy(() =>
  import("@/features/employee/EmployeePortalPage.tsx").then((m) => ({
    default: m.EmployeePortalPage,
  })),
);
const PayrollPage = lazy(() =>
  import("@/features/payroll/PayrollPage.tsx").then((m) => ({
    default: m.PayrollPage,
  })),
);

// Phone/Communications - lazy loaded
const PhonePage = lazy(() =>
  import("@/features/phone/index.ts").then((m) => ({ default: m.PhonePage })),
);

// AI Assistant - lazy loaded
const AIAssistantPage = lazy(() =>
  import("@/features/ai-assistant/index.ts").then((m) => ({
    default: m.AIAssistantPage,
  })),
);

// Call Intelligence Dashboard - lazy loaded
const CallIntelligenceDashboard = lazy(() =>
  import("@/features/call-intelligence/index.ts").then((m) => ({
    default: m.CallIntelligenceDashboard,
  })),
);

// National Septic Permit Database - lazy loaded
const PermitsPage = lazy(() =>
  import("@/features/permits/index.ts").then((m) => ({
    default: m.PermitsPage,
  })),
);
const PermitDetailPage = lazy(() =>
  import("@/features/permits/index.ts").then((m) => ({
    default: m.PermitDetailPage,
  })),
);

// Calls/Call Center - lazy loaded
const CallsPage = lazy(() =>
  import("@/features/calls/index.ts").then((m) => ({ default: m.CallsPage })),
);

// Compliance - lazy loaded
const ComplianceDashboard = lazy(() =>
  import("@/features/compliance/index.ts").then((m) => ({
    default: m.ComplianceDashboard,
  })),
);

// Contracts - lazy loaded
const ContractsPage = lazy(() =>
  import("@/features/contracts/index.ts").then((m) => ({
    default: m.ContractsPage,
  })),
);

// Customer Success - lazy loaded
const CustomerSuccessPage = lazy(() =>
  import("@/features/customer-success/index.ts").then((m) => ({
    default: m.CustomerSuccessPage,
  })),
);

// Time Tracking - lazy loaded
const TimesheetsPage = lazy(() =>
  import("@/features/time-tracking/index.ts").then((m) => ({
    default: m.TimesheetsPage,
  })),
);

// Job Costing - lazy loaded
const JobCostingPage = lazy(() =>
  import("@/features/job-costing/index.ts").then((m) => ({
    default: m.JobCostingPage,
  })),
);

// Data Import - lazy loaded
const DataImportPage = lazy(() =>
  import("@/features/import/index.ts").then((m) => ({
    default: m.DataImportPage,
  })),
);

// Embeddable Widgets - lazy loaded
const BookingWidget = lazy(() =>
  import("@/features/widgets/index.ts").then((m) => ({
    default: m.BookingWidget,
  })),
);
const PaymentWidget = lazy(() =>
  import("@/features/widgets/index.ts").then((m) => ({
    default: m.PaymentWidget,
  })),
);
const StatusWidget = lazy(() =>
  import("@/features/widgets/index.ts").then((m) => ({
    default: m.StatusWidget,
  })),
);

// Marketplace - lazy loaded
const MarketplacePage = lazy(() =>
  import("@/features/marketplace/index.ts").then((m) => ({
    default: m.MarketplacePage,
  })),
);

// GPS Tracking - lazy loaded

// Onboarding - lazy loaded
const OnboardingWizard = lazy(() =>
  import("@/features/onboarding/index.ts").then((m) => ({
    default: m.OnboardingWizard,
  })),
);
const SetupWizard = lazy(() =>
  import("@/features/onboarding/index.ts").then((m) => ({
    default: m.SetupWizard,
  })),
);
const HelpCenter = lazy(() =>
  import("@/features/onboarding/index.ts").then((m) => ({
    default: m.HelpCenter,
  })),
);

/**
 * App routes - standalone deployment at root
 * Uses React.lazy() for code splitting - each feature loads on demand
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public login route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Public embeddable widget routes */}
      <Route
        path="/embed/booking"
        element={
          <Suspense fallback={<PageLoader />}>
            <WidgetWrapper>
              <BookingWidget companyId="" />
            </WidgetWrapper>
          </Suspense>
        }
      />
      <Route
        path="/embed/payment"
        element={
          <Suspense fallback={<PageLoader />}>
            <WidgetWrapper>
              <PaymentWidget companyId="" />
            </WidgetWrapper>
          </Suspense>
        }
      />
      <Route
        path="/embed/status"
        element={
          <Suspense fallback={<PageLoader />}>
            <WidgetWrapper>
              <StatusWidget companyId="" />
            </WidgetWrapper>
          </Suspense>
        }
      />

      {/* Public Customer Tracking - no auth required */}
      <Route
        path="/track/:token"
        element={
          <Suspense fallback={<PageLoader />}>
            <CustomerTrackingPage />
          </Suspense>
        }
      />

      {/* Public Payment Page - no auth required */}
      <Route
        path="/pay/:token"
        element={
          <Suspense fallback={<PageLoader />}>
            <PublicPaymentPage />
          </Suspense>
        }
      />

      {/* Onboarding wizard for new users */}
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Suspense fallback={<PageLoader />}>
              <OnboardingWizard />
            </Suspense>
          </RequireAuth>
        }
      />

      {/* Customer Portal routes at /portal */}
      <Route
        path="/portal/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <PortalLoginPage />
          </Suspense>
        }
      />
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
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <PortalDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="work-orders"
          element={
            <Suspense fallback={<PageLoader />}>
              <PortalWorkOrdersPage />
            </Suspense>
          }
        />
        <Route
          path="invoices"
          element={
            <Suspense fallback={<PageLoader />}>
              <PortalInvoicesPage />
            </Suspense>
          }
        />
        <Route
          path="request-service"
          element={
            <Suspense fallback={<PageLoader />}>
              <PortalRequestServicePage />
            </Suspense>
          }
        />
      </Route>

      {/* Field Service Routes - Mobile Technician Experience */}
      <Route
        path="/field"
        element={
          <RequireAuth>
            <Suspense fallback={<PageLoader />}>
              <FieldLayout />
            </Suspense>
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <MyJobsPage />
            </Suspense>
          }
        />
        <Route
          path="job/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <JobDetailPage />
            </Suspense>
          }
        />
        <Route
          path="job/:id/complete"
          element={
            <Suspense fallback={<PageLoader />}>
              <JobCompletionFlow />
            </Suspense>
          }
        />
        <Route
          path="route"
          element={
            <Suspense fallback={<PageLoader />}>
              <RouteView />
            </Suspense>
          }
        />
        <Route
          path="route/:jobId"
          element={
            <Suspense fallback={<PageLoader />}>
              <RouteDetail />
            </Suspense>
          }
        />
        <Route
          path="stats"
          element={
            <Suspense fallback={<PageLoader />}>
              <TechStatsPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<PageLoader />}>
              <TechProfilePage />
            </Suspense>
          }
        />
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
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="command-center"
          element={
            <Suspense fallback={<PageLoader />}>
              <CommandCenter />
            </Suspense>
          }
        />

        {/* Prospects */}
        <Route
          path="prospects"
          element={
            <Suspense fallback={<PageLoader />}>
              <ProspectsPage />
            </Suspense>
          }
        />
        <Route
          path="prospects/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <ProspectDetailPage />
            </Suspense>
          }
        />

        {/* Customers */}
        <Route
          path="customers"
          element={
            <Suspense fallback={<PageLoader />}>
              <CustomersPage />
            </Suspense>
          }
        />
        <Route
          path="customers/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <CustomerDetailPage />
            </Suspense>
          }
        />

        {/* Technicians */}
        <Route
          path="technicians"
          element={
            <Suspense fallback={<PageLoader />}>
              <TechniciansPage />
            </Suspense>
          }
        />
        <Route
          path="technicians/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <TechnicianDetailPage />
            </Suspense>
          }
        />

        {/* Work Orders */}
        <Route
          path="work-orders"
          element={
            <Suspense fallback={<PageLoader />}>
              <WorkOrdersPage />
            </Suspense>
          }
        />
        <Route
          path="work-orders/calendar"
          element={
            <Suspense fallback={<PageLoader />}>
              <CalendarView />
            </Suspense>
          }
        />
        <Route
          path="work-orders/board"
          element={
            <Suspense fallback={<PageLoader />}>
              <KanbanBoard />
            </Suspense>
          }
        />
        <Route
          path="work-orders/map"
          element={
            <Suspense fallback={<PageLoader />}>
              <MapView />
            </Suspense>
          }
        />
        <Route
          path="work-orders/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <WorkOrderDetailPage />
            </Suspense>
          }
        />

        {/* Schedule */}
        <Route
          path="schedule"
          element={
            <Suspense fallback={<PageLoader />}>
              <SchedulePage />
            </Suspense>
          }
        />

        {/* Predictive Maintenance */}
        <Route
          path="predictive-maintenance"
          element={
            <Suspense fallback={<PageLoader />}>
              <PredictiveMaintenancePage />
            </Suspense>
          }
        />

        {/* Marketing Hub */}
        <Route
          path="marketing"
          element={
            <Suspense fallback={<PageLoader />}>
              <MarketingHubPage />
            </Suspense>
          }
        />
        <Route
          path="marketing/ads"
          element={
            <Suspense fallback={<PageLoader />}>
              <GoogleAdsPage />
            </Suspense>
          }
        />
        <Route
          path="marketing/reviews"
          element={
            <Suspense fallback={<PageLoader />}>
              <ReviewsPage />
            </Suspense>
          }
        />
        <Route
          path="marketing/ai-content"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIContentPage />
            </Suspense>
          }
        />

        {/* Email Marketing */}
        <Route
          path="email-marketing"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailMarketingPage />
            </Suspense>
          }
        />

        {/* Reports */}
        <Route
          path="reports"
          element={
            <Suspense fallback={<PageLoader />}>
              <ReportsPage />
            </Suspense>
          }
        />
        <Route
          path="reports/revenue"
          element={
            <Suspense fallback={<PageLoader />}>
              <RevenueReport />
            </Suspense>
          }
        />
        <Route
          path="reports/technicians"
          element={
            <Suspense fallback={<PageLoader />}>
              <TechnicianPerformance />
            </Suspense>
          }
        />
        <Route
          path="reports/clv"
          element={
            <Suspense fallback={<PageLoader />}>
              <CLVReportPage />
            </Suspense>
          }
        />
        <Route
          path="reports/service"
          element={
            <Suspense fallback={<PageLoader />}>
              <ServiceReportPage />
            </Suspense>
          }
        />
        <Route
          path="reports/location"
          element={
            <Suspense fallback={<PageLoader />}>
              <LocationReportPage />
            </Suspense>
          }
        />

        {/* Analytics */}
        <Route
          path="analytics/ftfr"
          element={
            <Suspense fallback={<PageLoader />}>
              <FTFRDashboard />
            </Suspense>
          }
        />
        <Route
          path="analytics/bi"
          element={
            <Suspense fallback={<PageLoader />}>
              <BIDashboard />
            </Suspense>
          }
        />
        <Route
          path="analytics/operations"
          element={
            <Suspense fallback={<PageLoader />}>
              <OperationsCommandCenter />
            </Suspense>
          }
        />
        <Route
          path="analytics/financial"
          element={
            <Suspense fallback={<PageLoader />}>
              <FinancialDashboard />
            </Suspense>
          }
        />
        <Route
          path="analytics/performance"
          element={
            <Suspense fallback={<PageLoader />}>
              <PerformanceScorecard />
            </Suspense>
          }
        />
        <Route
          path="analytics/insights"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIInsightsPanel />
            </Suspense>
          }
        />

        {/* Enterprise */}
        <Route
          path="enterprise/regions"
          element={
            <Suspense fallback={<PageLoader />}>
              <MultiRegionDashboard />
            </Suspense>
          }
        />
        <Route
          path="enterprise/franchises"
          element={
            <Suspense fallback={<PageLoader />}>
              <FranchiseManagement />
            </Suspense>
          }
        />
        <Route
          path="enterprise/permissions"
          element={
            <Suspense fallback={<PageLoader />}>
              <RolePermissions />
            </Suspense>
          }
        />
        <Route
          path="enterprise/compliance"
          element={
            <Suspense fallback={<PageLoader />}>
              <EnterpriseComplianceDashboard />
            </Suspense>
          }
        />

        {/* Equipment */}
        <Route
          path="equipment"
          element={
            <Suspense fallback={<PageLoader />}>
              <EquipmentPage />
            </Suspense>
          }
        />
        <Route
          path="equipment/health"
          element={
            <Suspense fallback={<PageLoader />}>
              <EquipmentHealthPage />
            </Suspense>
          }
        />

        {/* Inventory */}
        <Route
          path="inventory"
          element={
            <Suspense fallback={<PageLoader />}>
              <InventoryPage />
            </Suspense>
          }
        />

        {/* Tickets */}
        <Route
          path="tickets"
          element={
            <Suspense fallback={<PageLoader />}>
              <TicketsPage />
            </Suspense>
          }
        />
        <Route
          path="tickets/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <TicketDetailPage />
            </Suspense>
          }
        />

        {/* GPS Tracking - Real-Time Technician Tracking */}
        <Route
          path="tracking"
          element={
            <Suspense fallback={<PageLoader />}>
              <TrackingDashboard />
            </Suspense>
          }
        />
        <Route
          path="tracking/dispatch"
          element={
            <Suspense fallback={<PageLoader />}>
              <TechnicianTracker />
            </Suspense>
          }
        />

        {/* Fleet Tracking */}
        <Route
          path="fleet"
          element={
            <Suspense fallback={<PageLoader />}>
              <FleetMapPage />
            </Suspense>
          }
        />

        {/* Integrations */}
        <Route
          path="integrations"
          element={
            <Suspense fallback={<PageLoader />}>
              <IntegrationsPage />
            </Suspense>
          }
        />

        {/* Invoices */}
        <Route
          path="invoices"
          element={
            <Suspense fallback={<PageLoader />}>
              <InvoicesPage />
            </Suspense>
          }
        />
        <Route
          path="invoices/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <InvoiceDetailPage />
            </Suspense>
          }
        />

        {/* Payments */}
        <Route
          path="payments"
          element={
            <Suspense fallback={<PageLoader />}>
              <PaymentsPage />
            </Suspense>
          }
        />

        {/* Billing - Estimates & Payment Plans */}
        <Route
          path="estimates"
          element={
            <Suspense fallback={<PageLoader />}>
              <EstimatesPage />
            </Suspense>
          }
        />
        <Route
          path="estimates/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <EstimateDetailPage />
            </Suspense>
          }
        />
        <Route
          path="invoices/new"
          element={
            <Suspense fallback={<PageLoader />}>
              <InvoiceCreatePage />
            </Suspense>
          }
        />
        <Route
          path="billing/overview"
          element={
            <Suspense fallback={<PageLoader />}>
              <BillingOverview />
            </Suspense>
          }
        />
        <Route
          path="billing/payment-plans"
          element={
            <Suspense fallback={<PageLoader />}>
              <PaymentPlansPage />
            </Suspense>
          }
        />
        <Route
          path="billing/payment-plans/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <PaymentPlanDetailPage />
            </Suspense>
          }
        />

        {/* Users Management */}
        <Route
          path="users"
          element={
            <Suspense fallback={<PageLoader />}>
              <UsersPage />
            </Suspense>
          }
        />

        {/* Admin Settings */}
        <Route
          path="admin"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminSettingsPage />
            </Suspense>
          }
        />

        {/* Notifications */}
        <Route
          path="notifications"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotificationsListPage />
            </Suspense>
          }
        />
        <Route
          path="settings/notifications"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotificationSettingsPage />
            </Suspense>
          }
        />

        {/* SMS */}
        <Route
          path="settings/sms"
          element={
            <Suspense fallback={<PageLoader />}>
              <SMSSettingsPage />
            </Suspense>
          }
        />

        {/* Service Intervals */}
        <Route
          path="service-intervals"
          element={
            <Suspense fallback={<PageLoader />}>
              <ServiceIntervalsPage />
            </Suspense>
          }
        />

        {/* Employee Portal - Mobile-first for field technicians */}
        <Route
          path="employee"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmployeePortalPage />
            </Suspense>
          }
        />

        {/* Payroll Management */}
        <Route
          path="payroll"
          element={
            <Suspense fallback={<PageLoader />}>
              <PayrollPage />
            </Suspense>
          }
        />

        {/* Phone/Communications */}
        <Route
          path="phone"
          element={
            <Suspense fallback={<PageLoader />}>
              <PhonePage />
            </Suspense>
          }
        />

        {/* Calls/Call Center */}
        <Route
          path="calls"
          element={
            <Suspense fallback={<PageLoader />}>
              <CallsPage />
            </Suspense>
          }
        />

        {/* Communications - Unified Inbox & Messaging */}
        <Route
          path="communications"
          element={
            <Suspense fallback={<PageLoader />}>
              <CommunicationsOverview />
            </Suspense>
          }
        />
        <Route
          path="communications/sms"
          element={
            <Suspense fallback={<PageLoader />}>
              <SMSInbox />
            </Suspense>
          }
        />
        <Route
          path="communications/sms/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <SMSConversation />
            </Suspense>
          }
        />
        <Route
          path="communications/email-inbox"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailInbox />
            </Suspense>
          }
        />
        <Route
          path="communications/email-inbox/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailConversation />
            </Suspense>
          }
        />
        <Route
          path="communications/templates"
          element={
            <Suspense fallback={<PageLoader />}>
              <AllTemplates />
            </Suspense>
          }
        />
        <Route
          path="communications/templates/sms"
          element={
            <Suspense fallback={<PageLoader />}>
              <SMSTemplates />
            </Suspense>
          }
        />
        <Route
          path="communications/templates/email"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmailTemplates />
            </Suspense>
          }
        />
        <Route
          path="communications/reminders"
          element={
            <Suspense fallback={<PageLoader />}>
              <ReminderConfig />
            </Suspense>
          }
        />
        <Route
          path="communications/reminders/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <ReminderDetail />
            </Suspense>
          }
        />

        {/* Compliance */}
        <Route
          path="compliance"
          element={
            <Suspense fallback={<PageLoader />}>
              <ComplianceDashboard />
            </Suspense>
          }
        />

        {/* Contracts */}
        <Route
          path="contracts"
          element={
            <Suspense fallback={<PageLoader />}>
              <ContractsPage />
            </Suspense>
          }
        />

        {/* Customer Success */}
        <Route
          path="customer-success"
          element={
            <Suspense fallback={<PageLoader />}>
              <CustomerSuccessPage />
            </Suspense>
          }
        />

        {/* Timesheets */}
        <Route
          path="timesheets"
          element={
            <Suspense fallback={<PageLoader />}>
              <TimesheetsPage />
            </Suspense>
          }
        />

        {/* Job Costing */}
        <Route
          path="job-costing"
          element={
            <Suspense fallback={<PageLoader />}>
              <JobCostingPage />
            </Suspense>
          }
        />

        {/* Data Import */}
        <Route
          path="admin/import"
          element={
            <Suspense fallback={<PageLoader />}>
              <DataImportPage />
            </Suspense>
          }
        />

        {/* Help & Support */}
        <Route
          path="help"
          element={
            <Suspense fallback={<PageLoader />}>
              <HelpCenter />
            </Suspense>
          }
        />
        <Route
          path="setup"
          element={
            <Suspense fallback={<PageLoader />}>
              <SetupWizard />
            </Suspense>
          }
        />

        {/* Marketplace */}
        <Route
          path="marketplace"
          element={
            <Suspense fallback={<PageLoader />}>
              <MarketplacePage />
            </Suspense>
          }
        />
        <Route
          path="marketplace/:slug"
          element={
            <Suspense fallback={<PageLoader />}>
              <MarketplacePage />
            </Suspense>
          }
        />

        {/* AI Assistant */}
        <Route
          path="ai-assistant"
          element={
            <Suspense fallback={<PageLoader />}>
              <AIAssistantPage />
            </Suspense>
          }
        />

        {/* Call Intelligence Dashboard */}
        <Route
          path="call-intelligence"
          element={
            <Suspense fallback={<PageLoader />}>
              <CallIntelligenceDashboard />
            </Suspense>
          }
        />

        {/* National Septic Permit Database */}
        <Route
          path="permits"
          element={
            <Suspense fallback={<PageLoader />}>
              <PermitsPage />
            </Suspense>
          }
        />
        <Route
          path="permits/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <PermitDetailPage />
            </Suspense>
          }
        />

        {/* 404 within app */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-text-primary mb-4">
                  404
                </h1>
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
