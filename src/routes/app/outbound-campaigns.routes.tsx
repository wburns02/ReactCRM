import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

const OutboundCampaignsPage = lazy(() =>
  import("@/features/outbound-campaigns/OutboundCampaignsPage.tsx").then(
    (m) => ({
      default: m.OutboundCampaignsPage,
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
    </>
  );
}
