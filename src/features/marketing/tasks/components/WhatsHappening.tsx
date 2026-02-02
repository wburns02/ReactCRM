/**
 * What's Happening Component
 *
 * Shows a simple activity timeline that a 12-year-old can understand.
 * Displays recent checks, content created, and upcoming tasks.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ScheduledTask, MarketingMetrics, ServiceHealth } from "@/api/types/marketingTasks";

interface WhatsHappeningProps {
  metrics: MarketingMetrics;
  scheduledTasks: ScheduledTask[];
  services: ServiceHealth[];
  lastUpdated: string;
  demoMode: boolean;
}

export function WhatsHappening({
  metrics,
  scheduledTasks,
  services,
  lastUpdated,
  demoMode,
}: WhatsHappeningProps) {
  // Format time for display
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  // Determine overall status
  const healthyServices = services.filter(s => s.status === "healthy" || s.status === "local").length;
  const totalServices = services.length;

  // Build activity items
  const activities = [
    // Speed check
    {
      icon: metrics.performanceScore >= 80 ? "🚀" : metrics.performanceScore >= 50 ? "👍" : metrics.performanceScore > 0 ? "🐌" : "⏳",
      text: metrics.performanceScore > 0
        ? `Speed check: ${metrics.performanceScore}/100 - ${metrics.performanceScore >= 80 ? "Your site is fast!" : metrics.performanceScore >= 50 ? "Speed is OK" : "Your site could be faster"}`
        : "Speed check: Waiting for first check",
      time: lastUpdated,
      status: metrics.performanceScore >= 50 ? "good" : metrics.performanceScore > 0 ? "warning" : "pending",
    },
    // SEO check
    {
      icon: metrics.seoScore >= 80 ? "🔍" : metrics.seoScore >= 50 ? "👀" : metrics.seoScore > 0 ? "🔎" : "⏳",
      text: metrics.seoScore > 0
        ? `SEO check: ${metrics.seoScore}/100 - ${metrics.seoScore >= 80 ? "Google can find you easily!" : metrics.seoScore >= 50 ? "SEO is OK" : "SEO needs work"}`
        : "SEO check: Waiting for first check",
      time: lastUpdated,
      status: metrics.seoScore >= 50 ? "good" : metrics.seoScore > 0 ? "warning" : "pending",
    },
    // Reviews
    {
      icon: metrics.pendingResponses > 0 ? "💬" : "⭐",
      text: metrics.pendingResponses > 0
        ? `${metrics.pendingResponses} review${metrics.pendingResponses > 1 ? "s" : ""} waiting for your reply`
        : `${metrics.totalReviews} reviews, ${metrics.averageRating.toFixed(1)} star average`,
      time: lastUpdated,
      status: metrics.pendingResponses > 0 ? "action" : "good",
    },
    // Content
    {
      icon: "📝",
      text: metrics.contentGenerated > 0
        ? `${metrics.contentGenerated} pieces of content created`
        : "No content created yet - try the Content Generator!",
      time: lastUpdated,
      status: metrics.contentGenerated > 0 ? "good" : "info",
    },
  ];

  // Get status colors
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-50 border-green-200 text-green-700";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      case "action":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "pending":
        return "bg-gray-50 border-gray-200 text-gray-600";
      default:
        return "bg-gray-50 border-gray-200 text-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📋</span> What's Happening Right Now
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Demo Mode Banner */}
        {demoMode && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700 flex items-start gap-2">
            <span>📊</span>
            <div>
              <div className="font-medium">Demo Mode</div>
              <div className="text-xs mt-1">
                Showing sample data. Real data will appear when services are connected.
              </div>
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="mb-4 p-4 rounded-lg bg-surface-secondary">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {healthyServices === totalServices ? "✅" : healthyServices > 0 ? "⚠️" : "❌"}
            </span>
            <div>
              <div className="font-medium text-lg">
                {healthyServices === totalServices
                  ? "Everything is working!"
                  : healthyServices > 0
                  ? "Mostly working"
                  : "Services offline"}
              </div>
              <div className="text-sm text-text-secondary">
                {healthyServices} of {totalServices} marketing tools are running
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-text-secondary mb-2">Recent Activity</div>
          {activities.map((activity, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getStatusStyle(activity.status)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{activity.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{activity.text}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {formatTime(activity.time)}
                  </div>
                </div>
                {activity.status === "action" && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                    Action needed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Tasks */}
        <div className="mt-6">
          <div className="text-sm font-medium text-text-secondary mb-2">Coming Up</div>
          <div className="space-y-2">
            {scheduledTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {task.id === "pagespeed-check" ? "⚡" :
                     task.id === "sitemap-check" ? "🗺️" :
                     task.id === "weekly-gbp-post" ? "📝" : "📋"}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{task.name}</div>
                    <div className="text-xs text-text-secondary">{task.scheduleDescription}</div>
                  </div>
                </div>
                {task.lastStatus && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.lastStatus === "success"
                      ? "bg-green-100 text-green-700"
                      : task.lastStatus === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    Last: {task.lastStatus}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
