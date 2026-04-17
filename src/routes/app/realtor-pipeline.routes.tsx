import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

const RealtorPipelinePage = lazy(() =>
  import("@/features/realtor-pipeline/RealtorPipelinePage").then((m) => ({
    default: m.RealtorPipelinePage,
  })),
);

/**
 * Realtor Pipeline routes - Agent relationship management and referral tracking
 */
export function RealtorPipelineRoutes() {
  return (
    <>
      <Route
        path="realtor-pipeline"
        element={
          <Suspense fallback={<PageLoader />}>
            <RealtorPipelinePage />
          </Suspense>
        }
      />
    </>
  );
}
