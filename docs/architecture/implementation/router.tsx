/**
 * router.tsx - Complete Router Configuration Reference
 *
 * Generated: 2026-01-09
 * Purpose: Reference implementation for all new routes based on placement plans
 * Status: Implementation Guide
 *
 * NEW ROUTES ADDED:
 * - Field Service (/field/*) - 7 routes
 * - Communications (/communications/*) - 10 routes
 * - Billing (/billing/*, /estimates, /pay) - 6 routes
 * - Work Orders Views - 3 routes
 * - Total: 26 new routes
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// ============================================================================
// EXISTING LAZY IMPORTS (Keep as-is)
// ============================================================================
// ... existing imports from src/routes/index.tsx ...

// ============================================================================
// NEW LAZY IMPORTS - FIELD SERVICE
// ============================================================================
const FieldLayout = lazy(() => import('@/features/field/FieldLayout.tsx').then(m => ({ default: m.FieldLayout })));
const MyJobsPage = lazy(() => import('@/features/field/pages/MyJobsPage.tsx').then(m => ({ default: m.MyJobsPage })));
const JobDetailPage = lazy(() => import('@/features/field/pages/JobDetailPage.tsx').then(m => ({ default: m.JobDetailPage })));
const JobCompletionFlow = lazy(() => import('@/features/field/pages/JobCompletionFlow.tsx').then(m => ({ default: m.JobCompletionFlow })));
const RouteView = lazy(() => import('@/features/field/pages/RouteView.tsx').then(m => ({ default: m.RouteView })));
const RouteDetail = lazy(() => import('@/features/field/pages/RouteDetail.tsx').then(m => ({ default: m.RouteDetail })));
const TechStatsPage = lazy(() => import('@/features/field/pages/TechStatsPage.tsx').then(m => ({ default: m.TechStatsPage })));
const TechProfilePage = lazy(() => import('@/features/field/pages/TechProfilePage.tsx').then(m => ({ default: m.TechProfilePage })));

// ============================================================================
// NEW LAZY IMPORTS - COMMUNICATIONS
// ============================================================================
const CommunicationsOverview = lazy(() => import('@/features/communications/pages/CommunicationsOverview.tsx').then(m => ({ default: m.CommunicationsOverview })));
const SMSInbox = lazy(() => import('@/features/communications/pages/SMSInbox.tsx').then(m => ({ default: m.SMSInbox })));
const SMSConversation = lazy(() => import('@/features/communications/pages/SMSConversation.tsx').then(m => ({ default: m.SMSConversation })));
const EmailInbox = lazy(() => import('@/features/communications/pages/EmailInbox.tsx').then(m => ({ default: m.EmailInbox })));
const EmailConversation = lazy(() => import('@/features/communications/pages/EmailConversation.tsx').then(m => ({ default: m.EmailConversation })));
const AllTemplates = lazy(() => import('@/features/communications/pages/AllTemplates.tsx').then(m => ({ default: m.AllTemplates })));
const SMSTemplates = lazy(() => import('@/features/communications/pages/SMSTemplates.tsx').then(m => ({ default: m.SMSTemplates })));
const EmailTemplates = lazy(() => import('@/features/communications/pages/EmailTemplates.tsx').then(m => ({ default: m.EmailTemplates })));
const ReminderConfig = lazy(() => import('@/features/communications/pages/ReminderConfig.tsx').then(m => ({ default: m.ReminderConfig })));
const ReminderDetail = lazy(() => import('@/features/communications/pages/ReminderDetail.tsx').then(m => ({ default: m.ReminderDetail })));

// ============================================================================
// NEW LAZY IMPORTS - BILLING
// ============================================================================
const BillingOverview = lazy(() => import('@/features/billing/pages/BillingOverview.tsx').then(m => ({ default: m.BillingOverview })));
const EstimatesPage = lazy(() => import('@/features/billing/pages/EstimatesPage.tsx').then(m => ({ default: m.EstimatesPage })));
const EstimateDetailPage = lazy(() => import('@/features/billing/pages/EstimateDetailPage.tsx').then(m => ({ default: m.EstimateDetailPage })));
const PaymentPlansPage = lazy(() => import('@/features/billing/pages/PaymentPlansPage.tsx').then(m => ({ default: m.PaymentPlansPage })));
const PublicPaymentPage = lazy(() => import('@/features/billing/pages/PublicPaymentPage.tsx').then(m => ({ default: m.PublicPaymentPage })));
const InvoiceCreatePage = lazy(() => import('@/features/invoicing/InvoiceCreatePage.tsx').then(m => ({ default: m.InvoiceCreatePage })));

// ============================================================================
// NEW LAZY IMPORTS - WORK ORDERS VIEWS
// ============================================================================
const CalendarView = lazy(() => import('@/features/workorders/views/CalendarView.tsx').then(m => ({ default: m.CalendarView })));
const KanbanBoard = lazy(() => import('@/features/workorders/views/KanbanBoard.tsx').then(m => ({ default: m.KanbanBoard })));
const MapView = lazy(() => import('@/features/workorders/views/MapView.tsx').then(m => ({ default: m.MapView })));

// ============================================================================
// NEW ROUTES TO ADD TO src/routes/index.tsx
// ============================================================================

/**
 * PUBLIC ROUTE: Payment Link (No Authentication Required)
 *
 * Place OUTSIDE RequireAuth wrapper, at root level:
 */
