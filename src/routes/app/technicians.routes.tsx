import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Technician lazy imports
const TechniciansPage = lazy(() =>
  import("@/features/technicians/TechniciansPage.tsx").then((m) => ({
    default: m.TechniciansPage,
  })),
);

const TechnicianDetailPage = lazy(() =>
  import("@/features/technicians/TechnicianDetailPage.tsx").then((m) => ({
    default: m.TechnicianDetailPage,
  })),
);

const SchedulePage = lazy(() =>
  import("@/features/schedule/SchedulePage.tsx").then((m) => ({
    default: m.SchedulePage,
  })),
);

const ServiceIntervalsPage = lazy(() =>
  import("@/features/service-intervals/index.ts").then((m) => ({
    default: m.ServiceIntervalsPage,
  })),
);

const EmployeePortalPage = lazy(() =>
  import("@/features/employee/EmployeePortalPage.tsx").then((m) => ({
    default: m.EmployeePortalPage,
  })),
);

const PayrollPage = lazy(() =>
  import("@/features/payroll/PayrollPage.tsx").then((m) => ({
    default: m.PayrollPage,
  })),
);

const PayrollPeriodDetailPage = lazy(() =>
  import("@/features/payroll/PayrollPeriodDetailPage.tsx").then((m) => ({
    default: m.PayrollPeriodDetailPage,
  })),
);

const TechnicianDashboardPage = lazy(() =>
  import("@/features/technician-dashboard/TechnicianDashboardPage.tsx").then(
    (m) => ({ default: m.TechnicianDashboardPage }),
  ),
);

// Tech Portal pages
const TechSchedulePage = lazy(() =>
  import("@/features/technician-portal/TechSchedulePage.tsx").then(
    (m) => ({ default: m.TechSchedulePage }),
  ),
);

const TechJobsPage = lazy(() =>
  import("@/features/technician-portal/TechJobsPage.tsx").then(
    (m) => ({ default: m.TechJobsPage }),
  ),
);

const TechJobDetailPage = lazy(() =>
  import("@/features/technician-portal/TechJobDetailPage.tsx").then(
    (m) => ({ default: m.TechJobDetailPage }),
  ),
);

const TechTimeClockPage = lazy(() =>
  import("@/features/technician-portal/TechTimeClockPage.tsx").then(
    (m) => ({ default: m.TechTimeClockPage }),
  ),
);

const TechPayPage = lazy(() =>
  import("@/features/technician-portal/TechPayPage.tsx").then(
    (m) => ({ default: m.TechPayPage }),
  ),
);

const TechCommsPage = lazy(() =>
  import("@/features/technician-portal/TechCommsPage.tsx").then(
    (m) => ({ default: m.TechCommsPage }),
  ),
);

const TechSettingsPage = lazy(() =>
  import("@/features/technician-portal/TechSettingsPage.tsx").then(
    (m) => ({ default: m.TechSettingsPage }),
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
        path="portal/schedule"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechSchedulePage />
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
        path="portal/settings"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechSettingsPage />
          </Suspense>
        }
      />

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

      {/* Payroll */}
      <Route
        path="payroll"
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
