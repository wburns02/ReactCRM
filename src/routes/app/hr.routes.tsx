import { Suspense, lazy } from "react";
import { Route } from "react-router-dom";

import { PageLoader } from "../utils";


const RequisitionsListPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RequisitionsListPage })),
);

const RequisitionEditorPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RequisitionEditorPage })),
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
    </>
  );
}