const PublicPaymentRoute = (
  <Route
    path="/pay/:token"
    element={
      <Suspense fallback={<PageLoader />}>
        <PublicPaymentPage />
      </Suspense>
    }
  />
);

/**
 * FIELD SERVICE ROUTES (Technician Mobile Experience)
 *
 * Place as separate route tree with FieldLayout wrapper:
 */
const FieldServiceRoutes = (
  <Route
    path="/field"
    element={
      <RequireAuth requiredRole="technician">
        <Suspense fallback={<PageLoader />}>
          <FieldLayout />
        </Suspense>
      </RequireAuth>
    }
  >
    <Route index element={<Suspense fallback={<PageLoader />}><MyJobsPage /></Suspense>} />
    <Route path="job/:id" element={<Suspense fallback={<PageLoader />}><JobDetailPage /></Suspense>} />
    <Route path="job/:id/complete" element={<Suspense fallback={<PageLoader />}><JobCompletionFlow /></Suspense>} />
    <Route path="route" element={<Suspense fallback={<PageLoader />}><RouteView /></Suspense>} />
    <Route path="route/:jobId" element={<Suspense fallback={<PageLoader />}><RouteDetail /></Suspense>} />
    <Route path="stats" element={<Suspense fallback={<PageLoader />}><TechStatsPage /></Suspense>} />
    <Route path="profile" element={<Suspense fallback={<PageLoader />}><TechProfilePage /></Suspense>} />
  </Route>
);

/**
 * COMMUNICATIONS ROUTES
 *
 * Place inside protected routes (RequireAuth wrapper):
 */
const CommunicationsRoutes = (
  <>
    <Route path="communications" element={<Suspense fallback={<PageLoader />}><CommunicationsOverview /></Suspense>} />
    <Route path="communications/sms" element={<Suspense fallback={<PageLoader />}><SMSInbox /></Suspense>} />
    <Route path="communications/sms/:id" element={<Suspense fallback={<PageLoader />}><SMSConversation /></Suspense>} />
    <Route path="communications/email-inbox" element={<Suspense fallback={<PageLoader />}><EmailInbox /></Suspense>} />
    <Route path="communications/email-inbox/:id" element={<Suspense fallback={<PageLoader />}><EmailConversation /></Suspense>} />
    <Route path="communications/templates" element={<Suspense fallback={<PageLoader />}><AllTemplates /></Suspense>} />
    <Route path="communications/templates/sms" element={<Suspense fallback={<PageLoader />}><SMSTemplates /></Suspense>} />
    <Route path="communications/templates/email" element={<Suspense fallback={<PageLoader />}><EmailTemplates /></Suspense>} />
    <Route path="communications/reminders" element={<Suspense fallback={<PageLoader />}><ReminderConfig /></Suspense>} />
    <Route path="communications/reminders/:id" element={<Suspense fallback={<PageLoader />}><ReminderDetail /></Suspense>} />
  </>
);

/**
 * BILLING ROUTES
 *
 * Place inside protected routes (RequireAuth wrapper):
 */
const BillingRoutes = (
  <>
    <Route path="estimates" element={<Suspense fallback={<PageLoader />}><EstimatesPage /></Suspense>} />
    <Route path="estimates/:id" element={<Suspense fallback={<PageLoader />}><EstimateDetailPage /></Suspense>} />
    <Route path="invoices/new" element={<Suspense fallback={<PageLoader />}><InvoiceCreatePage /></Suspense>} />
    <Route path="billing/overview" element={<Suspense fallback={<PageLoader />}><BillingOverview /></Suspense>} />
    <Route path="billing/payment-plans" element={<Suspense fallback={<PageLoader />}><PaymentPlansPage /></Suspense>} />
  </>
);

/**
 * WORK ORDERS VIEW ROUTES
 *
 * Place inside protected routes, BEFORE the :id route:
 */
const WorkOrdersViewRoutes = (
  <>
    <Route path="work-orders/calendar" element={<Suspense fallback={<PageLoader />}><CalendarView /></Suspense>} />
    <Route path="work-orders/board" element={<Suspense fallback={<PageLoader />}><KanbanBoard /></Suspense>} />
    <Route path="work-orders/map" element={<Suspense fallback={<PageLoader />}><MapView /></Suspense>} />
  </>
);

// ============================================================================
// ROUTE ORDER IN FULL CONTEXT
// ============================================================================

