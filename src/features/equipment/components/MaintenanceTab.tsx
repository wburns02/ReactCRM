import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { useAssetDashboard, useAssets } from "@/api/hooks/useAssets.ts";
import { type Asset, ASSET_TYPE_MAP } from "@/api/types/assets.ts";

function MaintenanceAlertRow({ asset }: { asset: Asset }) {
  const typeInfo = ASSET_TYPE_MAP[asset.asset_type];
  const daysOverdue = asset.next_maintenance_date
    ? Math.floor(
        (new Date().getTime() -
          new Date(asset.next_maintenance_date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-secondary">
      <div className="flex items-center gap-3">
        <span className="text-lg">{typeInfo?.icon || "📦"}</span>
        <div>
          <p className="text-sm font-medium text-text-primary">{asset.name}</p>
          <p className="text-xs text-text-secondary">
            {asset.asset_tag}
            {asset.next_maintenance_date &&
              ` · Due ${new Date(asset.next_maintenance_date).toLocaleDateString()}`}
          </p>
        </div>
      </div>
      {daysOverdue > 0 && (
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          {daysOverdue}d overdue
        </span>
      )}
    </div>
  );
}

export function MaintenanceTab() {
  const { data: dashboard } = useAssetDashboard();
  const { data: assetsData } = useAssets({ page_size: 100 });

  const maintenanceAssets = useMemo(() => {
    if (!assetsData?.items) return { overdue: [], upcoming: [] };
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdue = assetsData.items.filter(
      (a) => a.next_maintenance_date && new Date(a.next_maintenance_date) < today,
    );
    const upcoming = assetsData.items.filter(
      (a) =>
        a.next_maintenance_date &&
        new Date(a.next_maintenance_date) >= today &&
        new Date(a.next_maintenance_date) <= nextWeek,
    );

    return {
      overdue: overdue.sort(
        (a, b) =>
          new Date(a.next_maintenance_date!).getTime() -
          new Date(b.next_maintenance_date!).getTime(),
      ),
      upcoming: upcoming.sort(
        (a, b) =>
          new Date(a.next_maintenance_date!).getTime() -
          new Date(b.next_maintenance_date!).getTime(),
      ),
    };
  }, [assetsData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={dashboard?.maintenance_overdue ? "ring-2 ring-red-300" : ""}>
          <CardContent className="py-4">
            <p className="text-sm text-text-secondary">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {dashboard?.maintenance_overdue || 0}
            </p>
          </CardContent>
        </Card>
        <Card className={dashboard?.maintenance_due ? "ring-2 ring-amber-300" : ""}>
          <CardContent className="py-4">
            <p className="text-sm text-text-secondary">Due This Week</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {dashboard?.maintenance_due || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-secondary">Recent Service</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {dashboard?.recent_maintenance?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">
            Overdue Maintenance ({maintenanceAssets.overdue.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {maintenanceAssets.overdue.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-2xl">✅</span>
              <p className="text-sm text-text-secondary mt-2">
                No overdue maintenance
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {maintenanceAssets.overdue.map((asset) => (
                <MaintenanceAlertRow key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-amber-600">
            Due This Week ({maintenanceAssets.upcoming.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {maintenanceAssets.upcoming.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-2xl">📅</span>
              <p className="text-sm text-text-secondary mt-2">
                No maintenance due this week
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {maintenanceAssets.upcoming.map((asset) => (
                <MaintenanceAlertRow key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Service History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Service History</CardTitle>
        </CardHeader>
        <CardContent>
          {!dashboard?.recent_maintenance?.length ? (
            <p className="text-sm text-text-secondary text-center py-6">
              No recent maintenance records
            </p>
          ) : (
            <div className="space-y-2">
              {dashboard.recent_maintenance.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {log.title}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {log.maintenance_type} &middot;{" "}
                      {log.performed_at
                        ? new Date(log.performed_at).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                  {log.cost != null && log.cost > 0 && (
                    <span className="text-sm font-medium">
                      ${log.cost.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
