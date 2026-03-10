import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Custom Reports lazy imports
const ReportListPage = lazy(() =>
  import("@/features/custom-reports/index.ts").then((m) => ({
    default: m.ReportListPage,
  })),
);

const ReportBuilderPage = lazy(() =>
  import("@/features/custom-reports/index.ts").then((m) => ({
    default: m.ReportBuilderPage,
  })),
);

const ReportViewerPage = lazy(() =>
  import("@/features/custom-reports/index.ts").then((m) => ({
    default: m.ReportViewerPage,
  })),
);

// Reports lazy imports
const ReportsPage = lazy(() =>
  import("@/features/reports/pages/ReportsPage").then((m) => ({
    default: m.ReportsPage,
  })),
);

const RevenueReport = lazy(() =>
  import("@/features/reports/pages/RevenueReport").then((m) => ({
    default: m.RevenueReport,
  })),
);

const TechnicianPerformance = lazy(() =>
  import("@/features/reports/pages/TechnicianPerformance").then((m) => ({
    default: m.TechnicianPerformance,
  })),
);

const CLVReportPage = lazy(() =>
  import("@/features/reports/pages/CLVReportPage").then((m) => ({
    default: m.CLVReportPage,
  })),
);

const ServiceReportPage = lazy(() =>
  import("@/features/reports/pages/ServiceReportPage").then((m) => ({
    default: m.ServiceReportPage,
  })),
);

const LocationReportPage = lazy(() =>
  import("@/features/reports/pages/LocationReportPage").then((m) => ({
    default: m.LocationReportPage,
  })),
);

// Analytics lazy imports
const FTFRDashboard = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.FTFRDashboard,
  })),
);

const BIDashboard = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.BIDashboard,
  })),
);

const OperationsCommandCenter = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.OperationsCommandCenter,
  })),
);

const FinancialDashboard = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.FinancialDashboard,
  })),
);

const PerformanceScorecard = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.PerformanceScorecard,
  })),
);

const AIInsightsPanel = lazy(() =>
  import("@/features/analytics/index.ts").then((m) => ({
    default: m.AIInsightsPanel,
  })),
);

const CoachingPage = lazy(() =>
  import("@/features/coaching/CoachingPage").then((m) => ({
    default: m.CoachingPage,
  })),
);

/**
 * Reports and Analytics routes
 */
export function ReportsRoutes() {
  return (
    <>
      {/* Reports */}
      <Route
        path="reports"
        element={
          <Suspense fallback={<PageLoader />}>
            <ReportsPage />
          </Suspense>
        }
      />
      <Route
        path="reports/revenue"
        element={
          <Suspense fallback={<PageLoader />}>
            <RevenueReport />
          </Suspense>
        }
      />
      <Route
        path="reports/technicians"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechnicianPerformance />
          </Suspense>
        }
      />
      <Route
        path="reports/clv"
        element={
          <Suspense fallback={<PageLoader />}>
            <CLVReportPage />
          </Suspense>
        }
      />
      <Route
        path="reports/service"
        element={
          <Suspense fallback={<PageLoader />}>
            <ServiceReportPage />
          </Suspense>
        }
      />
      <Route
        path="reports/location"
        element={
          <Suspense fallback={<PageLoader />}>
            <LocationReportPage />
          </Suspense>
        }
      />

      {/* Custom Reports */}
      <Route
        path="reports/custom"
        element={
          <Suspense fallback={<PageLoader />}>
            <ReportListPage />
          </Suspense>
        }
      />
      <Route
        path="reports/custom/new"
        element={
          <Suspense fallback={<PageLoader />}>
            <ReportBuilderPage />
          </Suspense>
        }
      />
      <Route
        path="reports/custom/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <ReportViewerPage />
          </Suspense>
        }
      />
      <Route
        path="reports/custom/:id/edit"
        element={
          <Suspense fallback={<PageLoader />}>
            <ReportBuilderPage />
          </Suspense>
        }
      />

      {/* Analytics */}
      <Route
        path="analytics/ftfr"
        element={
          <Suspense fallback={<PageLoader />}>
            <FTFRDashboard />
          </Suspense>
        }
      />
      <Route
        path="analytics/bi"
        element={
          <Suspense fallback={<PageLoader />}>
            <BIDashboard />
          </Suspense>
        }
      />
      <Route
        path="analytics/operations"
        element={
          <Suspense fallback={<PageLoader />}>
            <OperationsCommandCenter />
          </Suspense>
        }
      />
      <Route
        path="analytics/financial"
        element={
          <Suspense fallback={<PageLoader />}>
            <FinancialDashboard />
          </Suspense>
        }
      />
      <Route
        path="analytics/performance"
        element={
          <Suspense fallback={<PageLoader />}>
            <PerformanceScorecard />
          </Suspense>
        }
      />
      {/* AI Coaching */}
      <Route
        path="coaching"
        element={
          <Suspense fallback={<PageLoader />}>
            <CoachingPage />
          </Suspense>
        }
      />

      <Route
        path="analytics/insights"
        element={
          <Suspense fallback={<PageLoader />}>
            <AIInsightsPanel />
          </Suspense>
        }
      />
    </>
  );
}
