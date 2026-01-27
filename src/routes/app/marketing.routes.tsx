import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Marketing lazy imports
const MarketingHubPage = lazy(() =>
  import("@/features/marketing/MarketingHubPage.tsx").then((m) => ({
    default: m.MarketingHubPage,
  }))
);

const GoogleAdsPage = lazy(() =>
  import("@/features/marketing/google-ads/GoogleAdsPage.tsx").then((m) => ({
    default: m.GoogleAdsPage,
  }))
);

const ReviewsPage = lazy(() =>
  import("@/features/marketing/reviews/ReviewsPage.tsx").then((m) => ({
    default: m.ReviewsPage,
  }))
);

const AIContentPage = lazy(() =>
  import("@/features/marketing/ai-content/AIContentPage.tsx").then((m) => ({
    default: m.AIContentPage,
  }))
);

const EmailMarketingPage = lazy(() =>
  import("@/features/email-marketing/EmailMarketingPage.tsx").then((m) => ({
    default: m.EmailMarketingPage,
  }))
);

/**
 * Marketing routes - Marketing Hub, Ads, Reviews, AI Content, Email Marketing
 */
export function MarketingRoutes() {
  return (
    <>
      {/* Marketing Hub */}
      <Route
        path="marketing"
        element={
          <Suspense fallback={<PageLoader />}>
            <MarketingHubPage />
          </Suspense>
        }
      />
      <Route
        path="marketing/ads"
        element={
          <Suspense fallback={<PageLoader />}>
            <GoogleAdsPage />
          </Suspense>
        }
      />
      <Route
        path="marketing/reviews"
        element={
          <Suspense fallback={<PageLoader />}>
            <ReviewsPage />
          </Suspense>
        }
      />
      <Route
        path="marketing/ai-content"
        element={
          <Suspense fallback={<PageLoader />}>
            <AIContentPage />
          </Suspense>
        }
      />

      {/* Email Marketing */}
      <Route
        path="email-marketing"
        element={
          <Suspense fallback={<PageLoader />}>
            <EmailMarketingPage />
          </Suspense>
        }
      />
    </>
  );
}
