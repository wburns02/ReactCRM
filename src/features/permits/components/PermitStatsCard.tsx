import { Card } from "@/components/ui/Card";
import type { PermitStatsOverview } from "@/api/types/permit";

interface PermitStatsCardProps {
  stats: PermitStatsOverview | undefined;
  isLoading: boolean;
}

/**
 * Dashboard statistics card for permit overview
 */
export function PermitStatsCard({ stats, isLoading }: PermitStatsCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Unable to load statistics
      </Card>
    );
  }

  const statItems = [
    {
      label: "Total Permits",
      value: stats.total_permits.toLocaleString(),
      icon: "📋",
      color: "blue",
    },
    {
      label: "States Covered",
      value: stats.total_states.toString(),
      icon: "🗺️",
      color: "green",
    },
    {
      label: "Counties",
      value: stats.total_counties.toLocaleString(),
      icon: "🏛️",
      color: "purple",
    },
    {
      label: "Data Sources",
      value: stats.total_source_portals.toString(),
      icon: "🔌",
      color: "orange",
    },
    {
      label: "This Month",
      value: stats.permits_this_month.toLocaleString(),
      icon: "📅",
      color: "teal",
    },
    {
      label: "This Year",
      value: stats.permits_this_year.toLocaleString(),
      icon: "📊",
      color: "indigo",
    },
    {
      label: "Data Quality",
      value: `${stats.avg_data_quality_score.toFixed(0)}%`,
      icon: "⭐",
      color: "yellow",
    },
    {
      label: "Pending Duplicates",
      value: stats.duplicate_pending_count.toString(),
      icon: "🔄",
      color: stats.duplicate_pending_count > 0 ? "red" : "gray",
    },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        National Septic Permit Database
      </h2>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statItems.map((item) => (
          <div
            key={item.label}
            className={`p-4 rounded-lg bg-${item.color}-50 border border-${item.color}-100`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs font-medium text-gray-500 uppercase">
                {item.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Top states */}
      {stats.top_states.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Top States by Permit Count
          </h3>
          <div className="space-y-2">
            {stats.top_states.slice(0, 5).map((state) => (
              <div key={state.state_code} className="flex items-center gap-2">
                <div className="w-16 text-sm font-medium text-gray-600">
                  {state.state_code}
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${(state.total_permits / stats.total_permits) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-24 text-sm text-right text-gray-600">
                  {state.total_permits.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last updated */}
      <div className="mt-4 text-xs text-gray-400 text-right">
        Last updated: {new Date(stats.last_updated).toLocaleString()}
      </div>
    </Card>
  );
}
