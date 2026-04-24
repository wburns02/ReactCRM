import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { PageLoader } from "../utils";

// Technician lazy imports
const TechniciansPage = lazy(() =>
  import("@/features/technicians/TechniciansPage").then((m) => ({
    default: m.TechniciansPage,
  })),
);

const TechnicianDetailPage = lazy(() =>
  import("@/features/technicians/TechnicianDetailPage").then((m) => ({
    default: m.TechnicianDetailPage,
  })),
);

const SchedulePage = lazy(() =>
  import("@/features/schedule/SchedulePage").then((m) => ({
    default: m.SchedulePage,
  })),
);

const ServiceIntervalsPage = lazy(() =>
  import("@/features/service-intervals/index.ts").then((m) => ({
    default: m.ServiceIntervalsPage,
  })),
);

const EmployeePortalPage = lazy(() =>
  import("@/features/employee/EmployeePortalPage").then((m) => ({
    default: m.EmployeePortalPage,
  })),
);

const PayrollPage = lazy(() =>
  import("@/features/payroll/PayrollPage").then((m) => ({
    default: m.PayrollPage,
  })),
);

const PayrollPeriodDetailPage = lazy(() =>
  import("@/features/payroll/PayrollPeriodDetailPage").then((m) => ({
    default: m.PayrollPeriodDetailPage,
  })),
);

const PayrollOverviewPage = lazy(() =>
  import("@/features/payroll/pages/PayrollOverviewPage").then((m) => ({
    default: m.PayrollOverviewPage,
  })),
);

const PayrollPeoplePage = lazy(() =>
  import("@/features/payroll/pages/PayrollPeoplePage").then((m) => ({
    default: m.PayrollPeoplePage,
  })),
);

const TechnicianDashboardPage = lazy(() =>
  import("@/features/technician-dashboard/TechnicianDashboardPage").then(
    (m) => ({ default: m.TechnicianDashboardPage }),
  ),
);

// Tech Portal pages
const TechHomePage = lazy(() =>
  import("@/features/technician-portal/TechHomePage").then(
    (m) => ({ default: m.TechHomePage }),
  ),
);

const TechSchedulePage = lazy(() =>
  import("@/features/technician-portal/TechSchedulePage").then(
    (m) => ({ default: m.TechSchedulePage }),
  ),
);

const TechJobsPage = lazy(() =>
  import("@/features/technician-portal/TechJobsPage").then(
    (m) => ({ default: m.TechJobsPage }),
  ),
);

const TechJobDetailPage = lazy(() =>
  import("@/features/technician-portal/TechJobDetailPage").then(
    (m) => ({ default: m.TechJobDetailPage }),
  ),
);

const TechTimeClockPage = lazy(() =>
  import("@/features/technician-portal/TechTimeClockPage").then(
    (m) => ({ default: m.TechTimeClockPage }),
  ),
);

const TechPayPage = lazy(() =>
  import("@/features/technician-portal/TechPayPage").then(
    (m) => ({ default: m.TechPayPage }),
  ),
);

const TechCommsPage = lazy(() =>
  import("@/features/technician-portal/TechCommsPage").then(
    (m) => ({ default: m.TechCommsPage }),
  ),
);

const TechSettingsPage = lazy(() =>
  import("@/features/technician-portal/TechSettingsPage").then(
    (m) => ({ default: m.TechSettingsPage }),
  ),
);

const TechDVIRPage = lazy(() =>
  import("@/features/technician-portal/TechDVIRPage").then(
    (m) => ({ default: m.TechDVIRPage }),
  ),
);

const GamificationHub = lazy(() =>
  import("@/features/technician-portal/components/GamificationHub").then(
    (m) => ({ default: m.GamificationHub }),
  ),
);

/**
 * Technician routes - technicians, schedule, service intervals, employee portal
 */
export function TechnicianRoutes() {
  return (
    <>
      {/* Technician Dashboard (simple view for field techs) */}
      <Route
        path="my-dashboard"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechnicianDashboardPage />
          </Suspense>
        }
      />

      {/* Tech Portal Pages */}
      <Route
        path="portal/home"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechHomePage />
          </Suspense>
        }
      />
      <Route
        path="portal/schedule"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechSchedulePage />
          </Suspense>
        }
      />
      <Route
        path="portal/dvir"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechDVIRPage />
          </Suspense>
        }
      />
      <Route
        path="portal/jobs"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechJobsPage />
          </Suspense>
        }
      />
      <Route
        path="portal/jobs/:jobId"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechJobDetailPage />
          </Suspense>
        }
      />
      <Route
        path="portal/time-clock"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechTimeClockPage />
          </Suspense>
        }
      />
      <Route
        path="portal/pay"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechPayPage />
          </Suspense>
        }
      />
      <Route
        path="portal/messages"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechCommsPage />
          </Suspense>
        }
      />
      <Route
        path="portal/achievements"
        element={
          <Suspense fallback={<PageLoader />}>
            <GamificationHub />
          </Suspense>
        }
      />
      <Route
        path="portal/settings"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechSettingsPage />
          </Suspense>
        }
      />

      {/* /technician → /technicians redirect (singular alias) */}
      <Route path="technician" element={<Navigate to="/technicians" replace />} />

      {/* Technicians */}
      <Route
        path="technicians"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechniciansPage />
          </Suspense>
        }
      />
      <Route
        path="technicians/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechnicianDetailPage />
          </Suspense>
        }
      />

      {/* Schedule */}
      <Route
        path="schedule"
        element={
          <Suspense fallback={<PageLoader />}>
            <SchedulePage />
          </Suspense>
        }
      />

      {/* Service Intervals */}
      <Route
        path="service-intervals"
        element={
          <Suspense fallback={<PageLoader />}>
            <ServiceIntervalsPage />
          </Suspense>
        }
      />

      {/* Employee Portal */}
      <Route
        path="employee"
        element={
          <Suspense fallback={<PageLoader />}>
            <EmployeePortalPage />
          </Suspense>
        }
      />

      {/* Payroll — new Rippling-style overview is default */}
      <Route
        path="payroll"
        element={
          <Suspense fallback={<PageLoader />}>
            <PayrollOverviewPage />
          </Suspense>
        }
      />
      <Route
        path="payroll/people"
        element={
          <Suspense fallback={<PageLoader />}>
            <PayrollPeoplePage />
          </Suspense>
        }
      />
      <Route
        path="payroll/periods"
        element={
          <Suspense fallback={<PageLoader />}>
            <PayrollPage />
          </Suspense>
        }
      />
      <Route
        path="payroll/:periodId"
        element={
          <Suspense fallback={<PageLoader />}>
            <PayrollPeriodDetailPage />
          </Suspense>
        }
      />
    </>
  );
}
