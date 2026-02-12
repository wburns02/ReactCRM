import { useContractReports } from "../api/contracts.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { formatCurrency } from "@/lib/utils.ts";

const TYPE_LABELS: Record<string, string> = {
  "multi-year": "Multi-Year",
  "annual": "Annual",
  "maintenance": "Maintenance",
  "service": "Service",
};

export function ReportsTab() {
  const { data: stats, isLoading, error } = useContractReports();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger rounded-lg p-4 text-danger">
        Failed to load contract reports: {error.message}
      </div>
    );
  }

  if (!stats) return null;

  const statusCounts = stats.status_counts || {};
  const totalContracts = Object.values(statusCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Recurring Revenue</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
              {formatCurrency(stats.total_recurring_revenue)}
            </p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-2">
              From {statusCounts.active || 0} active contracts
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Renewal Rate</p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {stats.renewal_rate}%
            </p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
              {statusCounts.renewed || 0} renewed / {(statusCounts.renewed || 0) + (statusCounts.expired || 0)} eligible
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-800">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Churn Rate</p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">
              {stats.churn_rate}%
            </p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-2">
              {statusCounts.cancelled || 0} cancelled in last year
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Expiring Soon</p>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
              {stats.expiring_30}
            </p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-2">
              {stats.expiring_60} in 60d / {stats.expiring_90} in 90d / {stats.overdue_count} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown + Type Breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statusCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => {
                  const pct = totalContracts > 0 ? Math.round((count / totalContracts) * 100) : 0;
                  const variant = status === "active" ? "success" :
                                  status === "expired" ? "danger" :
                                  status === "cancelled" ? "danger" :
                                  status === "pending" ? "warning" :
                                  status === "renewed" ? "info" : "default";
                  const barColor = status === "active" ? "bg-success" :
                                   status === "expired" ? "bg-danger" :
                                   status === "cancelled" ? "bg-danger/70" :
                                   status === "pending" ? "bg-warning" :
                                   status === "renewed" ? "bg-info" : "bg-bg-muted";
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={variant} className="capitalize">{status}</Badge>
                          <span className="text-sm text-text-muted">{count} contracts</span>
                        </div>
                        <span className="text-sm font-medium text-text-primary">{pct}%</span>
                      </div>
                      <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Contract Type</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.avg_by_type.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No active contracts to analyze
              </div>
            ) : (
              <div className="space-y-4">
                {stats.avg_by_type.map((item) => (
                  <div key={item.contract_type} className="p-3 bg-bg-hover rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-text-primary capitalize">
                        {TYPE_LABELS[item.contract_type] || item.contract_type}
                      </span>
                      <span className="font-bold text-text-primary">
                        {formatCurrency(item.total_value)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-muted">
                      <span>{item.count} contract{item.count !== 1 ? "s" : ""}</span>
                      <span>Avg: {formatCurrency(item.avg_value)}</span>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="font-semibold text-text-primary">Total Active Revenue</span>
                  <span className="text-xl font-bold text-success">
                    {formatCurrency(stats.total_recurring_revenue)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Tier */}
      {stats.revenue_by_tier && stats.revenue_by_tier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...stats.revenue_by_tier]
                .sort((a, b) => b.total_value - a.total_value)
                .map((item) => {
                  const totalTierRevenue = stats.revenue_by_tier!.reduce((s, v) => s + v.total_value, 0);
                  const pct = totalTierRevenue > 0 ? Math.round((item.total_value / totalTierRevenue) * 100) : 0;
                  const tierLabels: Record<string, string> = {
                    residential: "Residential",
                    commercial_small: "Commercial Small",
                    commercial_medium: "Commercial Medium",
                    commercial_large: "Commercial Large",
                    neighborhood: "Neighborhood",
                  };
                  return (
                    <div key={item.tier}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">{tierLabels[item.tier] || item.tier}</span>
                          <span className="text-xs text-text-muted">{item.count} contracts</span>
                        </div>
                        <span className="text-sm font-bold text-text-primary">{formatCurrency(item.total_value)}</span>
                      </div>
                      <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Neighborhood Bundle Performance + Upsell & Referral Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Neighborhood Stats */}
        {stats.neighborhood_stats && (
          <Card>
            <CardHeader>
              <CardTitle>Neighborhood Bundles</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.neighborhood_stats.total_bundle_contracts === 0 ? (
                <div className="text-center py-6 text-text-muted">No neighborhood bundles yet</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-bg-hover rounded-lg text-center">
                      <p className="text-2xl font-bold text-text-primary">{stats.neighborhood_stats.total_bundle_contracts}</p>
                      <p className="text-xs text-text-muted">Bundled Contracts</p>
                    </div>
                    <div className="p-3 bg-bg-hover rounded-lg text-center">
                      <p className="text-2xl font-bold text-success">{formatCurrency(stats.neighborhood_stats.bundle_revenue)}</p>
                      <p className="text-xs text-text-muted">Bundle Revenue</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upsell & Referral Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Upsells & Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.upsell_conversions != null && (
                <div className="p-3 bg-bg-hover rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Upsell Conversions</p>
                    <p className="text-xs text-text-muted">Contracts upgraded from previous tier</p>
                  </div>
                  <span className="text-2xl font-bold text-text-primary">{stats.upsell_conversions}</span>
                </div>
              )}
              {stats.referral_stats && (
                <>
                  <div className="p-3 bg-bg-hover rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Referral Contracts</p>
                      <p className="text-xs text-text-muted">Signed via referral codes</p>
                    </div>
                    <span className="text-2xl font-bold text-text-primary">{stats.referral_stats.total_referrals}</span>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Referral Revenue</p>
                      <p className="text-xs text-green-600/70 dark:text-green-400/70">Revenue from referred contracts</p>
                    </div>
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(stats.referral_stats.referral_revenue)}</span>
                  </div>
                </>
              )}
              {stats.add_on_stats && (
                <div className="p-3 bg-bg-hover rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Contracts with Add-Ons</p>
                    <p className="text-xs text-text-muted">Using telemetry, emergency, pumping, or chlorine</p>
                  </div>
                  <span className="text-2xl font-bold text-text-primary">{stats.add_on_stats.contracts_with_add_ons}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Churn by Tier */}
      {stats.churn_by_tier && Object.keys(stats.churn_by_tier).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Churn Rate by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(stats.churn_by_tier as Record<string, number>).map(([tier, rate]) => {
                const tierLabels: Record<string, string> = {
                  residential: "Residential",
                  commercial_small: "Comm. Small",
                  commercial_medium: "Comm. Medium",
                  commercial_large: "Comm. Large",
                  neighborhood: "Neighborhood",
                };
                return (
                  <div key={tier} className="p-3 bg-bg-hover rounded-lg text-center">
                    <p className={`text-2xl font-bold ${rate > 10 ? "text-danger" : rate > 5 ? "text-warning" : "text-success"}`}>
                      {rate}%
                    </p>
                    <p className="text-xs text-text-muted mt-1">{tierLabels[tier] || tier}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      {stats.monthly_data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Contract Activity (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-text-muted font-medium">Month</th>
                    <th className="text-right py-2 px-3 text-text-muted font-medium">New Contracts</th>
                    <th className="text-right py-2 px-3 text-text-muted font-medium">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monthly_data.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0 hover:bg-bg-hover">
                      <td className="py-2 px-3 text-text-primary">
                        {row.month
                          ? new Date(row.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                          : "Unknown"}
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary font-medium">
                        {row.count}
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary font-medium">
                        {formatCurrency(row.total_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
