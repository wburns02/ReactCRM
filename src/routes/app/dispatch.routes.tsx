import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

const CommandCenterPage = lazy(() =>
  import("@/features/dispatch/CommandCenterPage.tsx").then((m) => ({
    default: m.CommandCenterPage,
  })),
);

/**
 * Dispatch routes — Command Center for phone-to-job workflow
 */
export function DispatchRoutes() {
  return (
    <Route
      path="dispatch"
      element={
        <Suspense fallback={<PageLoader />}>
          <CommandCenterPage />
        </Suspense>
      }
    />
  );
}
