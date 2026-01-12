/**
 * Multi-Region Dashboard
 * Cross-region performance comparison and management
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useRegions,
  useRegionPerformance,
  useRegionComparison,
} from "@/api/hooks/useEnterprise";
import type { Region, MultiRegionFilters } from "@/api/types/enterprise";
import { formatCurrency, cn } from "@/lib/utils";

export function MultiRegionDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<string>("total_revenue");
  const [dateRange] = useState<MultiRegionFilters>({
    include_all_regions: true,
  });

  const { data: regions, isLoading: regionsLoading } = useRegions();
  const { data: performance, isLoading: perfLoading } =
    useRegionPerformance(dateRange);
  const { data: comparison, isLoading: compLoading } =
    useRegionComparison(selectedMetric);

  const metrics = [
    { id: "total_revenue", label: "Revenue", format: formatCurrency },
    {
      id: "completion_rate",
      label: "Completion Rate",
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
    {
      id: "first_time_fix_rate",
      label: "First Time Fix",
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
    {
      id: "customer_satisfaction",
      label: "CSAT",
      format: (v: number) => `${v.toFixed(1)}/5`,
    },
    {
      id: "technician_utilization",
      label: "Tech Utilization",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
  ];

  // Calculate totals
  const totals = performance?.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.total_revenue,
      workOrders: acc.workOrders + p.total_work_orders,
      customers: acc.customers + p.total_customers,
      technicians: acc.technicians + p.technician_count,
    }),
    { revenue: 0, workOrders: 0, customers: 0, technicians: 0 },
  ) || { revenue: 0, workOrders: 0, customers: 0, technicians: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Multi-Region Dashboard
          </h1>
          <p className="text-text-secondary">
            Compare performance across {regions?.length || 0} regions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export Report</Button>
          <Button variant="primary">Add Region</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Revenue"
          value={formatCurrency(totals.revenue)}
          icon="💰"
        />
        <SummaryCard
          label="Total Work Orders"
          value={totals.workOrders.toLocaleString()}
          icon="📋"
        />
        <SummaryCard
          label="Total Customers"
          value={totals.customers.toLocaleString()}
          icon="👥"
        />
        <SummaryCard
          label="Total Technicians"
          value={totals.technicians.toLocaleString()}
          icon="🔧"
        />
      </div>

      {/* Metric Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Region Comparison</CardTitle>
            <div className="flex gap-1">
              {metrics.map((m) => (
                <Button
                  key={m.id}
                  variant={selectedMetric === m.id ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedMetric(m.id)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {compLoading ? (
            <div className="h-40 bg-background-secondary animate-pulse rounded" />
          ) : comparison ? (
            <div className="space-y-4">
              {/* Best/Worst performers */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-success">🏆 Best:</span>
                  <span className="font-medium">
                    {comparison.best_performer}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Average:</span>
                  <span className="font-medium">
                    {metrics
                      .find((m) => m.id === selectedMetric)
                      ?.format(comparison.average)}
                  </span>
                </div>
              </div>

              {/* Region bars */}
              <div className="space-y-3">
                {comparison.regions
                  .sort((a, b) => b.value - a.value)
                  .map((region) => {
                    const maxValue = Math.max(
                      ...comparison.regions.map((r) => r.value),
                    );
                    const percentage = (region.value / maxValue) * 100;
                    const metric = metrics.find((m) => m.id === selectedMetric);

                    return (
                      <div key={region.region_id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {region.region_name}
                            </span>
                            <Badge
                              className={cn(
                                "text-xs",
                                region.rank === 1 && "bg-success text-white",
                                region.rank === 2 && "bg-info text-white",
                                region.rank === 3 && "bg-warning text-white",
                              )}
                            >
                              #{region.rank}
                            </Badge>
                            {region.trend === "up" && (
                              <span className="text-success">↑</span>
                            )}
                            {region.trend === "down" && (
                              <span className="text-error">↓</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{metric?.format(region.value)}</span>
                            <span
                              className={cn(
                                "text-xs",
                                region.vs_average > 0
                                  ? "text-success"
                                  : "text-error",
                              )}
                            >
                              {region.vs_average > 0 ? "+" : ""}
                              {region.vs_average.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              region.rank === 1
                                ? "bg-success"
                                : region.vs_average >= 0
                                  ? "bg-primary"
                                  : "bg-warning",
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              Select a metric to compare regions
            </div>
          )}
        </CardContent>
      </Card>

      {/* Region Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Region Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {perfLoading ? (
            <div className="h-60 bg-background-secondary animate-pulse rounded" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium">Region</th>
                    <th className="text-right py-3 px-2 font-medium">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-2 font-medium">Change</th>
                    <th className="text-right py-3 px-2 font-medium">
                      Work Orders
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      Completion
                    </th>
                    <th className="text-right py-3 px-2 font-medium">FTFR</th>
                    <th className="text-right py-3 px-2 font-medium">CSAT</th>
                    <th className="text-right py-3 px-2 font-medium">Techs</th>
                  </tr>
                </thead>
                <tbody>
                  {performance?.map((p) => (
                    <tr
                      key={p.region_id}
                      className="border-b border-border hover:bg-background-secondary/50"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.region_name}</span>
                          {p.revenue_rank === 1 && (
                            <Badge className="bg-success text-white text-xs">
                              Top
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">
                        {formatCurrency(p.total_revenue)}
                      </td>
                      <td
                        className={cn(
                          "text-right py-3 px-2",
                          p.revenue_change_pct >= 0
                            ? "text-success"
                            : "text-error",
                        )}
                      >
                        {p.revenue_change_pct >= 0 ? "+" : ""}
                        {p.revenue_change_pct.toFixed(1)}%
                      </td>
                      <td className="text-right py-3 px-2">
                        {p.completed_work_orders}/{p.total_work_orders}
                      </td>
                      <td className="text-right py-3 px-2">
                        {(p.completion_rate * 100).toFixed(0)}%
                      </td>
                      <td className="text-right py-3 px-2">
                        {(p.first_time_fix_rate * 100).toFixed(0)}%
                      </td>
                      <td className="text-right py-3 px-2">
                        {p.customer_satisfaction.toFixed(1)}/5
                      </td>
                      <td className="text-right py-3 px-2">
                        {p.technician_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regionsLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 bg-background-secondary animate-pulse rounded-lg"
              />
            ))
          : regions?.map((region) => (
              <RegionCard key={region.id} region={region} />
            ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">
              {label}
            </p>
            <p className="text-xl font-bold text-text-primary">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RegionCard({ region }: { region: Region }) {
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary">{region.name}</h3>
              <Badge variant="outline">{region.code}</Badge>
            </div>
            {region.city && region.state && (
              <p className="text-sm text-text-secondary mt-1">
                {region.city}, {region.state}
              </p>
            )}
          </div>
          <Badge
            className={cn(
              region.is_active
                ? "bg-success text-white"
                : "bg-text-muted text-white",
            )}
          >
            {region.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-text-muted">Timezone</span>
            <p className="font-medium">{region.timezone}</p>
          </div>
          {region.is_franchise && (
            <div>
              <span className="text-text-muted">Franchise Owner</span>
              <p className="font-medium">
                {region.franchise_owner_name || "N/A"}
              </p>
            </div>
          )}
        </div>

        {region.is_franchise && region.royalty_percentage && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Royalty Rate</span>
              <span className="font-medium">
                {(region.royalty_percentage * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Details
          </Button>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
