/**
 * DispatchSidebar — metrics, queue, alerts, and status panels for the CommandCenter.
 * Extracted from CommandCenter.tsx to keep sidebar concerns isolated.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssignWorkOrder } from "@/api/hooks/useWorkOrders.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { formatCurrency } from "@/lib/utils.ts";
import {
  type WorkOrder,
  type JobType,
  type Priority,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from "@/api/types/workOrder.ts";
import type { Technician } from "@/api/types/technician.ts";

// ============================================
// Alert Types
// ============================================
export interface Alert {
  id: string;
  type: "running_late" | "customer_waiting" | "parts_needed" | "emergency";
  severity: "warning" | "danger" | "info";
  message: string;
  workOrderId?: string;
  technicianName?: string;
  createdAt: Date;
}

// ============================================
// Toast Notification Types
// ============================================
export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  timestamp: Date;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get time since creation in human readable format
 */
function getTimeSince(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown";
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

/**
 * Get priority color class
 */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case "emergency":
      return "border-red-500 bg-red-500/20";
    case "urgent":
      return "border-orange-500 bg-orange-500/20";
    case "high":
      return "border-yellow-500 bg-yellow-500/20";
    case "normal":
      return "border-blue-500 bg-blue-500/10";
    case "low":
      return "border-green-500 bg-green-500/10";
    default:
      return "border-border";
  }
}

// ============================================
// Toast Notifications Component
// ============================================
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => onDismiss(toast.id), 5000);
      return () => clearTimeout(timer);
    });
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in-right",
            toast.type === "success" && "bg-green-600",
            toast.type === "error" && "bg-red-600",
            toast.type === "warning" && "bg-yellow-600",
            toast.type === "info" && "bg-blue-600",
          )}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-2 hover:opacity-80"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Metric Card Components
// ============================================

/**
 * Skeleton loader for metrics cards
 */
function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-10 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced Metric Card Component with drill-down
 */
