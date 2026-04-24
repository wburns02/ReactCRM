import { Suspense, lazy } from "react";
import { Route } from "react-router-dom";

import { PageLoader } from "../utils";


const BenefitsOverviewPage = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.BenefitsOverviewPage })),
);

const EnrollmentsPage = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.EnrollmentsPage })),
);

const IntegrationsPage = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.IntegrationsPage })),
);

const DeductionsPage = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.DeductionsPage })),
);

const FsaPage = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.FsaPage })),
);

const CobraPage = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.CobraPage })),
);

const AcaPage = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.AcaPage })),
);

const BenefitsSettingsPage = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.BenefitsSettingsPage })),
);

const BenefitsPlaceholder = lazy(() =>
  import("@/features/benefits").then((m) => ({ default: m.BenefitsPlaceholder })),
);


const placeholder = (title: string) => (
  <Suspense fallback={<PageLoader />}>
    <BenefitsPlaceholder title={title} />
  </Suspense>
);


export function BenefitsRoutes() {
  return (
    <>
      <Route
        path="benefits"
        element={
          <Suspense fallback={<PageLoader />}>
            <BenefitsOverviewPage />
          </Suspense>
        }
      />
      <Route
        path="benefits/enrollments"
        element={
          <Suspense fallback={<PageLoader />}>
            <EnrollmentsPage />
          </Suspense>
        }
      />
      <Route path="benefits/my" element={placeholder("My Benefits")} />
      <Route
        path="benefits/integrations"
        element={
          <Suspense fallback={<PageLoader />}>
            <IntegrationsPage />
          </Suspense>
        }
      />
      <Route
        path="benefits/deductions"
        element={
          <Suspense fallback={<PageLoader />}>
            <DeductionsPage />
          </Suspense>
        }
      />
      <Route
        path="benefits/fsa"
        element={
          <Suspense fallback={<PageLoader />}>
            <FsaPage />
          </Suspense>
        }
      />
      <Route path="benefits/workers-comp" element={placeholder("Workers' Comp")} />
      <Route
        path="benefits/cobra"
        element={
          <Suspense fallback={<PageLoader />}>
            <CobraPage />
          </Suspense>
        }
      />
      <Route
        path="benefits/aca"
        element={
          <Suspense fallback={<PageLoader />}>
            <AcaPage />
          </Suspense>
        }
      />
      <Route
        path="benefits/settings"
        element={
          <Suspense fallback={<PageLoader />}>
            <BenefitsSettingsPage />
          </Suspense>
        }
      />
      <Route path="benefits/shop" element={placeholder("App Shop")} />
      <Route path="benefits/help" element={placeholder("Help")} />
    </>
  );
}
