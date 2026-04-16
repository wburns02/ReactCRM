import { Suspense, lazy } from "react";
import { Route } from "react-router-dom";

import { PageLoader } from "../utils";


const RequisitionsListPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RequisitionsListPage })),
);

const RequisitionEditorPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RequisitionEditorPage })),
);

const RequisitionDetailPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RequisitionDetailPage })),
);

const ApplicantDetailPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.ApplicantDetailPage })),
);

const ApplicantsListPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.ApplicantsListPage })),
);


export function HrRoutes() {
  return (
    <>
      <Route
        path="hr/requisitions"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequisitionsListPage />
          </Suspense>
        }
      />
      <Route
        path="hr/requisitions/new"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequisitionEditorPage />
          </Suspense>
        }
      />
      <Route
        path="hr/requisitions/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequisitionDetailPage />
          </Suspense>
        }
      />
      <Route
        path="hr/applicants"
        element={
          <Suspense fallback={<PageLoader />}>
            <ApplicantsListPage />
          </Suspense>
        }
      />
      <Route
        path="hr/applicants/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <ApplicantDetailPage />
          </Suspense>
        }
      />
    </>
  );
}
