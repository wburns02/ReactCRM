import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { useAssetDashboard } from "@/api/hooks/useAssets.ts";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
  ASSET_CONDITION_LABELS,
  ASSET_CONDITION_COLORS,
  ASSET_TYPE_MAP,
} from "@/api/types/assets.ts";

function StatCard({
  label,
  value,
  icon,
  color,
  alert,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "ring-2 ring-amber-300 dark:ring-amber-700" : ""}>
      <CardContent className="py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-text-secondary">{label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${color} mt-1`}>
              {value}
            </p>
          </div>
          <span className="text-2xl sm:text-3xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function AssetDashboardTab() {
  const { data: dashboard, isLoading } = useAssetDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-6">
              <div className="animate-pulse h-16 bg-surface-secondary rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const d = dashboard || {
    total_assets: 0,
    total_value: 0,
    by_status: {},
    by_type: {},
    by_condition: {},
    maintenance_due: 0,
    maintenance_overdue: 0,
    recently_added: [],
    recent_maintenance: [],
    low_condition_assets: [],
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Assets"
          value={d.total_assets}
          icon="📦"
          color="text-blue-600"
        />
        <StatCard
          label="Total Value"
          value={`$${d.total_value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon="💰"
          color="text-green-600"
        />
        <StatCard
          label="Maintenance Due"
          value={d.maintenance_due}
          icon="🔧"
          color="text-amber-600"
          alert={d.maintenance_due > 0}
        />
        <StatCard
          label="Overdue"
          value={d.maintenance_overdue}
          icon="⚠️"
          color="text-red-600"
          alert={d.maintenance_overdue > 0}
        />
      </div>

      {/* Status & Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle>Assets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(d.by_status).length === 0 ? (
              <p className="text-sm text-text-secondary">No assets yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(d.by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ASSET_STATUS_COLORS[status as keyof typeof ASSET_STATUS_COLORS] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ASSET_STATUS_LABELS[status as keyof typeof ASSET_STATUS_LABELS] || status}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle>Assets by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(d.by_type).length === 0 ? (
              <p className="text-sm text-text-secondary">No assets yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(d.by_type)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const info = ASSET_TYPE_MAP[type];
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {info?.icon || "📦"}
                          </span>
                          <span className="text-sm text-text-primary">
                            {info?.label || type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-surface-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${Math.min((count / Math.max(d.total_assets, 1)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-text-primary w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recently Added & Condition Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Added */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Added</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recently_added.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No assets added yet. Click "Add Asset" to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {d.recently_added.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {ASSET_TYPE_MAP[asset.asset_type]?.icon || "📦"}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {asset.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {asset.asset_tag} &middot;{" "}
                          {ASSET_TYPE_MAP[asset.asset_type]?.label || asset.asset_type}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ASSET_STATUS_COLORS[asset.status as keyof typeof ASSET_STATUS_COLORS] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS] || asset.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condition Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Condition Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {d.low_condition_assets.length === 0 ? (
              <div className="text-center py-4">
                <span className="text-2xl">✅</span>
                <p className="text-sm text-text-secondary mt-2">
                  All assets in good condition
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {d.low_condition_assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {asset.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {asset.asset_tag}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ASSET_CONDITION_COLORS[asset.condition as keyof typeof ASSET_CONDITION_COLORS] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ASSET_CONDITION_LABELS[asset.condition as keyof typeof ASSET_CONDITION_LABELS] || asset.condition}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
