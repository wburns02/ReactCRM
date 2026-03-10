import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { PageLoader } from "../utils";

// Admin lazy imports
const UsersPage = lazy(() =>
  import("@/features/users/UsersPage").then((m) => ({
    default: m.UsersPage,
  })),
);

const AdminSettingsPage = lazy(() =>
  import("@/features/admin/AdminSettingsPage").then((m) => ({
    default: m.AdminSettingsPage,
  })),
);

const DataImportPage = lazy(() =>
  import("@/features/import/index.ts").then((m) => ({
    default: m.DataImportPage,
  })),
);

const IntegrationsPage = lazy(() =>
  import("@/features/integrations/index.ts").then((m) => ({
    default: m.IntegrationsPage,
  })),
);

// Notifications
const NotificationsListPage = lazy(() =>
  import("@/features/notifications/index.ts").then((m) => ({
    default: m.NotificationsListPage,
  })),
);

const NotificationSettingsPage = lazy(() =>
  import("@/features/notifications/index.ts").then((m) => ({
    default: m.NotificationSettingsPage,
  })),
);

// SMS Settings
const SMSSettingsPage = lazy(() =>
  import("@/features/sms/index.ts").then((m) => ({
    default: m.SMSSettingsPage,
  })),
);

// Dump Sites
const DumpSitesPage = lazy(() =>
  import("@/features/admin/DumpSitesPage").then((m) => ({
    default: m.DumpSitesPage,
  })),
);

// Company Entities (Multi-LLC)
const EntitiesPage = lazy(() =>
  import("@/features/admin/EntitiesPage").then((m) => ({
    default: m.EntitiesPage,
  })),
);

// Activity Analytics
const ActivityAnalyticsPage = lazy(() =>
  import("@/features/admin/ActivityAnalyticsPage").then((m) => ({
    default: m.ActivityAnalyticsPage,
  })),
);

/**
 * Admin routes - Users, Settings, Import, Integrations, Notifications
 */
export function AdminRoutes() {
  return (
    <>
      {/* Users */}
      <Route
        path="users"
        element={
          <Suspense fallback={<PageLoader />}>
            <UsersPage />
          </Suspense>
        }
      />

      {/* Admin Settings */}
      <Route
        path="admin"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminSettingsPage />
          </Suspense>
        }
      />
      {/* Settings alias (dashboard quick link points here) */}
      <Route
        path="settings"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminSettingsPage />
          </Suspense>
        }
      />

      {/* Redirect /admin/settings → /settings */}
      <Route
        path="admin/settings"
        element={<Navigate to="/settings" replace />}
      />

      {/* Data Import */}
      <Route
        path="admin/import"
        element={
          <Suspense fallback={<PageLoader />}>
            <DataImportPage />
          </Suspense>
        }
      />

      {/* Integrations */}
      <Route
        path="integrations"
        element={
          <Suspense fallback={<PageLoader />}>
            <IntegrationsPage />
          </Suspense>
        }
      />

      {/* Notifications */}
      <Route
        path="notifications"
        element={
          <Suspense fallback={<PageLoader />}>
            <NotificationsListPage />
          </Suspense>
        }
      />
      <Route
        path="settings/notifications"
        element={
          <Suspense fallback={<PageLoader />}>
            <NotificationSettingsPage />
          </Suspense>
        }
      />

      {/* SMS Settings */}
      <Route
        path="settings/sms"
        element={
          <Suspense fallback={<PageLoader />}>
            <SMSSettingsPage />
          </Suspense>
        }
      />

      {/* Dump Sites */}
      <Route
        path="admin/dump-sites"
        element={
          <Suspense fallback={<PageLoader />}>
            <DumpSitesPage />
          </Suspense>
        }
      />

      {/* Company Entities (Multi-LLC) */}
      <Route
        path="admin/entities"
        element={
          <Suspense fallback={<PageLoader />}>
            <EntitiesPage />
          </Suspense>
        }
      />

      {/* Activity Analytics */}
      <Route
        path="admin/activity"
        element={
          <Suspense fallback={<PageLoader />}>
            <ActivityAnalyticsPage />
          </Suspense>
        }
      />
    </>
  );
}
