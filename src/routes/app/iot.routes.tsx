import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

const IoTDashboardPage = lazy(() =>
  import("@/features/iot/index").then((m) => ({
    default: m.IoTDashboard,
  })),
);

const DeviceDetailPage = lazy(() =>
  import("@/features/iot/index").then((m) => ({
    default: m.DeviceDetailPage,
  })),
);

/**
 * IoT Monitor routes — MAC Septic Watchful
 */
export function IoTRoutes() {
  return (
    <>
      <Route
        path="iot"
        element={
          <Suspense fallback={<PageLoader />}>
            <IoTDashboardPage />
          </Suspense>
        }
      />
      <Route
        path="iot/devices/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <DeviceDetailPage />
          </Suspense>
        }
      />
    </>
  );
}
