import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

const OutboundCampaignsPage = lazy(() =>
  import("@/features/outbound-campaigns/OutboundCampaignsPage").then(
    (m) => ({
      default: m.OutboundCampaignsPage,
    }),
  ),
);

const AIAgentDashboard = lazy(() =>
  import("@/features/outbound-campaigns/pages/AIAgentDashboard").then(
    (m) => ({
      default: m.AIAgentDashboard,
    }),
  ),
);

/**
 * Outbound Campaigns routes - Call list management and power dialer
 */
export function OutboundCampaignsRoutes() {
  return (
    <>
      <Route
        path="outbound-campaigns"
        element={
          <Suspense fallback={<PageLoader />}>
            <OutboundCampaignsPage />
          </Suspense>
        }
      />
      <Route
        path="ai-agent"
        element={
          <Suspense fallback={<PageLoader />}>
            <AIAgentDashboard />
          </Suspense>
        }
      />
    </>
  );
}
