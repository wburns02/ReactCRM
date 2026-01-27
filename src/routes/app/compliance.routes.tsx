import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Compliance lazy imports
const ComplianceDashboard = lazy(() =>
  import("@/features/compliance/index.ts").then((m) => ({
    default: m.ComplianceDashboard,
  }))
);

// Permits
const PermitsPage = lazy(() =>
  import("@/features/permits/index.ts").then((m) => ({
    default: m.PermitsPage,
  }))
);

const PermitDetailPage = lazy(() =>
  import("@/features/permits/index.ts").then((m) => ({
    default: m.PermitDetailPage,
  }))
);

// Contracts
const ContractsPage = lazy(() =>
  import("@/features/contracts/index.ts").then((m) => ({
    default: m.ContractsPage,
  }))
);

// Time Tracking
const TimesheetsPage = lazy(() =>
  import("@/features/time-tracking/index.ts").then((m) => ({
    default: m.TimesheetsPage,
  }))
);

// Job Costing
const JobCostingPage = lazy(() =>
  import("@/features/job-costing/index.ts").then((m) => ({
    default: m.JobCostingPage,
  }))
);

/**
 * Compliance routes - Compliance, Permits, Contracts, Timesheets, Job Costing
 */
export function ComplianceRoutes() {
  return (
    <>
      {/* Compliance */}
      <Route
        path="compliance"
        element={
          <Suspense fallback={<PageLoader />}>
            <ComplianceDashboard />
          </Suspense>
        }
      />

      {/* Permits */}
      <Route
        path="permits"
        element={
          <Suspense fallback={<PageLoader />}>
            <PermitsPage />
          </Suspense>
        }
      />
      <Route
        path="permits/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <PermitDetailPage />
          </Suspense>
        }
      />

      {/* Contracts */}
      <Route
        path="contracts"
        element={
          <Suspense fallback={<PageLoader />}>
            <ContractsPage />
          </Suspense>
        }
      />

      {/* Timesheets */}
      <Route
        path="timesheets"
        element={
          <Suspense fallback={<PageLoader />}>
            <TimesheetsPage />
          </Suspense>
        }
      />

      {/* Job Costing */}
      <Route
        path="job-costing"
        element={
          <Suspense fallback={<PageLoader />}>
            <JobCostingPage />
          </Suspense>
        }
      />
    </>
  );
}
