/**
 * Marketing Tasks Dashboard Page
 *
 * Displays real-time status of marketing engine services,
 * scheduled tasks, alerts, and metrics for www.ecbtx.com and neighbors.
 *
 * URL: /marketing/tasks (no sidebar link - bookmark only)
 *
 * 2026 Best Practices:
 * - Dynamic buttons with spinners
 * - Visual gauges and progress bars
 * - Kid-friendly tooltips
 * - Pulse animations for live status
 * - Clickable metric cards
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { useToast } from "@/components/ui/Toast";
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

// ============================================================================
// SPINNER COMPONENT - Shows loading state
// ============================================================================
function Spinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-4",
  };
  return (
    <div
      className={`${sizes[size]} border-current border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}

// ============================================================================
// TOOLTIP COMPONENT - Kid-friendly explanations
// ============================================================================
function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
        className="cursor-help"
      >
        {children}
        <span className="ml-1 text-text-secondary text-xs">ⓘ</span>
      </div>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-[200px] text-center whitespace-normal">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCORE GAUGE COMPONENT - Circular progress for scores (0-100)
// ============================================================================
function ScoreGauge({
  value,
  label,
  tooltip,
  onClick,
  isLoading,
}: {
  value: number;
  label: string;
  tooltip: string;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);

  // Animate the value on mount/change
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Color based on score
  const getColor = (v: number) => {
    if (v >= 80) return { stroke: "#22c55e", bg: "bg-green-50", text: "text-green-600" };
    if (v >= 50) return { stroke: "#eab308", bg: "bg-yellow-50", text: "text-yellow-600" };
    return { stroke: "#ef4444", bg: "bg-red-50", text: "text-red-600" };
  };

  const color = getColor(value);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  const content = (
    <Card
      className={`${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all" : ""} ${color.bg}`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4 flex flex-col items-center">
        <div className="relative w-24 h-24">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Background circle */}
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke={color.stroke}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Value in center */}
              <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${color.text}`}>
                {value || "-"}
              </div>
            </>
          )}
        </div>
        <Tooltip content={tooltip}>
          <div className="text-sm text-text-secondary mt-2 font-medium">{label}</div>
        </Tooltip>
        {onClick && (
          <div className="text-xs text-primary mt-1">Click to check</div>
        )}
      </CardContent>
    </Card>
  );

  return content;
}

// ============================================================================
// METRIC BAR COMPONENT - Progress bar for counts
// ============================================================================
function MetricBar({
  value,
  max,
  label,
  tooltip,
  onClick,
}: {
  value: number;
  max: number;
  label: string;
  tooltip: string;
  onClick?: () => void;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.min((animatedValue / max) * 100, 100);

  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all" : ""}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <Tooltip content={tooltip}>
            <div className="text-sm text-text-secondary font-medium">{label}</div>
          </Tooltip>
          <div className="text-2xl font-bold text-primary">{value}</div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-xs text-text-secondary mt-1 text-right">
          {value} / {max}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LIVE INDICATOR - Pulsing dot with relative time
// ============================================================================
function LiveIndicator({ lastUpdated }: { lastUpdated: string }) {
  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const diff = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000);
      if (diff < 60) setRelativeTime(`${diff}s ago`);
      else if (diff < 3600) setRelativeTime(`${Math.floor(diff / 60)}m ago`);
      else setRelativeTime(new Date(lastUpdated).toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
      </span>
      <span className="text-text-secondary">Live • {relativeTime}</span>
    </div>
  );
}

// ============================================================================
// TAB BUTTON COMPONENT
// ============================================================================
function TabButton({
  active,
  onClick,
  children,
  badge,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
        active
          ? "bg-primary text-white shadow-md"
          : "bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:shadow-sm"
      }`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            active ? "bg-white/20" : "bg-danger text-white animate-pulse"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// STATUS BADGE WITH PULSE FOR HEALTHY
// ============================================================================
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    healthy: "success",
    degraded: "warning",
    down: "danger",
    unknown: "secondary",
    active: "success",
    inactive: "secondary",
    error: "danger",
    local: "secondary",
    unreachable: "danger",
  };

  const isHealthy = status === "healthy" || status === "active";

  return (
    <div className="relative inline-flex">
      {isHealthy && (
        <span className="absolute -inset-0.5 rounded-full bg-green-400 animate-ping opacity-30" />
      )}
      <Badge variant={variants[status] || "secondary"} className="relative">
        {status}
      </Badge>
    </div>
  );
}

// ============================================================================
// SEVERITY BADGE COMPONENT
// ============================================================================
function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    info: "secondary",
    warning: "warning",
    error: "danger",
    critical: "danger",
  };
  return <Badge variant={variants[severity] || "secondary"}>{severity}</Badge>;
}

