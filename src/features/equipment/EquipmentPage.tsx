import { useState } from "react";
import { AssetDashboardTab } from "./components/AssetDashboardTab.tsx";
import { AssetListTab } from "./components/AssetListTab.tsx";
import { MaintenanceTab } from "./components/MaintenanceTab.tsx";

type MainTab = "dashboard" | "assets" | "maintenance";

/**
 * Asset Management Page - Company Assets (Trucks, Pumps, Tools, PPE)
 * Thin orchestrator — tab logic only. Content lives in components/.
 */
export function EquipmentPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("dashboard");

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Asset Management
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track, maintain, and manage company assets
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {[
          { id: "dashboard" as const, label: "Dashboard", icon: "📊" },
          { id: "assets" as const, label: "All Assets", icon: "📦" },
          { id: "maintenance" as const, label: "Maintenance", icon: "🔧" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <AssetDashboardTab />}
      {activeTab === "assets" && <AssetListTab />}
      {activeTab === "maintenance" && <MaintenanceTab />}
    </div>
  );
}
