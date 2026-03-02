import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

const SecurityDashboard = lazy(() =>
  import("@/features/security/index.ts").then((m) => ({
    default: m.SecurityDashboard,
  })),
);

const SecurityAlerts = lazy(() =>
  import("@/features/security/index.ts").then((m) => ({
    default: m.SecurityAlerts,
  })),
);

const SecurityAgents = lazy(() =>
  import("@/features/security/index.ts").then((m) => ({
    default: m.SecurityAgents,
  })),
);

const SecurityChat = lazy(() =>
  import("@/features/security/index.ts").then((m) => ({
    default: m.SecurityChat,
  })),
);

/**
 * Security & SOC routes — embedded SOC Dashboard pages
 */
export function SecurityRoutes() {
  return (
    <>
      <Route
        path="security"
        element={
          <Suspense fallback={<PageLoader />}>
            <SecurityDashboard />
          </Suspense>
        }
      />
      <Route
        path="security/alerts"
        element={
          <Suspense fallback={<PageLoader />}>
            <SecurityAlerts />
          </Suspense>
        }
      />
      <Route
        path="security/agents"
        element={
          <Suspense fallback={<PageLoader />}>
            <SecurityAgents />
          </Suspense>
        }
      />
      <Route
        path="security/chat"
        element={
          <Suspense fallback={<PageLoader />}>
            <SecurityChat />
          </Suspense>
        }
      />
    </>
  );
}
