import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

const WorkflowAutomationsPage = lazy(() =>
  import("@/features/workflow-automations/index.ts").then((m) => ({
    default: m.WorkflowAutomationsPage,
  })),
);

const WorkflowEditorPage = lazy(() =>
  import("@/features/workflow-automations/index.ts").then((m) => ({
    default: m.WorkflowEditorPage,
  })),
);

const WorkflowDetailPage = lazy(() =>
  import("@/features/workflow-automations/index.ts").then((m) => ({
    default: m.WorkflowDetailPage,
  })),
);

export function AutomationsRoutes() {
  return (
    <>
      <Route
        path="automations"
        element={
          <Suspense fallback={<PageLoader />}>
            <WorkflowAutomationsPage />
          </Suspense>
        }
      />
      <Route
        path="automations/new"
        element={
          <Suspense fallback={<PageLoader />}>
            <WorkflowEditorPage />
          </Suspense>
        }
      />
      <Route
        path="automations/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <WorkflowDetailPage />
          </Suspense>
        }
      />
      <Route
        path="automations/:id/edit"
        element={
          <Suspense fallback={<PageLoader />}>
            <WorkflowEditorPage />
          </Suspense>
        }
      />
    </>
  );
}
