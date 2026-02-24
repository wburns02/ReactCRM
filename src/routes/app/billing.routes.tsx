import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Billing lazy imports
const BillingOverview = lazy(() =>
  import("@/features/billing/pages/BillingOverview.tsx").then((m) => ({
    default: m.BillingOverview,
  })),
);

const EstimatesPage = lazy(() =>
  import("@/features/billing/pages/EstimatesPage.tsx").then((m) => ({
    default: m.EstimatesPage,
  })),
);

const EstimateDetailPage = lazy(() =>
  import("@/features/billing/pages/EstimateDetailPage.tsx").then((m) => ({
    default: m.EstimateDetailPage,
  })),
);

const PaymentPlansPage = lazy(() =>
  import("@/features/billing/pages/PaymentPlansPage.tsx").then((m) => ({
    default: m.PaymentPlansPage,
  })),
);

const PaymentPlanDetailPage = lazy(() =>
  import("@/features/billing/pages/PaymentPlanDetailPage.tsx").then((m) => ({
    default: m.PaymentPlanDetailPage,
  })),
);

const InvoicesPage = lazy(() =>
  import("@/features/invoicing/InvoicesPage.tsx").then((m) => ({
    default: m.InvoicesPage,
  })),
);

const InvoiceDetailPage = lazy(() =>
  import("@/features/invoicing/InvoiceDetailPage.tsx").then((m) => ({
    default: m.InvoiceDetailPage,
  })),
);

const InvoiceCreatePage = lazy(() =>
  import("@/features/invoicing/InvoiceCreatePage.tsx").then((m) => ({
    default: m.InvoiceCreatePage,
  })),
);

const PaymentsPage = lazy(() =>
  import("@/features/payments/PaymentsPage.tsx").then((m) => ({
    default: m.PaymentsPage,
  })),
);

const GreaseTrapPricingPage = lazy(() =>
  import("@/features/grease-trap-pricing/GreaseTrapPricingPage.tsx").then((m) => ({
    default: m.GreaseTrapPricingPage,
  })),
);

/**
 * Billing routes - Invoices, Estimates, Payments, Payment Plans
 */
export function BillingRoutes() {
  return (
    <>
      {/* Billing Overview */}
      <Route
        path="billing/overview"
        element={
          <Suspense fallback={<PageLoader />}>
            <BillingOverview />
          </Suspense>
        }
      />

      {/* Invoices */}
      <Route
        path="invoices"
        element={
          <Suspense fallback={<PageLoader />}>
            <InvoicesPage />
          </Suspense>
        }
      />
      <Route
        path="invoices/new"
        element={
          <Suspense fallback={<PageLoader />}>
            <InvoiceCreatePage />
          </Suspense>
        }
      />
      <Route
        path="invoices/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <InvoiceDetailPage />
          </Suspense>
        }
      />

      {/* Estimates */}
      <Route
        path="estimates"
        element={
          <Suspense fallback={<PageLoader />}>
            <EstimatesPage />
          </Suspense>
        }
      />
      <Route
        path="estimates/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <EstimateDetailPage />
          </Suspense>
        }
      />

      {/* Payments */}
      <Route
        path="payments"
        element={
          <Suspense fallback={<PageLoader />}>
            <PaymentsPage />
          </Suspense>
        }
      />

      {/* Payment Plans */}
      <Route
        path="billing/payment-plans"
        element={
          <Suspense fallback={<PageLoader />}>
            <PaymentPlansPage />
          </Suspense>
        }
      />
      <Route
        path="billing/payment-plans/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <PaymentPlanDetailPage />
          </Suspense>
        }
      />
      {/* Grease Trap Pricing */}
      <Route
        path="grease-trap-pricing"
        element={
          <Suspense fallback={<PageLoader />}>
            <GreaseTrapPricingPage />
          </Suspense>
        }
      />
    </>
  );
}
