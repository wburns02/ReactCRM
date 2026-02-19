import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

const PropertyIntelDashboard = lazy(() =>
  import("@/features/property-intelligence/index.ts").then((m) => ({
    default: m.PropertyIntelDashboard,
  })),
);

const PropertySearchPage = lazy(() =>
  import("@/features/property-intelligence/index.ts").then((m) => ({
    default: m.PropertySearchPage,
  })),
);

const PropertyDetailPage = lazy(() =>
  import("@/features/property-intelligence/index.ts").then((m) => ({
    default: m.PropertyDetailPage,
  })),
);

/**
 * Property Intelligence routes — on-premise government data
 */
export function PropertyIntelligenceRoutes() {
  return (
    <>
      <Route
        path="property-intelligence"
        element={
          <Suspense fallback={<PageLoader />}>
            <PropertyIntelDashboard />
          </Suspense>
        }
      />
      <Route
        path="property-intelligence/search"
        element={
          <Suspense fallback={<PageLoader />}>
            <PropertySearchPage />
          </Suspense>
        }
      />
      <Route
        path="property-intelligence/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <PropertyDetailPage />
          </Suspense>
        }
      />
    </>
  );
}
