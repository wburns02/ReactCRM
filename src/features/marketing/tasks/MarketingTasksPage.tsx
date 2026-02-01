/**
 * Marketing Tasks Dashboard Page
 *
 * Displays real-time status of marketing engine services,
 * scheduled tasks, alerts, and metrics for www.ecbtx.com and neighbors.
 *
 * URL: /marketing/tasks (no sidebar link - bookmark only)
 */

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useMarketingTasks,
  useTriggerHealthCheck,
  useResolveMarketingAlert,
  useTriggerScheduledTask,
} from "@/api/hooks/useMarketingTasks.ts";
import type {
  ServiceHealth,
  ScheduledTask,
  MarketingAlert,
  MarketingTaskSite,
} from "@/api/types/marketingTasks.ts";

type TabType = "overview" | "services" | "scheduled" | "alerts" | "sites";

// Tab Button Component
function TabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
        active
          ? "bg-primary text-white"
          : "bg-surface-secondary text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            active ? "bg-white/20" : "bg-danger text-white"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    healthy: "success",
    degraded: "warning",
    down: "danger",
    unknown: "secondary",
    active: "success",
    inactive: "secondary",
    error: "danger",
  };
  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
}

// Severity Badge Component
function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    info: "secondary",
    warning: "warning",
    error: "danger",
    critical: "danger",
  };
  return <Badge variant={variants[severity] || "secondary"}>{severity}</Badge>;
}

