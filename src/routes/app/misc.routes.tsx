import { lazy, Suspense } from "react";
import { Route, Link } from "react-router-dom";
import { PageLoader } from "../utils";

// Tickets lazy imports
const TicketsPage = lazy(() =>
  import("@/features/tickets/TicketsPage.tsx").then((m) => ({
    default: m.TicketsPage,
  })),
);

const TicketDetailPage = lazy(() =>
  import("@/features/tickets/TicketDetailPage.tsx").then((m) => ({
    default: m.TicketDetailPage,
  })),
);

// Marketplace
const MarketplacePage = lazy(() =>
  import("@/features/marketplace/index.ts").then((m) => ({
    default: m.MarketplacePage,
  })),
);

// AI Assistant
const AIAssistantPage = lazy(() =>
  import("@/features/ai-assistant/index.ts").then((m) => ({
    default: m.AIAssistantPage,
  })),
);

// Onboarding
const OnboardingWizard = lazy(() =>
  import("@/features/onboarding/index.ts").then((m) => ({
    default: m.OnboardingWizard,
  })),
);

const SetupWizard = lazy(() =>
  import("@/features/onboarding/index.ts").then((m) => ({
    default: m.SetupWizard,
  })),
);

const HelpCenter = lazy(() =>
  import("@/features/onboarding/index.ts").then((m) => ({
    default: m.HelpCenter,
  })),
);

/**
 * Miscellaneous routes - Tickets, Marketplace, AI Assistant, Help, Onboarding
 */
export function MiscRoutes() {
  return (
    <>
      {/* Tickets */}
      <Route
        path="tickets"
        element={
          <Suspense fallback={<PageLoader />}>
            <TicketsPage />
          </Suspense>
        }
      />
      <Route
        path="tickets/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <TicketDetailPage />
          </Suspense>
        }
      />

      {/* Marketplace */}
      <Route
        path="marketplace"
        element={
          <Suspense fallback={<PageLoader />}>
            <MarketplacePage />
          </Suspense>
        }
      />
      <Route
        path="marketplace/:slug"
        element={
          <Suspense fallback={<PageLoader />}>
            <MarketplacePage />
          </Suspense>
        }
      />

      {/* AI Assistant */}
      <Route
        path="ai-assistant"
        element={
          <Suspense fallback={<PageLoader />}>
            <AIAssistantPage />
          </Suspense>
        }
      />

      {/* Help & Support */}
      <Route
        path="help"
        element={
          <Suspense fallback={<PageLoader />}>
            <HelpCenter />
          </Suspense>
        }
      />
      <Route
        path="setup"
        element={
          <Suspense fallback={<PageLoader />}>
            <SetupWizard />
          </Suspense>
        }
      />

      {/* 404 within app */}
      <Route
        path="*"
        element={
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
              <p className="text-text-secondary mb-4">Page not found</p>
              <Link to="/dashboard" className="text-primary hover:underline">
                Go to Dashboard
              </Link>
            </div>
          </div>
        }
      />
    </>
  );
}

/**
 * Onboarding route (requires auth but outside main app layout)
 */
export function OnboardingRoute() {
  return (
    <Route
      path="/onboarding"
      element={
        <Suspense fallback={<PageLoader />}>
          <OnboardingWizard />
        </Suspense>
      }
    />
  );
}
