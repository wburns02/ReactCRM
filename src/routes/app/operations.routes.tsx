import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Equipment lazy imports
const EquipmentPage = lazy(() =>
  import("@/features/equipment/EquipmentPage.tsx").then((m) => ({
    default: m.EquipmentPage,
  }))
);

const EquipmentHealthPage = lazy(() =>
  import("@/features/equipment/index.ts").then((m) => ({
    default: m.EquipmentHealthPage,
  }))
);

// Inventory
const InventoryPage = lazy(() =>
  import("@/features/inventory/InventoryPage.tsx").then((m) => ({
    default: m.InventoryPage,
  }))
);

// Fleet
const FleetMapPage = lazy(() =>
  import("@/features/fleet/index.ts").then((m) => ({
    default: m.FleetMapPage,
  }))
);

// Tracking
const TrackingDashboard = lazy(() =>
  import("@/features/tracking/index.ts").then((m) => ({
    default: m.TrackingDashboard,
  }))
);

const TechnicianTracker = lazy(() =>
  import("@/features/tracking/index.ts").then((m) => ({
    default: m.TechnicianTracker,
  }))
);

// Predictive Maintenance
const PredictiveMaintenancePage = lazy(() =>
  import("@/features/predictive-maintenance/index.ts").then((m) => ({
    default: m.PredictiveMaintenancePage,
  }))
);

/**
 * Operations routes - Equipment, Inventory, Fleet, Tracking
 */
export function OperationsRoutes() {
  return (
    <>
      {/* Equipment */}
      <Route
        path="equipment"
        element={
          <Suspense fallback={<PageLoader />}>
            <EquipmentPage />
          </Suspense>
        }
      />
      <Route
        path="equipment/health"
        element={
          <Suspense fallback={<PageLoader />}>
            <EquipmentHealthPage />
          </Suspense>
        }
      />

      {/* Inventory */}
      <Route
        path="inventory"
        element={
          <Suspense fallback={<PageLoader />}>
            <InventoryPage />
          </Suspense>
        }
      />

      {/* Fleet */}
      <Route
        path="fleet"
        element={
          <Suspense fallback={<PageLoader />}>
            <FleetMapPage />
          </Suspense>
        }
      />

      {/* Tracking */}
      <Route
        path="tracking"
        element={
          <Suspense fallback={<PageLoader />}>
            <TrackingDashboard />
          </Suspense>
        }
      />
      <Route
        path="tracking/dispatch"
        element={
          <Suspense fallback={<PageLoader />}>
            <TechnicianTracker />
          </Suspense>
        }
      />

      {/* Predictive Maintenance */}
      <Route
        path="predictive-maintenance"
        element={
          <Suspense fallback={<PageLoader />}>
            <PredictiveMaintenancePage />
          </Suspense>
        }
      />
    </>
  );
}