function MetricCard({
  label,
  value,
  subtext,
  trend,
  trendDirection,
  className,
  onClick,
  isBehind,
  sparklineData,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  className?: string;
  onClick?: () => void;
  isBehind?: boolean;
  sparklineData?: number[];
}) {
  // Mini sparkline renderer
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const width = 60;
    const height = 20;
    const points = sparklineData
      .map((val, i) => {
        const x = (i / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="mt-1">
        <polyline
          points={points}
          fill="none"
          stroke={
            trendDirection === "up"
              ? "#22c55e"
              : trendDirection === "down"
                ? "#ef4444"
                : "#6b7280"
          }
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/50",
        isBehind &&
          "border-2 border-red-500 bg-red-500/10 animate-pulse-subtle",
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <p className="text-sm text-text-secondary">{label}</p>
        <div className="flex items-end gap-3">
          <p
            className={cn(
              "text-3xl font-bold mt-1",
              isBehind ? "text-red-600" : "text-text-primary",
            )}
          >
            {value === "--" ? (
              <span className="text-text-muted text-xl">No data</span>
            ) : (
              value
            )}
          </p>
          {renderSparkline()}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {subtext && <p className="text-xs text-text-muted">{subtext}</p>}
          {trend && (
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded",
                trendDirection === "up" && "text-green-700 bg-green-100",
                trendDirection === "down" && "text-red-700 bg-red-100",
                trendDirection === "neutral" &&
                  "text-text-muted bg-bg-secondary",
                isBehind && "text-white bg-red-600 animate-pulse",
              )}
            >
              {trendDirection === "up" && "↑ "}
              {trendDirection === "down" && "↓ "}
              {trend}
            </span>
          )}
        </div>
        {onClick && (
          <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to drill down →
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Quick Stats Row
// ============================================

/**
 * Quick Stats Row Component with "Behind" Alert
 */
export function QuickStatsRow({
  techsOnDuty,
  jobsInProgress,
  jobsRemaining,
  utilization,
  isLoading,
}: {
  techsOnDuty: number;
  jobsInProgress: number;
  jobsRemaining: number;
  utilization: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-bg-card border border-border rounded-lg p-4"
          >
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
    );
  }

  // Determine if we're "behind" - low utilization with techs on duty
  const isBehind = techsOnDuty > 0 && utilization < 30;
  const isVeryBehind =
    techsOnDuty > 0 && utilization === 0 && jobsRemaining > 0;

  const stats = [
    { label: "TECHS ON DUTY", value: techsOnDuty, highlight: false },
    { label: "JOBS IN PROGRESS", value: jobsInProgress, highlight: false },
    {
      label: "JOBS REMAINING",
      value: jobsRemaining,
      highlight: jobsRemaining > 5,
    },
    { label: "UTILIZATION", value: `${utilization}%`, highlight: isBehind },
  ];

  return (
    <div className="mb-6">
      {/* Behind Alert Banner */}
      {isVeryBehind && (
        <div className="mb-4 p-4 bg-red-600 text-white rounded-lg flex items-center gap-3 animate-pulse shadow-lg">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-lg">OPERATIONS BEHIND SCHEDULE</p>
            <p className="text-sm opacity-90">
              {techsOnDuty} technicians on duty with {jobsRemaining} jobs
              waiting. Consider reassigning or dispatching immediately.
            </p>
          </div>
          <Link to="/schedule" className="ml-auto">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-red-600 hover:bg-gray-100"
            >
              View Schedule
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "bg-bg-card border rounded-lg p-4 flex items-center justify-between transition-all",
              stat.highlight && "border-2 border-red-500 bg-red-500/10",
            )}
          >
            <div>
              <p
                className={cn(
                  "text-xs uppercase tracking-wide",
                  stat.highlight
                    ? "text-red-600 font-semibold"
                    : "text-text-muted",
                )}
              >
                {stat.label}
              </p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  stat.highlight ? "text-red-600" : "text-text-primary",
                )}
              >
                {stat.value}
              </p>
            </div>
            {stat.highlight && (
              <span className="text-red-500 animate-pulse text-xl">⚠️</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Today's Metrics
// ============================================

/**
 * Today's Metrics Cards Section - Enhanced with click-to-drill-down
 */
export function TodaysMetrics({
  completedToday,
  scheduledToday,
  revenueToday,
  avgCompletionTime,
  isLoading,
  onDrillDown,
}: {
  completedToday: number;
  scheduledToday: number;
  revenueToday: number;
  avgCompletionTime: string;
  isLoading: boolean;
  onDrillDown?: (metric: string) => void;
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const completionRate =
    scheduledToday > 0
      ? Math.round((completedToday / scheduledToday) * 100)
      : 0;
  const isBehind = completionRate < 50 && scheduledToday > 0;

  // Mock sparkline data (would come from real data)
  const mockCompletionTrend = [2, 4, 3, 5, completedToday];
  const mockRevenueTrend = [1200, 1800, 1500, 2200, revenueToday];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        label="Jobs Completed Today"
        value={`${completedToday}/${scheduledToday}`}
        subtext={`${completionRate}% complete`}
        trend={isBehind ? "BEHIND" : "On Track"}
        trendDirection={completionRate >= 50 ? "up" : "down"}
        isBehind={isBehind}
        sparklineData={mockCompletionTrend}
        onClick={() => {
          onDrillDown?.("completed");
          navigate("/work-orders?status=completed");
        }}
      />
      <MetricCard
        label="Revenue Today"
        value={formatCurrency(revenueToday)}
        subtext="Estimated from completed jobs"
        trend={
          revenueToday > 0
            ? "+" + formatCurrency(revenueToday * 0.1)
            : undefined
        }
        trendDirection={revenueToday > 0 ? "up" : "neutral"}
        sparklineData={mockRevenueTrend}
        onClick={() => {
          onDrillDown?.("revenue");
        }}
      />
      <MetricCard
        label="Avg Completion Time"
        value={avgCompletionTime}
        subtext="Per job today"
        onClick={() => {
          onDrillDown?.("time");
        }}
      />
      <MetricCard
        label="Customer Satisfaction"
        value="4.8"
        subtext="Based on recent feedback"
        trend="+0.2"
        trendDirection="up"
        sparklineData={[4.5, 4.6, 4.7, 4.6, 4.8]}
        onClick={() => {
          onDrillDown?.("satisfaction");
        }}
      />
    </div>
  );
}

// ============================================
// Active Alerts Panel
// ============================================

/**
 * Active Alerts Panel
 */
export function ActiveAlertsPanel({
  alerts,
  isLoading,
}: {
  alerts: Alert[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 border border-border rounded-lg"
              >
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-text-muted">
            <span className="text-4xl mb-2 block">✓</span>
            <p className="font-medium">No active alerts</p>
            <p className="text-sm">All operations running smoothly</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Alerts</CardTitle>
          <Badge variant="danger" className="animate-pulse">
            {alerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                alert.severity === "danger" &&
                  "border-danger bg-danger-light/20",
                alert.severity === "warning" &&
                  "border-warning bg-warning-light/20",
                alert.severity === "info" && "border-info bg-info-light/20",
              )}
            >
              <Badge
                variant={
                  alert.severity === "danger"
                    ? "danger"
                    : alert.severity === "warning"
                      ? "warning"
                      : "info"
                }
              >
                {alert.type.replace("_", " ")}
              </Badge>
              <div className="flex-1">
                <p className="text-sm text-text-primary">{alert.message}</p>
                {alert.technicianName && (
                  <p className="text-xs text-text-muted mt-1">
                    Tech: {alert.technicianName}
                  </p>
                )}
              </div>
              {alert.workOrderId && (
                <Link to={`/work-orders/${alert.workOrderId}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Dispatch Queue
// ============================================

/**
 * Enhanced Dispatch Queue Panel - Draggable items
 */
export function DispatchQueue({
  unassignedJobs,
  technicians,
  isLoading,
  onAssign,
  onDragStart,
  onDragEnd,
  draggedJobId,
}: {
  unassignedJobs: WorkOrder[];
  technicians: Technician[];
  isLoading: boolean;
  onAssign?: (jobId: string, techName: string) => void;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  draggedJobId: string | null;
}) {
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const assignWorkOrder = useAssignWorkOrder();

  const handleQuickAssign = (workOrderId: string, technicianName: string) => {
    setAssigningId(workOrderId);
    const today = new Date().toISOString().split("T")[0];
    assignWorkOrder.mutate(
      {
        id: workOrderId,
        technician: technicianName,
        date: today,
      },
      {
        onSettled: () => {
          setAssigningId(null);
          onAssign?.(workOrderId, technicianName);
        },
      },
    );
  };

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData("application/job-id", jobId);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(jobId);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Dispatch Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 border border-border rounded-lg">
                <div className="flex justify-between mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by priority (emergency first, then by creation time)
  const sortedJobs = [...unassignedJobs].sort((a, b) => {
    const priorityOrder: Record<Priority, number> = {
      emergency: 0,
      urgent: 1,
      high: 2,
      normal: 3,
      low: 4,
    };
    const priorityDiff =
      priorityOrder[a.priority as Priority] -
      priorityOrder[b.priority as Priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (
      new Date(a.created_at || 0).getTime() -
      new Date(b.created_at || 0).getTime()
    );
  });

  if (sortedJobs.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Dispatch Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-text-muted">
            <span className="text-4xl mb-2 block">📋</span>
            <p className="font-medium">No unassigned jobs</p>
            <p className="text-sm">All jobs have been dispatched</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableTechs = technicians.filter((t) => t.is_active);
  const hasEmergency = sortedJobs.some((j) => j.priority === "emergency");
  const hasUrgent = sortedJobs.some((j) => j.priority === "urgent");

  return (
    <Card
      className={cn(
        "h-full transition-all",
        hasEmergency && "ring-2 ring-red-500 ring-offset-2",
        hasUrgent && !hasEmergency && "ring-2 ring-orange-400 ring-offset-1",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Dispatch Queue</CardTitle>
            {/* Pulsing unassigned count badge */}
            <Badge
              variant="danger"
              className={cn(
                "text-lg px-3 py-1 font-bold cursor-pointer hover:scale-105 transition-transform",
                sortedJobs.length > 0 && "animate-pulse shadow-lg",
              )}
              data-testid="unassigned-badge"
            >
              {sortedJobs.length} unassigned
            </Badge>
          </div>
          {hasEmergency && (
            <span className="text-red-600 font-bold text-sm flex items-center gap-1 animate-pulse">
              🚨 EMERGENCY
            </span>
          )}
        </div>
        {/* Priority legend */}
        <div className="flex gap-2 mt-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            Emergency
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-500"></span>
            Urgent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500"></span>
            High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            Low
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {sortedJobs.map((job) => (
            <div
              key={job.id}
              draggable
              onDragStart={(e) => handleDragStart(e, job.id)}
              onDragEnd={handleDragEnd}
              data-testid="dispatch-queue-item"
              data-job-id={job.id}
              className={cn(
                "p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all",
                "hover:shadow-md hover:scale-[1.01]",
                draggedJobId === job.id &&
                  "opacity-50 scale-95 ring-2 ring-blue-500",
                getPriorityColor(job.priority),
                job.priority === "emergency" && "animate-pulse-subtle",
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-text-primary">
                    {job.customer_name || `Customer #${job.customer_id}`}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {JOB_TYPE_LABELS[job.job_type as JobType]}
                  </p>
                </div>
                <Badge
                  variant={
                    job.priority === "emergency" || job.priority === "urgent"
                      ? "danger"
                      : job.priority === "high"
                        ? "warning"
                        : "default"
                  }
                  className="font-bold"
                >
                  {PRIORITY_LABELS[job.priority as Priority]}
                </Badge>
              </div>
              {job.service_address_line1 && (
                <p className="text-xs text-text-muted mb-2">
                  📍 {job.service_address_line1}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  ⏱️ Created {getTimeSince(job.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs border border-border rounded px-2 py-1.5 bg-bg-card font-medium"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleQuickAssign(job.id, e.target.value);
                      }
                    }}
                    disabled={assigningId === job.id}
                  >
                    <option value="">Assign to...</option>
                    {availableTechs.map((tech) => (
                      <option
                        key={tech.id}
                        value={`${tech.first_name} ${tech.last_name}`}
                      >
                        {tech.first_name} {tech.last_name}
                      </option>
                    ))}
                  </select>
                  <Link to={`/work-orders/${job.id}`}>
                    <Button variant="ghost" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted text-center">
          💡 Drag jobs to technician markers on the map for quick assignment
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Connection Status
// ============================================

/**
 * Connection Status Indicator
 */
export function ConnectionStatus({ lastUpdated }: { lastUpdated: Date }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Simulate connection checking
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.1); // 90% uptime simulation
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500",
          )}
        />
        <span className={isConnected ? "text-green-600" : "text-red-600"}>
          {isConnected ? "Live" : "Disconnected"}
        </span>
      </div>
      <span className="text-text-muted">
        Updated {lastUpdated.toLocaleTimeString()}
      </span>
    </div>
  );
}
