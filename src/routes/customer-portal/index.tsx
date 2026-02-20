import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Lazy imports for customer portal components
const CustomerPortalLogin = lazy(() =>
  import("@/features/customer-portal/index.ts").then((m) => ({
    default: m.CustomerPortalLogin,
  })),
);

const CustomerPortalLayout = lazy(() =>
  import("@/features/customer-portal/index.ts").then((m) => ({
    default: m.CustomerPortalLayout,
  })),
);

const CustomerPortalDashboard = lazy(() =>
  import("@/features/customer-portal/index.ts").then((m) => ({
    default: m.CustomerPortalDashboard,
  })),
);

const CustomerPortalServices = lazy(() =>
  import("@/features/customer-portal/index.ts").then((m) => ({
    default: m.CustomerPortalServices,
  })),
);

const CustomerPortalInvoices = lazy(() =>
  import("@/features/customer-portal/index.ts").then((m) => ({
    default: m.CustomerPortalInvoices,
  })),
);

const CustomerPortalRequestService = lazy(() =>
  import("@/features/customer-portal/index.ts").then((m) => ({
    default: m.CustomerPortalRequestService,
  })),
);

const RequireCustomerPortalAuth = lazy(() =>
  import("@/features/customer-portal/index.ts").then((m) => ({
    default: m.RequireCustomerPortalAuth,
  })),
);

/**
 * Customer Self-Service Portal routes at /customer-portal/*
 *
 * These are SEPARATE from the staff portal (/portal/*).
 * No AppLayout, no staff auth guard — customer portal has its own Bearer auth.
 */
export function CustomerPortalRoutes() {
  return (
    <>
      {/* Public: Login page (no auth required) */}
      <Route
        path="/customer-portal/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <CustomerPortalLogin />
          </Suspense>
        }
      />

      {/* Protected: Layout + child pages */}
      <Route
        path="/customer-portal"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequireCustomerPortalAuth>
              <CustomerPortalLayout />
            </RequireCustomerPortalAuth>
          </Suspense>
        }
      >
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<PageLoader />}>
              <CustomerPortalDashboard />
            </Suspense>
          }
        />
        <Route
          path="services"
          element={
            <Suspense fallback={<PageLoader />}>
              <CustomerPortalServices />
            </Suspense>
          }
        />
        <Route
          path="invoices"
          element={
            <Suspense fallback={<PageLoader />}>
              <CustomerPortalInvoices />
            </Suspense>
          }
        />
        <Route
          path="request-service"
          element={
            <Suspense fallback={<PageLoader />}>
              <CustomerPortalRequestService />
            </Suspense>
          }
        />
      </Route>
    </>
  );
}