/**
 * Complete route structure order in src/routes/index.tsx:
 *
 * <BrowserRouter basename="/">
 *   <Routes>
 *     {/* PUBLIC ROUTES (no auth) *}
 *     <Route path="/login" element={<LoginPage />} />
 *     <Route path="/embed/booking" element={<BookingWidget />} />
 *     <Route path="/embed/payment" element={<PaymentWidget />} />
 *     <Route path="/embed/status" element={<StatusWidget />} />
 *     <Route path="/track/:token" element={<CustomerTrackingPage />} />    {/* GPS Tracking - PUBLIC *}
 *     <Route path="/pay/:token" element={<PublicPaymentPage />} />          {/* Billing - PUBLIC - NEW *}
 *     <Route path="/onboarding" element={<OnboardingWizard />} />
 *
 *     {/* PORTAL ROUTES *}
 *     <Route path="/portal/login" element={<PortalLoginPage />} />
 *     <Route path="/portal" element={<RequirePortalAuth><PortalLayout /></RequirePortalAuth>}>
 *       ... portal routes ...
 *     </Route>
 *
 *     {/* FIELD SERVICE ROUTES (separate layout for technicians) - NEW *}
 *     <Route path="/field" element={<RequireAuth requiredRole="technician"><FieldLayout /></RequireAuth>}>
 *       <Route index element={<MyJobsPage />} />
 *       <Route path="job/:id" element={<JobDetailPage />} />
 *       <Route path="job/:id/complete" element={<JobCompletionFlow />} />
 *       <Route path="route" element={<RouteView />} />
 *       <Route path="route/:jobId" element={<RouteDetail />} />
 *       <Route path="stats" element={<TechStatsPage />} />
 *       <Route path="profile" element={<TechProfilePage />} />
 *     </Route>
 *
 *     {/* PROTECTED APP ROUTES *}
 *     <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
 *       <Route index element={<Navigate to="/dashboard" />} />
 *       <Route path="dashboard" element={<DashboardPage />} />
 *
 *       ... existing routes ...
 *
 *       {/* WORK ORDERS - ENHANCED VIEWS (place before :id route) - NEW *}
 *       <Route path="work-orders" element={<WorkOrdersPage />} />
 *       <Route path="work-orders/calendar" element={<CalendarView />} />
 *       <Route path="work-orders/board" element={<KanbanBoard />} />
 *       <Route path="work-orders/map" element={<MapView />} />
 *       <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
 *
 *       {/* COMMUNICATIONS - EXPANDED - NEW *}
 *       <Route path="communications" element={<CommunicationsOverview />} />
 *       <Route path="communications/sms" element={<SMSInbox />} />
 *       <Route path="communications/sms/:id" element={<SMSConversation />} />
 *       <Route path="communications/email-inbox" element={<EmailInbox />} />
 *       <Route path="communications/email-inbox/:id" element={<EmailConversation />} />
 *       <Route path="communications/templates" element={<AllTemplates />} />
 *       <Route path="communications/templates/sms" element={<SMSTemplates />} />
 *       <Route path="communications/templates/email" element={<EmailTemplates />} />
 *       <Route path="communications/reminders" element={<ReminderConfig />} />
 *       <Route path="communications/reminders/:id" element={<ReminderDetail />} />
 *
 *       {/* BILLING - EXPANDED - NEW *}
 *       <Route path="estimates" element={<EstimatesPage />} />
 *       <Route path="estimates/:id" element={<EstimateDetailPage />} />
 *       <Route path="invoices/new" element={<InvoiceCreatePage />} />
 *       <Route path="billing/overview" element={<BillingOverview />} />
 *       <Route path="billing/payment-plans" element={<PaymentPlansPage />} />
 *
 *       ... remaining existing routes ...
 *
 *       <Route path="*" element={<NotFoundPage />} />
 *     </Route>
 *
 *     <Route path="*" element={<Navigate to="/" />} />
 *   </Routes>
 * </BrowserRouter>
 */

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * TOTAL NEW ROUTES: 27
 *
 * Public Routes (no auth):
 * - /pay/:token                    (Billing - public payment link)
 *
 * Field Service Routes (technician role):
 * - /field                         (My Jobs - landing)
 * - /field/job/:id                 (Job Detail)
 * - /field/job/:id/complete        (Job Completion Flow)
 * - /field/route                   (Route View)
 * - /field/route/:jobId            (Route Detail)
 * - /field/stats                   (Tech Stats)
 * - /field/profile                 (Tech Profile)
 *
 * Communications Routes (protected):
 * - /communications                (Overview)
 * - /communications/sms            (SMS Inbox)
 * - /communications/sms/:id        (SMS Conversation)
 * - /communications/email-inbox    (Email Inbox)
 * - /communications/email-inbox/:id (Email Conversation)
 * - /communications/templates      (All Templates)
 * - /communications/templates/sms  (SMS Templates)
 * - /communications/templates/email (Email Templates)
 * - /communications/reminders      (Reminder Config)
 * - /communications/reminders/:id  (Reminder Detail)
 *
 * Billing Routes (protected):
 * - /estimates                     (Estimates List)
 * - /estimates/:id                 (Estimate Detail)
 * - /invoices/new                  (Invoice Create)
 * - /billing/overview              (Billing Dashboard)
 * - /billing/payment-plans         (Payment Plans)
 *
 * Work Orders Views (protected):
 * - /work-orders/calendar          (Calendar View)
 * - /work-orders/board             (Kanban Board)
 * - /work-orders/map               (Map View)
 */

export default {};
