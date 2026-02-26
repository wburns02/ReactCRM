import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout.tsx";
import { RequireAuth } from "@/features/auth/RequireAuth.tsx";
import { useAuth } from "@/features/auth/useAuth.ts";
import { PageLoader } from "./utils";

// Import route modules
import { PublicRoutes } from "./public";
import { PortalRoutes } from "./portal";
import { CustomerPortalRoutes } from "./customer-portal";
import { FieldRoutes } from "./field";
import { DashboardRoutes } from "./app/dashboard.routes";
import { CustomerRoutes } from "./app/customers.routes";
import { WorkOrderRoutes } from "./app/workorders.routes";
import { TechnicianRoutes } from "./app/technicians.routes";
import { CommunicationsRoutes } from "./app/communications.routes";
import { BillingRoutes } from "./app/billing.routes";
import { ReportsRoutes } from "./app/reports.routes";
import { OperationsRoutes } from "./app/operations.routes";
import { ComplianceRoutes } from "./app/compliance.routes";
import { MarketingRoutes } from "./app/marketing.routes";
import { EnterpriseRoutes } from "./app/enterprise.routes";
import { AdminRoutes } from "./app/admin.routes";
import { MiscRoutes } from "./app/misc.routes";
import { PropertyIntelligenceRoutes } from "./app/property-intelligence.routes";
import { DispatchRoutes } from "./app/dispatch.routes";


/**
 * Redirects technicians to /my-dashboard, everyone else to /dashboard
 * Waits for auth to finish loading to ensure role is known
 */
function RoleBasedRedirect() {
  const { isTechnician, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  return <Navigate to={isTechnician ? "/my-dashboard" : "/dashboard"} replace />;
}

/**
 * App routes - standalone deployment at root
 * Uses React.lazy() for code splitting - each feature loads on demand
 *
 * Route modules are organized by domain:
 * - public/     - Login, widgets, tracking, public payment
 * - portal/     - Customer self-service portal
 * - field/      - Mobile technician experience
 * - app/        - Protected app routes (dashboard, customers, work orders, etc.)
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes (no auth required) */}
      {PublicRoutes()}

      {/* Customer Portal routes (legacy /portal/*) */}
      {PortalRoutes()}

      {/* Customer Self-Service Portal routes (/customer-portal/*) */}
      {CustomerPortalRoutes()}

      {/* Field Service routes (mobile technician) */}
      {FieldRoutes()}

      {/* Protected app routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* Role-based redirect: techs → /my-dashboard, others → /dashboard */}
        <Route index element={<RoleBasedRedirect />} />

        {/* Dashboard */}
        {DashboardRoutes()}

        {/* Customers & Prospects */}
        {CustomerRoutes()}

        {/* Work Orders */}
        {WorkOrderRoutes()}

        {/* Technicians & Schedule */}
        {TechnicianRoutes()}

        {/* Communications */}
        {CommunicationsRoutes()}

        {/* Billing & Payments */}
        {BillingRoutes()}

        {/* Reports & Analytics */}
        {ReportsRoutes()}

        {/* Operations */}
        {OperationsRoutes()}

        {/* Compliance & Permits */}
        {ComplianceRoutes()}

        {/* Marketing */}
        {MarketingRoutes()}

        {/* Enterprise */}
        {EnterpriseRoutes()}

        {/* Admin & Settings */}
        {AdminRoutes()}

        {/* Command Center Dispatch */}
        {DispatchRoutes()}

        {/* Property Intelligence */}
        {PropertyIntelligenceRoutes()}

        {/* Misc (Tickets, Marketplace, AI, Help, 404) */}
        {MiscRoutes()}
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
