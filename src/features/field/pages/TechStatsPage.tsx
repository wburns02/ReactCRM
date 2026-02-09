import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

/**
 * Technician performance statistics page
 */
export function TechStatsPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["technician-stats"],
    queryFn: async () => {
      const response = await apiClient.get("/analytics/technician-stats");
      return response.data;
    },
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 pb-20">
        <h1 className="text-xl font-semibold text-text-primary mb-4">My Stats</h1>
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <span className="text-3xl block mb-2">📊</span>
          <p className="text-text-muted">Unable to load technician stats</p>
          <p className="text-sm text-text-muted mt-1">Stats will appear once data is available</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Jobs Today",
      value: stats?.jobs_completed_today || 0,
      icon: "📋",
      color: "text-primary",
    },
    {
      label: "Jobs This Week",
      value: stats?.jobs_completed_week || 0,
      icon: "📅",
      color: "text-info",
    },
    {
      label: "Jobs This Month",
      value: stats?.jobs_completed_month || 0,
      icon: "📆",
      color: "text-success",
    },
    {
      label: "First-Time Fix Rate",
      value: `${stats?.first_time_fix_rate || 0}%`,
      icon: "✅",
      color: "text-success",
    },
    {
      label: "Avg. Job Time",
      value: `${stats?.average_job_time || 0} min`,
      icon: "⏱️",
      color: "text-warning",
    },
    {
      label: "Customer Rating",
      value: stats?.customer_rating
        ? `${stats.customer_rating.toFixed(1)}/5`
        : "N/A",
      icon: "⭐",
      color: "text-warning",
    },
  ];

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-semibold text-text-primary mb-4">My Stats</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span>{stat.icon}</span>
              <span className="text-sm text-text-muted">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Performance Trend */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-4">
        <h2 className="font-medium text-text-primary mb-3">
          Weekly Performance
        </h2>
        <div className="h-32 flex items-center justify-center text-text-muted">
          <div className="text-center">
            <span className="text-3xl block mb-2">📈</span>
            <p className="text-sm">Performance charts coming soon</p>
          </div>
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <h2 className="font-medium text-text-primary mb-3">Recent Feedback</h2>
        <div className="space-y-3">
          <div className="text-center py-4 text-text-muted">
            <span className="text-2xl block mb-2">💬</span>
            <p className="text-sm">No recent feedback</p>
          </div>
        </div>
      </div>
    </div>
  );
}
