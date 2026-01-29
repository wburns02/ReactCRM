import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { RequireAuth } from "@/features/auth/RequireAuth.tsx";
import { PageLoader } from "../utils";

// Field service lazy imports
const FieldLayout = lazy(() =>
  import("@/features/field/FieldLayout.tsx").then((m) => ({
    default: m.FieldLayout,
  })),
);

const MyJobsPage = lazy(() =>
  import("@/features/field/pages/MyJobsPage.tsx").then((m) => ({
    default: m.MyJobsPage,
  })),
);

const JobDetailPage = lazy(() =>
  import("@/features/field/pages/JobDetailPage.tsx").then((m) => ({
    default: m.JobDetailPage,
  })),
);

const JobCompletionFlow = lazy(() =>
  import("@/features/field/pages/JobCompletionFlow.tsx").then((m) => ({
    default: m.JobCompletionFlow,
  })),
);

const RouteView = lazy(() =>
  import("@/features/field/pages/RouteView.tsx").then((m) => ({
    default: m.RouteView,
  })),
);

const RouteDetail = lazy(() =>
  import("@/features/field/pages/RouteDetail.tsx").then((m) => ({
    default: m.RouteDetail,
  })),
);

const TechStatsPage = lazy(() =>
  import("@/features/field/pages/TechStatsPage.tsx").then((m) => ({
    default: m.TechStatsPage,
  })),
);

const TechProfilePage = lazy(() =>
  import("@/features/field/pages/TechProfilePage.tsx").then((m) => ({
    default: m.TechProfilePage,
  })),
);

/**
 * Field Service Routes - Mobile Technician Experience
 * All routes under /field/* require authentication
 */
export function FieldRoutes() {
  return (
    <Route
      path="/field"
      element={
        <RequireAuth>
          <Suspense fallback={<PageLoader />}>
            <FieldLayout />
          </Suspense>
        </RequireAuth>
      }
    >
      <Route
        index
        element={
          <Suspense fallback={<PageLoader />}>
            <MyJobsPage />
          </Suspense>
        }
      />
      <Route
        path="job/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <JobDetailPage />
          </Suspense>
        }
      />
      <Route
        path="job/:id/complete"
        element={
          <Suspense fallback={<PageLoader />}>
            <JobCompletionFlow />
          </Suspense>
        }
      />
      <Route
        path="route"
        element={
          <Suspense fallback={<PageLoader />}>
            <RouteView />
          </Suspense>
        }
      />
      <Route
        path="route/:jobId"
        element={
          <Suspense fallback={<PageLoader />}>
            <RouteDetail />
          </Suspense>
        }
      />
      <Route
        path="stats"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechStatsPage />
          </Suspense>
        }
      />
      <Route
        path="profile"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechProfilePage />
          </Suspense>
        }
      />
    </Route>
  );
}
