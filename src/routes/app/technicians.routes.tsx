import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Technician lazy imports
const TechniciansPage = lazy(() =>
  import("@/features/technicians/TechniciansPage.tsx").then((m) => ({
    default: m.TechniciansPage,
  }))
);

const TechnicianDetailPage = lazy(() =>
  import("@/features/technicians/TechnicianDetailPage.tsx").then((m) => ({
    default: m.TechnicianDetailPage,
  }))
);

const SchedulePage = lazy(() =>
  import("@/features/schedule/SchedulePage.tsx").then((m) => ({
    default: m.SchedulePage,
  }))
);

const ServiceIntervalsPage = lazy(() =>
  import("@/features/service-intervals/index.ts").then((m) => ({
    default: m.ServiceIntervalsPage,
  }))
);

const EmployeePortalPage = lazy(() =>
  import("@/features/employee/EmployeePortalPage.tsx").then((m) => ({
    default: m.EmployeePortalPage,
  }))
);

const PayrollPage = lazy(() =>
  import("@/features/payroll/PayrollPage.tsx").then((m) => ({
    default: m.PayrollPage,
  }))
);

const PayrollPeriodDetailPage = lazy(() =>
  import("@/features/payroll/PayrollPeriodDetailPage.tsx").then((m) => ({
    default: m.PayrollPeriodDetailPage,
  }))
);

/**
 * Technician routes - technicians, schedule, service intervals, employee portal
 */
export function TechnicianRoutes() {
  return (
    <>
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
