import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage.tsx";
import { PageLoader, WidgetWrapper } from "../utils";

// Lazy-loaded public components
const LandingPage = lazy(() =>
  import("@/features/landing/index.ts").then((m) => ({
    default: m.LandingPage,
  })),
);

const PrivacyPage = lazy(() =>
  import("@/features/landing/index.ts").then((m) => ({
    default: m.PrivacyPage,
  })),
);

const TermsPage = lazy(() =>
  import("@/features/landing/index.ts").then((m) => ({
    default: m.TermsPage,
  })),
);

const CustomerTrackingPage = lazy(() =>
  import("@/features/tracking/index.ts").then((m) => ({
    default: m.CustomerTrackingPage,
  })),
);

const PublicPaymentPage = lazy(() =>
  import("@/features/billing/pages/PublicPaymentPage.tsx").then((m) => ({
    default: m.PublicPaymentPage,
  })),
);

const BookingWidget = lazy(() =>
  import("@/features/widgets/index.ts").then((m) => ({
    default: m.BookingWidget,
  })),
);

const PaymentWidget = lazy(() =>
  import("@/features/widgets/index.ts").then((m) => ({
    default: m.PaymentWidget,
  })),
);

const StatusWidget = lazy(() =>
  import("@/features/widgets/index.ts").then((m) => ({
    default: m.StatusWidget,
  })),
);

/**
 * Public routes - no authentication required
 * Includes: landing page, login, embeddable widgets, tracking, public payment
 */
export function PublicRoutes() {
  return (
    <>
      {/* Public landing page - customer-facing lead capture */}
      <Route
        path="/home"
        element={
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
        }
      />

      {/* Privacy Policy */}
      <Route
        path="/privacy"
        element={
          <Suspense fallback={<PageLoader />}>
            <PrivacyPage />
          </Suspense>
        }
      />

      {/* Terms of Service */}
      <Route
        path="/terms"
        element={
          <Suspense fallback={<PageLoader />}>
            <TermsPage />
          </Suspense>
        }
      />

      {/* Public login route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Public embeddable widget routes */}
      <Route
        path="/embed/booking"
        element={
          <Suspense fallback={<PageLoader />}>
            <WidgetWrapper>
              <BookingWidget companyId="" />
            </WidgetWrapper>
          </Suspense>
        }
      />
      <Route
        path="/embed/payment"
        element={
          <Suspense fallback={<PageLoader />}>
            <WidgetWrapper>
              <PaymentWidget companyId="" />
            </WidgetWrapper>
          </Suspense>
        }
      />
      <Route
        path="/embed/status"
        element={
          <Suspense fallback={<PageLoader />}>
            <WidgetWrapper>
              <StatusWidget companyId="" />
            </WidgetWrapper>
          </Suspense>
        }
      />

      {/* Public Customer Tracking - no auth required */}
      <Route
        path="/track/:token"
        element={
          <Suspense fallback={<PageLoader />}>
            <CustomerTrackingPage />
          </Suspense>
        }
      />

      {/* Public Payment Page - no auth required */}
      <Route
        path="/pay/:token"
        element={
          <Suspense fallback={<PageLoader />}>
            <PublicPaymentPage />
          </Suspense>
        }
      />
    </>
  );
}
