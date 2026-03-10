import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { PageLoader } from "../utils";

// Marketing lazy imports
const MarketingHubPage = lazy(() =>
  import("@/features/marketing/MarketingHubPage.tsx").then((m) => ({
    default: m.MarketingHubPage,
  })),
);

const MarketingTasksPage = lazy(() =>
  import("@/features/marketing/tasks/MarketingTasksPage.tsx").then((m) => ({
    default: m.MarketingTasksPage,
  })),
);

const GoogleAdsPage = lazy(() =>
  import("@/features/marketing/google-ads/GoogleAdsPage.tsx").then((m) => ({
    default: m.GoogleAdsPage,
  })),
);

const ReviewsPage = lazy(() =>
  import("@/features/marketing/reviews/ReviewsPage.tsx").then((m) => ({
    default: m.ReviewsPage,
  })),
);

const AIContentPage = lazy(() =>
  import("@/features/marketing/ai-content/AIContentPage.tsx").then((m) => ({
    default: m.AIContentPage,
  })),
);

const EmailMarketingPage = lazy(() =>
  import("@/features/email-marketing/EmailMarketingPage.tsx").then((m) => ({
    default: m.EmailMarketingPage,
  })),
);

const LeadPipelinePage = lazy(() =>
  import("@/features/marketing/leads/LeadPipelinePage.tsx").then((m) => ({
    default: m.LeadPipelinePage,
  })),
);

const SEODashboardPage = lazy(() =>
  import("@/features/marketing/seo/SEODashboardPage.tsx").then((m) => ({
    default: m.SEODashboardPage,
  })),
);

const MarketingAnalyticsPage = lazy(() =>
  import("@/features/marketing/analytics/MarketingAnalyticsPage.tsx").then(
    (m) => ({
      default: m.MarketingAnalyticsPage,
    }),
  ),
);

const GA4DashboardPage = lazy(() =>
  import("@/features/marketing/ga4/GA4DashboardPage.tsx").then((m) => ({
    default: m.GA4DashboardPage,
  })),
);

const NashvilleDashboardPage = lazy(() =>
  import("@/features/marketing/nashville-ads/NashvilleDashboardPage.tsx").then(
    (m) => ({
      default: m.NashvilleDashboardPage,
    }),
  ),
);

/**
 * Marketing routes - Marketing Hub, Ads, Reviews, AI Content, Email Marketing,
 * Lead Pipeline, SEO Dashboard, Marketing Analytics
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
      {/* Marketing Tasks Dashboard - No sidebar link, URL bookmark only */}
      <Route
        path="marketing/tasks"
        element={
          <Suspense fallback={<PageLoader />}>
            <MarketingTasksPage />
          </Suspense>
        }
      />

      {/* /marketing/email → /marketing/email-marketing redirect */}
      <Route path="marketing/email" element={<Navigate to="/marketing/email-marketing" replace />} />

      {/* /email-marketing → /marketing/email-marketing redirect (dead route fix) */}
      <Route path="email-marketing" element={<Navigate to="/marketing/email-marketing" replace />} />

      {/* Email Marketing */}
      <Route
        path="marketing/email-marketing"
        element={
          <Suspense fallback={<PageLoader />}>
            <EmailMarketingPage />
          </Suspense>
        }
      />

      {/* Lead Pipeline */}
      <Route
        path="marketing/leads"
        element={
          <Suspense fallback={<PageLoader />}>
            <LeadPipelinePage />
          </Suspense>
        }
      />

      {/* SEO Dashboard */}
      <Route
        path="marketing/seo"
        element={
          <Suspense fallback={<PageLoader />}>
            <SEODashboardPage />
          </Suspense>
        }
      />

      {/* Marketing Analytics */}
      <Route
        path="marketing/analytics"
        element={
          <Suspense fallback={<PageLoader />}>
            <MarketingAnalyticsPage />
          </Suspense>
        }
      />

      {/* GA4 Website Analytics */}
      <Route
        path="marketing/ga4"
        element={
          <Suspense fallback={<PageLoader />}>
            <GA4DashboardPage />
          </Suspense>
        }
      />

      {/* Nashville Ads Command Center */}
      <Route
        path="marketing/nashville-ads"
        element={
          <Suspense fallback={<PageLoader />}>
            <NashvilleDashboardPage />
          </Suspense>
        }
      />
    </>
  );
}
