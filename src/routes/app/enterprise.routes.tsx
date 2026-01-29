import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { PageLoader } from "../utils";

// Enterprise lazy imports
const MultiRegionDashboard = lazy(() =>
  import("@/features/enterprise/index.ts").then((m) => ({
    default: m.MultiRegionDashboard,
  })),
);

const FranchiseManagement = lazy(() =>
  import("@/features/enterprise/index.ts").then((m) => ({
    default: m.FranchiseManagement,
  })),
);

const RolePermissions = lazy(() =>
  import("@/features/enterprise/index.ts").then((m) => ({
    default: m.RolePermissions,
  })),
);

const EnterpriseComplianceDashboard = lazy(() =>
  import("@/features/enterprise/index.ts").then((m) => ({
    default: m.ComplianceDashboard,
  })),
);

/**
 * Enterprise routes - Multi-region, Franchises, Permissions
 */
export function EnterpriseRoutes() {
  return (
    <>
      <Route
        path="enterprise/regions"
        element={
          <Suspense fallback={<PageLoader />}>
            <MultiRegionDashboard />
          </Suspense>
        }
      />
      <Route
        path="enterprise/franchises"
        element={
          <Suspense fallback={<PageLoader />}>
            <FranchiseManagement />
          </Suspense>
        }
      />
      <Route
        path="enterprise/permissions"
        element={
          <Suspense fallback={<PageLoader />}>
            <RolePermissions />
          </Suspense>
        }
      />
      <Route
        path="enterprise/compliance"
        element={
          <Suspense fallback={<PageLoader />}>
            <EnterpriseComplianceDashboard />
          </Suspense>
        }
      />
    </>
  );
}
