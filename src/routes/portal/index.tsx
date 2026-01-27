import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Portal lazy imports
const PortalLayout = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalLayout,
  }))
);

const PortalLoginPage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalLoginPage,
  }))
);

const PortalDashboardPage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalDashboardPage,
  }))
);

const PortalWorkOrdersPage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalWorkOrdersPage,
  }))
);

const PortalInvoicesPage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalInvoicesPage,
  }))
);

const PortalRequestServicePage = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.PortalRequestServicePage,
  }))
);

const RequirePortalAuth = lazy(() =>
  import("@/features/portal/index.ts").then((m) => ({
    default: m.RequirePortalAuth,
  }))
);

/**
 * Customer Portal routes at /portal/*
 * Self-service portal for customers
 */
export function PortalRoutes() {
  return (
    <>
      {/* Portal login */}
      <Route
        path="/portal/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <PortalLoginPage />
          </Suspense>
        }
      />

      {/* Protected portal routes */}
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
    </>
  );
}
