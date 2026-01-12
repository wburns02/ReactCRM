import { useLocation } from "react-router-dom";
import { SettingsTabs } from "./components/SettingsTabs.tsx";
import { GeneralSettings } from "./components/GeneralSettings.tsx";
import { NotificationSettings } from "./components/NotificationSettings.tsx";
import { IntegrationSettings } from "./components/IntegrationSettings.tsx";
import { SecuritySettings } from "./components/SecuritySettings.tsx";
import { ApiSettings } from "./components/ApiSettings.tsx";

/**
 * Admin Settings Page
 * Tab-based settings interface for system configuration
 */
export function AdminSettingsPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeTab = params.get("tab") || "general";

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary mt-1">
            Manage system settings and configurations
          </p>
        </div>

        {/* Tabs */}
        <SettingsTabs />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "integrations" && <IntegrationSettings />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "api" && <ApiSettings />}
        </div>
      </div>
    </div>
  );
}
