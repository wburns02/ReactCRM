import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Dashboard lazy imports
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage.tsx").then((m) => ({
    default: m.DashboardPage,
  }))
);

const CommandCenter = lazy(() =>
  import("@/features/dashboard/CommandCenter.tsx").then((m) => ({
    default: m.CommandCenter,
  }))
);

/**
 * Dashboard routes
 */
export function DashboardRoutes() {
  return (
    <>
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
    </>
  );
}