// Service Health Card Component
function ServiceHealthCard({
  service,
  onCheck,
  isChecking,
}: {
  service: ServiceHealth;
  onCheck: () => void;
  isChecking: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{service.name}</CardTitle>
          <StatusBadge status={service.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">{service.description}</p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-text-secondary">Port:</div>
            <div className="font-mono">{service.port}</div>

            {service.details.gpu && (
              <>
                <div className="text-text-secondary">GPU:</div>
                <div>{service.details.gpu}</div>
              </>
            )}

            {service.details.model_loaded !== undefined && (
              <>
                <div className="text-text-secondary">Model:</div>
                <div>
                  {service.details.model_loaded ? (
                    <Badge variant="success">Loaded</Badge>
                  ) : (
                    <Badge variant="warning">Not Loaded</Badge>
                  )}
                </div>
              </>
            )}

            {service.details.gbp_connected !== undefined && (
              <>
                <div className="text-text-secondary">GBP API:</div>
                <div>
                  {service.details.gbp_connected ? (
                    <Badge variant="success">Connected</Badge>
                  ) : (
                    <Badge variant="warning">Not Connected</Badge>
                  )}
                </div>
              </>
            )}
          </div>

          {service.details.error && (
            <div className="p-2 bg-danger/10 rounded text-sm text-danger">
              {service.details.error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-text-secondary">
              Last check: {new Date(service.lastCheck).toLocaleTimeString()}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCheck}
              disabled={isChecking}
            >
              {isChecking ? "Checking..." : "Check Now"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Scheduled Task Row Component
function ScheduledTaskRow({
  task,
  onRun,
  isRunning,
}: {
  task: ScheduledTask;
  onRun: () => void;
  isRunning: boolean;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 px-4">
        <div className="font-medium">{task.name}</div>
        <div className="text-xs text-text-secondary">{task.description}</div>
      </td>
      <td className="py-3 px-4">
        <Badge variant="secondary">{task.service}</Badge>
      </td>
      <td className="py-3 px-4">
        <div className="font-mono text-sm">{task.schedule}</div>
        <div className="text-xs text-text-secondary">
          {task.scheduleDescription}
        </div>
      </td>
      <td className="py-3 px-4">
        {task.lastStatus ? (
          <StatusBadge status={task.lastStatus} />
        ) : (
          <span className="text-text-secondary">-</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <Button size="sm" variant="secondary" onClick={onRun} disabled={isRunning}>
          {isRunning ? "Running..." : "Run Now"}
        </Button>
      </td>
    </tr>
  );
}

// Alert Card Component
function AlertCard({
  alert,
  onResolve,
  isResolving,
}: {
  alert: MarketingAlert;
  onResolve: () => void;
  isResolving: boolean;
}) {
  if (alert.resolved) return null;

  return (
    <Card className="border-l-4 border-l-danger">
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={alert.severity} />
              <span className="text-sm font-medium">{alert.type}</span>
            </div>
            <p className="text-sm text-text-primary">{alert.message}</p>
            {alert.url && (
              <a
                href={alert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                {alert.url}
              </a>
            )}
            <div className="text-xs text-text-secondary mt-2">
              Created: {new Date(alert.createdAt).toLocaleString()}
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={onResolve}
            disabled={isResolving}
          >
            {isResolving ? "Resolving..." : "Resolve"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Site Card Component
function SiteCard({ site }: { site: MarketingTaskSite }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{site.name}</div>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {site.domain}
            </a>
          </div>
          <StatusBadge status={site.status} />
        </div>
      </CardContent>
    </Card>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-text-secondary">{label}</div>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {subtext && (
          <div className="text-xs text-text-secondary mt-1">{subtext}</div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Page Component
export function MarketingTasksPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [checkingService, setCheckingService] = useState<string | null>(null);
  const [resolvingAlert, setResolvingAlert] = useState<string | null>(null);

  // Fetch dashboard data
  const { data, isLoading, error, refetch } = useMarketingTasks();

  // Mutations
  const triggerHealthCheck = useTriggerHealthCheck();
  const resolveAlert = useResolveMarketingAlert();
  const triggerTask = useTriggerScheduledTask();

  const handleHealthCheck = async (serviceName: string) => {
    setCheckingService(serviceName);
    try {
      await triggerHealthCheck.mutateAsync(serviceName);
    } finally {
      setCheckingService(null);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    setResolvingAlert(alertId);
    try {
      await resolveAlert.mutateAsync(alertId);
    } finally {
      setResolvingAlert(null);
    }
  };

  const handleRunTask = async (taskId: string) => {
    setRunningTask(taskId);
    try {
      await triggerTask.mutateAsync(taskId);
    } finally {
      setRunningTask(null);
    }
  };

  const unresolvedAlerts =
    data?.alerts?.filter((a) => !a.resolved).length || 0;

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-danger mb-4">Failed to load marketing tasks</div>
            <p className="text-text-secondary mb-4">{String(error)}</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Marketing Tasks
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Monitor SEO services, scheduled tasks, and alerts
          </p>
        </div>
        <div className="flex gap-2">
          {data?.lastUpdated && (
            <Badge variant="info">
              Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </Badge>
          )}
          <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </TabButton>
        <TabButton
          active={activeTab === "services"}
          onClick={() => setActiveTab("services")}
        >
          Services
        </TabButton>
        <TabButton
          active={activeTab === "scheduled"}
          onClick={() => setActiveTab("scheduled")}
        >
          Scheduled Tasks
        </TabButton>
        <TabButton
          active={activeTab === "alerts"}
          onClick={() => setActiveTab("alerts")}
          badge={unresolvedAlerts}
        >
          Alerts
        </TabButton>
        <TabButton
          active={activeTab === "sites"}
          onClick={() => setActiveTab("sites")}
        >
          Sites
        </TabButton>
      </div>

      {/* Loading State */}
      {isLoading && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-text-secondary">Loading marketing tasks...</p>
          </CardContent>
        </Card>
      )}

      {/* Tab Content */}
      {data && (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard
                  label="Performance Score"
                  value={data.metrics.performanceScore || "-"}
                />
                <MetricCard
                  label="SEO Score"
                  value={data.metrics.seoScore || "-"}
                />
                <MetricCard
                  label="Tracked Keywords"
                  value={data.metrics.trackedKeywords}
                />
                <MetricCard
                  label="Indexed Pages"
                  value={data.metrics.indexedPages}
                />
                <MetricCard
                  label="Content Generated"
                  value={data.metrics.contentGenerated}
                />
              </div>

              {/* Service Health Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.services.map((service) => (
                      <div
                        key={service.service}
                        className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-xs text-text-secondary">
                            Port {service.port}
                          </div>
                        </div>
                        <StatusBadge status={service.status} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Published Posts"
                  value={data.metrics.publishedPosts}
                />
                <MetricCard
                  label="Total Reviews"
                  value={data.metrics.totalReviews}
                  subtext={`Avg: ${data.metrics.averageRating.toFixed(1)} stars`}
                />
                <MetricCard
                  label="Pending Responses"
                  value={data.metrics.pendingResponses}
                />
                <MetricCard
                  label="Unresolved Alerts"
                  value={data.metrics.unresolvedAlerts}
                />
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.services.map((service) => (
                <ServiceHealthCard
                  key={service.service}
                  service={service}
                  onCheck={() => handleHealthCheck(service.service)}
                  isChecking={checkingService === service.service}
                />
              ))}
            </div>
          )}

          {/* Scheduled Tasks Tab */}
          {activeTab === "scheduled" && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Tasks</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">
                        Task
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">
                        Service
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">
                        Schedule
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">
                        Last Status
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.scheduledTasks.map((task) => (
                      <ScheduledTaskRow
                        key={task.id}
                        task={task}
                        onRun={() => handleRunTask(task.id)}
                        isRunning={runningTask === task.id}
                      />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              {unresolvedAlerts === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-text-secondary">No unresolved alerts</p>
                  </CardContent>
                </Card>
              ) : (
                data.alerts
                  .filter((a) => !a.resolved)
                  .map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onResolve={() => handleResolveAlert(alert.id)}
                      isResolving={resolvingAlert === alert.id}
                    />
                  ))
              )}
            </div>
          )}

          {/* Sites Tab */}
          {activeTab === "sites" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configured Sites</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary mb-4">
                    Marketing engine monitors and generates content for these
                    sites.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.sites.map((site) => (
                      <SiteCard key={site.id} site={site} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
