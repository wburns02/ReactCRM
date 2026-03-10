import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { PageLoader } from "../utils";

// Customer-related lazy imports
const ProspectsPage = lazy(() =>
  import("@/features/prospects/ProspectsPage").then((m) => ({
    default: m.ProspectsPage,
  })),
);

const ProspectDetailPage = lazy(() =>
  import("@/features/prospects/ProspectDetailPage").then((m) => ({
    default: m.ProspectDetailPage,
  })),
);

const CustomersPage = lazy(() =>
  import("@/features/customers/CustomersPage").then((m) => ({
    default: m.CustomersPage,
  })),
);

const CustomerDetailPage = lazy(() =>
  import("@/features/customers/CustomerDetailPage").then((m) => ({
    default: m.CustomerDetailPage,
  })),
);

const CustomerSuccessPage = lazy(() =>
  import("@/features/customer-success/index.ts").then((m) => ({
    default: m.CustomerSuccessPage,
  })),
);

const BookingsPage = lazy(() =>
  import("@/features/bookings/index.ts").then((m) => ({
    default: m.BookingsPage,
  })),
);

/**
 * Customer routes - Prospects, Customers, Customer Success
 */
export function CustomerRoutes() {
  return (
    <>
      {/* Prospects */}
      <Route
        path="prospects"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProspectsPage />
          </Suspense>
        }
      />
      <Route
        path="prospects/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProspectDetailPage />
          </Suspense>
        }
      />

      {/* Customers */}
      <Route
        path="customers"
        element={
          <Suspense fallback={<PageLoader />}>
            <CustomersPage />
          </Suspense>
        }
      />
      <Route
        path="customers/new"
        element={<Navigate to="/customers?action=new" replace />}
      />
      <Route
        path="customers/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <CustomerDetailPage />
          </Suspense>
        }
      />

      {/* Customer Success */}
      <Route
        path="customer-success"
        element={
          <Suspense fallback={<PageLoader />}>
            <CustomerSuccessPage />
          </Suspense>
        }
      />

      {/* Bookings (admin management) */}
      <Route
        path="bookings"
        element={
          <Suspense fallback={<PageLoader />}>
            <BookingsPage />
          </Suspense>
        }
      />
    </>
  );
}
