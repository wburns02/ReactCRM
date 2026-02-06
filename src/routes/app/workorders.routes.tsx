import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Work order lazy imports
const WorkOrdersPage = lazy(() =>
  import("@/features/workorders/WorkOrdersPage.tsx").then((m) => ({
    default: m.WorkOrdersPage,
  })),
);

const NewWorkOrderPage = lazy(() =>
  import("@/features/workorders/NewWorkOrderPage.tsx").then((m) => ({
    default: m.NewWorkOrderPage,
  })),
);

const WorkOrderDetailPage = lazy(() =>
  import("@/features/workorders/WorkOrderDetailPage.tsx").then((m) => ({
    default: m.WorkOrderDetailPage,
  })),
);

const CalendarView = lazy(() =>
  import("@/features/workorders/views/CalendarView.tsx").then((m) => ({
    default: m.CalendarView,
  })),
);

const KanbanBoard = lazy(() =>
  import("@/features/workorders/views/KanbanBoard.tsx").then((m) => ({
    default: m.KanbanBoard,
  })),
);

const MapView = lazy(() =>
  import("@/features/workorders/views/MapView.tsx").then((m) => ({
    default: m.MapView,
  })),
);

/**
 * Work order routes - list, calendar, board, map views
 */
export function WorkOrderRoutes() {
  return (
    <>
      <Route
        path="work-orders"
        element={
          <Suspense fallback={<PageLoader />}>
            <WorkOrdersPage />
          </Suspense>
        }
      />
      <Route
        path="work-orders/new"
        element={
          <Suspense fallback={<PageLoader />}>
            <NewWorkOrderPage />
          </Suspense>
        }
      />
      <Route
        path="work-orders/calendar"
        element={
          <Suspense fallback={<PageLoader />}>
            <CalendarView />
          </Suspense>
        }
      />
      <Route
        path="work-orders/board"
        element={
          <Suspense fallback={<PageLoader />}>
            <KanbanBoard />
          </Suspense>
        }
      />
      <Route
        path="work-orders/map"
        element={
          <Suspense fallback={<PageLoader />}>
            <MapView />
          </Suspense>
        }
      />
      <Route
        path="work-orders/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <WorkOrderDetailPage />
          </Suspense>
        }
      />
    </>
  );
}