// ============================================================================
// ACTION BUTTON - Button with built-in spinner
// ============================================================================
function ActionButton({
  onClick,
  isLoading,
  disabled,
  variant = "secondary",
  size = "sm",
  icon,
  children,
}: {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={disabled || isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : icon ? (
        <span>{icon}</span>
      ) : null}
      {isLoading ? "Working..." : children}
    </Button>
  );
}

// ============================================================================
// SERVICE HEALTH CARD COMPONENT
// ============================================================================
function ServiceHealthCard({
  service,
  onCheck,
  isChecking,
}: {
  service: ServiceHealth;
  onCheck: () => void;
  isChecking: boolean;
}) {
  const isUnreachable = service.status === "down" || service.status === "unknown";

  return (
    <Card className={isUnreachable ? "border-danger/30 bg-danger/5" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {service.service === "seo-monitor" ? "📊" :
               service.service === "content-gen" ? "✨" : "📍"}
            </span>
            <CardTitle className="text-lg">{service.name}</CardTitle>
          </div>
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
            <div className="p-3 bg-danger/10 rounded-lg text-sm text-danger flex items-start gap-2">
              <span>⚠️</span>
              <div>
                <div className="font-medium">Connection Issue</div>
                <div className="text-xs mt-1">{service.details.error}</div>
              </div>
            </div>
          )}

          {isUnreachable && (
            <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700 flex items-start gap-2">
              <span>💡</span>
              <div>
                <div className="font-medium">Service runs locally</div>
                <div className="text-xs mt-1">
                  This service is running on your local server. Set up a tunnel to connect remotely.
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-text-secondary">
              Last check: {new Date(service.lastCheck).toLocaleTimeString()}
            </span>
            <ActionButton
              onClick={onCheck}
              isLoading={isChecking}
              icon="🔄"
            >
              Check Now
            </ActionButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SCHEDULED TASK ROW COMPONENT
// ============================================================================
function ScheduledTaskRow({
  task,
  onRun,
  isRunning,
}: {
  task: ScheduledTask;
  onRun: () => void;
  isRunning: boolean;
}) {
  const taskIcons: Record<string, string> = {
    "pagespeed-check": "⚡",
    "sitemap-check": "🗺️",
    "outcome-tracking": "📈",
    "weekly-gbp-post": "📝",
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{taskIcons[task.id] || "📋"}</span>
          <div>
            <div className="font-medium">{task.name}</div>
            <div className="text-xs text-text-secondary">{task.description}</div>
          </div>
        </div>
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
        <ActionButton
          onClick={onRun}
          isLoading={isRunning}
          icon="▶️"
        >
          Run Now
        </ActionButton>
      </td>
    </tr>
  );
}

// ============================================================================
// ALERT CARD COMPONENT
// ============================================================================
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

  const severityIcons: Record<string, string> = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    critical: "🚨",
  };

  return (
    <Card className="border-l-4 border-l-danger hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{severityIcons[alert.severity] || "⚠️"}</span>
              <SeverityBadge severity={alert.severity} />
              <span className="text-sm font-medium">{alert.type}</span>
            </div>
            <p className="text-sm text-text-primary">{alert.message}</p>
            {alert.url && (
              <a
                href={alert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
              >
                🔗 {alert.url}
              </a>
            )}
            <div className="text-xs text-text-secondary mt-2">
              📅 Created: {new Date(alert.createdAt).toLocaleString()}
            </div>
          </div>
          <ActionButton
            onClick={onResolve}
            isLoading={isResolving}
            icon="✓"
          >
            Resolve
          </ActionButton>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SITE CARD COMPONENT
// ============================================================================
function SiteCard({ site }: { site: MarketingTaskSite }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
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
          </div>
          <StatusBadge status={site.status} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// QUICK ACTIONS FLOATING BUTTON
// ============================================================================
function QuickActions({
  onRunAllChecks,
  isRunning,
}: {
  onRunAllChecks: () => void;
  isRunning: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-border p-4 min-w-[200px] animate-in slide-in-from-bottom-2">
          <div className="text-sm font-medium mb-3 text-text-secondary">Quick Actions</div>
          <div className="space-y-2">
            <button
              onClick={() => {
                onRunAllChecks();
                setIsOpen(false);
              }}
              disabled={isRunning}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors text-left"
            >
              {isRunning ? <Spinner size="sm" /> : <span>🔄</span>}
              <span>Run All Checks</span>
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center text-2xl"
        aria-label="Quick Actions"
      >
        {isOpen ? "✕" : "⚡"}
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export function MarketingTasksPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [checkingService, setCheckingService] = useState<string | null>(null);
  const [resolvingAlert, setResolvingAlert] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [runningAllChecks, setRunningAllChecks] = useState(false);
  const [checkingPageSpeed, setCheckingPageSpeed] = useState(false);

  // Fetch dashboard data
  const { data, isLoading, error, refetch } = useMarketingTasks();

  // Set default selected site when data loads
  const sites = data?.sites || [];
  const selectedSiteData = sites.find((s) => s.id === selectedSite);

  // Mutations
  const triggerHealthCheck = useTriggerHealthCheck();
  const resolveAlert = useResolveMarketingAlert();
  const triggerTask = useTriggerScheduledTask();

  // Toast notifications
  const { addToast } = useToast();

  const handleHealthCheck = async (serviceName: string) => {
    setCheckingService(serviceName);
    try {
      await triggerHealthCheck.mutateAsync(serviceName);
      addToast({
        title: "Check Complete",
        description: `${serviceName} health check finished.`,
        variant: "success",
      });
    } catch (err) {
      addToast({
        title: "Check Failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setCheckingService(null);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    setResolvingAlert(alertId);
    try {
      const result = await resolveAlert.mutateAsync(alertId);
      addToast({
        title: "Alert Resolved",
        description: result.message || "The alert has been dismissed.",
        variant: "success",
      });
    } catch (err) {
      addToast({
        title: "Failed to Resolve Alert",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setResolvingAlert(null);
    }
  };

  const handleRunTask = async (taskId: string) => {
    setRunningTask(taskId);
    try {
      await triggerTask.mutateAsync(taskId);
      addToast({
        title: "Task Started",
        description: `${taskId} is now running.`,
        variant: "success",
      });
    } catch (err) {
      addToast({
        title: "Task Failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setRunningTask(null);
    }
  };

  const handleRunAllChecks = async () => {
    setRunningAllChecks(true);
    try {
      // Run all health checks in parallel
      const services = data?.services || [];
      await Promise.all(
        services.map((s) => triggerHealthCheck.mutateAsync(s.service))
      );
      addToast({
        title: "All Checks Complete",
        description: "All services have been checked.",
        variant: "success",
      });
    } catch (err) {
      addToast({
        title: "Some Checks Failed",
        description: "Not all service checks completed successfully.",
        variant: "error",
      });
    } finally {
      setRunningAllChecks(false);
    }
  };

  const handlePageSpeedCheck = async () => {
    setCheckingPageSpeed(true);
    try {
      await triggerTask.mutateAsync("pagespeed-check");
      addToast({
        title: "PageSpeed Check Started",
        description: "Checking your website speed...",
        variant: "success",
      });
    } catch (err) {
      addToast({
        title: "PageSpeed Check Failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setCheckingPageSpeed(false);
    }
  };

  const unresolvedAlerts = data?.alerts?.filter((a) => !a.resolved).length || 0;

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-6xl mb-4">😕</div>
            <div className="text-danger text-lg font-medium mb-2">
              Oops! Something went wrong
            </div>
            <p className="text-text-secondary mb-4">
              We couldn't load the marketing tasks. This might be a temporary issue.
            </p>
            <ActionButton onClick={() => refetch()} icon="🔄" variant="primary">
              Try Again
            </ActionButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <span className="text-3xl">📊</span>
            Marketing Tasks
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Keep an eye on how your website is doing online
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="site-selector" className="text-sm text-text-secondary whitespace-nowrap">
              🌐 Site:
            </label>
            <Select
              id="site-selector"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-[200px]"
            >
              <option value="all">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.domain})
                </option>
              ))}
            </Select>
          </div>
          {data?.lastUpdated && <LiveIndicator lastUpdated={data.lastUpdated} />}
          <ActionButton
            onClick={() => refetch()}
            isLoading={isLoading}
            icon="🔄"
          >
            Refresh
          </ActionButton>
        </div>
      </div>

      {/* Selected Site Info */}
      {selectedSite !== "all" && selectedSiteData && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl">🎯</span>
                <span className="font-medium text-primary">{selectedSiteData.name}</span>
                <a
                  href={selectedSiteData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-primary"
                >
                  {selectedSiteData.url}
                </a>
              </div>
              <StatusBadge status={selectedSiteData.status} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon="📈"
        >
          Overview
        </TabButton>
        <TabButton
          active={activeTab === "services"}
          onClick={() => setActiveTab("services")}
          icon="🔧"
        >
          Services
        </TabButton>
        <TabButton
          active={activeTab === "scheduled"}
          onClick={() => setActiveTab("scheduled")}
          icon="📅"
        >
          Scheduled Tasks
        </TabButton>
        <TabButton
          active={activeTab === "alerts"}
          onClick={() => setActiveTab("alerts")}
          badge={unresolvedAlerts}
          icon="🔔"
        >
          Alerts
        </TabButton>
        <TabButton
          active={activeTab === "sites"}
          onClick={() => setActiveTab("sites")}
          icon="🌐"
        >
          Sites
        </TabButton>
      </div>

      {/* Loading State */}
      {isLoading && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-text-secondary text-lg">Loading your marketing data...</p>
            <p className="text-text-secondary text-sm mt-2">This only takes a moment</p>
          </CardContent>
        </Card>
      )}

      {/* Tab Content */}
      {data && (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Score Gauges */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <ScoreGauge
                  value={data.metrics.performanceScore || 0}
                  label="Speed Score"
                  tooltip="How fast your website loads - higher is better! 80+ is great."
                  onClick={handlePageSpeedCheck}
                  isLoading={checkingPageSpeed}
                />
                <ScoreGauge
                  value={data.metrics.seoScore || 0}
                  label="SEO Score"
                  tooltip="How easy it is for Google to find your site. 80+ means you're doing great!"
                />
                <MetricBar
                  value={data.metrics.trackedKeywords}
                  max={50}
                  label="Keywords"
                  tooltip="These are the words people type into Google to find businesses like yours."
                />
                <MetricBar
                  value={data.metrics.indexedPages}
                  max={500}
                  label="Pages Found"
                  tooltip="The number of pages on your site that Google knows about."
                />
                <MetricBar
                  value={data.metrics.contentGenerated}
                  max={100}
                  label="Content Made"
                  tooltip="Blog posts and articles we've created to help people find you."
                />
              </div>

              {/* Service Health Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span>🔧</span> Service Health
                    </CardTitle>
                    <ActionButton
                      onClick={handleRunAllChecks}
                      isLoading={runningAllChecks}
                      icon="🔄"
                    >
                      Check All
                    </ActionButton>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.services.map((service) => (
                      <div
                        key={service.service}
                        className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => setActiveTab("services")}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {service.service === "seo-monitor" ? "📊" :
                             service.service === "content-gen" ? "✨" : "📍"}
                          </span>
                          <div>
                            <div className="font-medium">{service.name}</div>
                            <div className="text-xs text-text-secondary">
                              Port {service.port}
                            </div>
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
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📝</span>
                      <div>
                        <Tooltip content="Blog posts published to your Google Business Profile.">
                          <div className="text-sm text-text-secondary">Published Posts</div>
                        </Tooltip>
                        <div className="text-2xl font-bold text-primary">{data.metrics.publishedPosts}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">⭐</span>
                      <div>
                        <Tooltip content="Customer reviews from Google and other sites.">
                          <div className="text-sm text-text-secondary">Total Reviews</div>
                        </Tooltip>
                        <div className="text-2xl font-bold text-primary">{data.metrics.totalReviews}</div>
                        <div className="text-xs text-text-secondary">
                          Avg: {data.metrics.averageRating.toFixed(1)} stars
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">💬</span>
                      <div>
                        <Tooltip content="Reviews that need your response.">
                          <div className="text-sm text-text-secondary">Need Response</div>
                        </Tooltip>
                        <div className="text-2xl font-bold text-primary">{data.metrics.pendingResponses}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    data.metrics.unresolvedAlerts > 0 ? "border-danger/30 bg-danger/5" : ""
                  }`}
                  onClick={() => setActiveTab("alerts")}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{data.metrics.unresolvedAlerts > 0 ? "🚨" : "✅"}</span>
                      <div>
                        <Tooltip content="Issues that need your attention.">
                          <div className="text-sm text-text-secondary">Alerts</div>
                        </Tooltip>
                        <div className={`text-2xl font-bold ${data.metrics.unresolvedAlerts > 0 ? "text-danger" : "text-green-600"}`}>
                          {data.metrics.unresolvedAlerts}
                        </div>
                        {data.metrics.unresolvedAlerts > 0 && (
                          <div className="text-xs text-danger">Click to view</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                <CardTitle className="flex items-center gap-2">
                  <span>📅</span> Scheduled Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              {unresolvedAlerts === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <div className="text-lg font-medium text-green-600 mb-2">All Clear!</div>
                    <p className="text-text-secondary">
                      No problems to fix right now. Everything is running smoothly.
                    </p>
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
                  <CardTitle className="flex items-center gap-2">
                    <span>🌐</span> Your Websites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary mb-4">
                    These are the websites we're keeping an eye on and making better for you.
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

      {/* Quick Actions FAB */}
      <QuickActions onRunAllChecks={handleRunAllChecks} isRunning={runningAllChecks} />
    </div>
  );
}
