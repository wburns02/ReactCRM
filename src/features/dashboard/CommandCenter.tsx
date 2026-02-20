/**
 * Operations Command Center — thin orchestrator.
 * State, data fetching, and layout composition only.
 * Rendering split into:
 *   - components/DispatchMap.tsx  (Leaflet map + technician markers)
 *   - components/DispatchSidebar.tsx  (metrics, queue, alerts, status)
 */
import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useWorkOrders,
  useUnscheduledWorkOrders,
  useAssignWorkOrder,
} from "@/api/hooks/useWorkOrders.ts";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { cn } from "@/lib/utils.ts";
import {
  type WorkOrder,
  type JobType,
  type Priority,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from "@/api/types/workOrder.ts";
import {
  LiveTechnicianMap,
  type TechnicianWithStatus,
} from "./components/DispatchMap.tsx";
import {
  ToastContainer,
  QuickStatsRow,
  TodaysMetrics,
  ActiveAlertsPanel,
  DispatchQueue,
  ConnectionStatus,
  type Toast,
  type Alert,
} from "./components/DispatchSidebar.tsx";

// ============================================
// Keyboard Shortcuts Config
// ============================================
const KEYBOARD_SHORTCUTS = [
  { keys: ["g", "d"], description: "Go to Dashboard", action: "/dashboard" },
  { keys: ["g", "s"], description: "Go to Schedule", action: "/schedule" },
  { keys: ["g", "c"], description: "Go to Customers", action: "/customers" },
  {
    keys: ["g", "w"],
    description: "Go to Work Orders",
    action: "/work-orders",
  },
  {
    keys: ["g", "t"],
    description: "Go to Technicians",
    action: "/operations/technicians",
  },
  { keys: ["?"], description: "Show Shortcuts", action: "shortcuts" },
  { keys: ["Escape"], description: "Close Modal", action: "close" },
];

// ============================================
// Assignment Confirmation Modal Types
// ============================================
interface AssignmentConfirmation {
  job: WorkOrder;
  technician: TechnicianWithStatus;
}

// ============================================
// Modal Components
// ============================================

function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.filter(
            (s) => s.action !== "shortcuts" && s.action !== "close",
          ).map((shortcut) => (
            <div
              key={shortcut.keys.join("")}
              className="flex items-center justify-between py-2"
            >
              <span className="text-sm text-text-secondary">
                {shortcut.description}
              </span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="px-2 py-1 text-xs bg-bg-secondary border border-border rounded">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-text-muted">then</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border text-xs text-text-muted">
          Press{" "}
          <kbd className="px-1 py-0.5 bg-bg-secondary border border-border rounded">
            ?
          </kbd>{" "}
          anytime to show this menu
        </div>
      </div>
    </div>
  );
}

function AssignmentConfirmModal({
  confirmation,
  onConfirm,
  onCancel,
  isAssigning,
}: {
  confirmation: AssignmentConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
  isAssigning: boolean;
}) {
  if (!confirmation) return null;

  const { job, technician } = confirmation;
  const techName = `${technician.first_name} ${technician.last_name}`;
  const jobType = JOB_TYPE_LABELS[job.job_type as JobType] || job.job_type;
  const address = job.service_address_line1 || "No address";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl">
            🚐
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Assign Job?
            </h2>
            <p className="text-sm text-text-muted">
              Confirm technician assignment
            </p>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 mb-4 space-y-3">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">
              Job
            </p>
            <p className="font-medium text-text-primary">{jobType}</p>
            <p className="text-sm text-text-secondary">📍 {address}</p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-text-muted uppercase tracking-wide">
              Assign To
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold",
                  technician.status === "available" && "bg-green-500",
                  technician.status === "busy" && "bg-yellow-500",
                  technician.status === "offline" && "bg-gray-400",
                )}
              >
                {technician.first_name?.[0]}
                {technician.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium text-text-primary">{techName}</p>
                <p className="text-xs text-text-muted capitalize">
                  {technician.status}
                </p>
              </div>
            </div>
          </div>
          {job.priority === "emergency" || job.priority === "urgent" ? (
            <div className="border-t border-border pt-3">
              <Badge variant="danger" className="text-xs">
                {PRIORITY_LABELS[job.priority as Priority]} Priority
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={isAssigning}>
            {isAssigning ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Command Center Component
// ============================================

/**
 * Operations Command Center - Real-time operations dashboard
 */
export function CommandCenter() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split("T")[0];
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dropTargetTechId, setDropTargetTechId] = useState<string | null>(null);
  const [assignmentConfirmation, setAssignmentConfirmation] =
    useState<AssignmentConfirmation | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const assignWorkOrder = useAssignWorkOrder();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key;

      if (key === "Escape") {
        setShowShortcuts(false);
        setAssignmentConfirmation(null);
        return;
      }

      if (key === "?") {
        setShowShortcuts((prev) => !prev);
        return;
      }

      // Handle chord shortcuts (e.g., "g" then "d")
      const newSequence = [...keySequence, key].slice(-2);
      setKeySequence(newSequence);

      const matchedShortcut = KEYBOARD_SHORTCUTS.find(
        (s) =>
          s.keys.length === newSequence.length &&
          s.keys.every((k, i) => k === newSequence[i]),
      );

      if (matchedShortcut && matchedShortcut.action.startsWith("/")) {
        navigate(matchedShortcut.action);
        setKeySequence([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keySequence, navigate]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toast helpers
  const addToast = useCallback(
    (type: Toast["type"], message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message, timestamp: new Date() }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Data fetching
  const { data: workOrdersData, isLoading: woLoading } = useWorkOrders({
    limit: 200,
  });
  const { data: unscheduledData, isLoading: unscheduledLoading } =
    useUnscheduledWorkOrders();
  const { data: techniciansData, isLoading: techLoading } = useTechnicians();

  const isLoading = woLoading || techLoading;
  const workOrders = workOrdersData?.items ?? [];
  const unscheduledJobs = unscheduledData?.items ?? [];
  const technicians = techniciansData?.items ?? [];

  // Calculate today's metrics
  const todaysMetrics = useMemo(() => {
    const todaysJobs = workOrders.filter(
      (wo) => wo.scheduled_date === todayStr,
    );
    const completed = todaysJobs.filter(
      (wo) => wo.status === "completed",
    ).length;
    const scheduled = todaysJobs.length;

    // Estimate revenue (mock calculation based on job type)
    const revenuePerJobType: Record<string, number> = {
      pumping: 350,
      inspection: 150,
      repair: 500,
      installation: 2500,
      emergency: 600,
      maintenance: 200,
      grease_trap: 400,
      camera_inspection: 250,
    };

    const revenue = todaysJobs
      .filter((wo) => wo.status === "completed")
      .reduce((sum, wo) => sum + (revenuePerJobType[wo.job_type] || 200), 0);

    // Calculate average completion time from work order estimated durations
    const completedJobs = todaysJobs.filter((wo) => wo.status === "completed");
    const avgTime =
      completedJobs.length > 0
        ? `${(completedJobs.reduce((sum, wo) => sum + (wo.estimated_duration_hours || 1.5), 0) / completedJobs.length).toFixed(1)}h`
        : "--";

    return { completed, scheduled, revenue, avgTime };
  }, [workOrders, todayStr]);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    const todaysJobs = workOrders.filter(
      (wo) => wo.scheduled_date === todayStr,
    );
    const inProgress = todaysJobs.filter((wo) =>
      ["enroute", "on_site", "in_progress"].includes(wo.status),
    ).length;
    const remaining = todaysJobs.filter((wo) =>
      ["scheduled", "confirmed"].includes(wo.status),
    ).length;
    const techsOnDuty = technicians.filter((t) => t.is_active).length;

    // Calculate utilization (jobs per tech)
    const totalTodaysJobs = todaysJobs.length;
    const utilization =
      techsOnDuty > 0
        ? Math.min(100, Math.round((totalTodaysJobs / (techsOnDuty * 6)) * 100))
        : 0;

    return { techsOnDuty, inProgress, remaining, utilization };
  }, [workOrders, technicians, todayStr]);

  // Process technicians with status
  const techniciansWithStatus: TechnicianWithStatus[] = useMemo(() => {
    const inProgressJobs = workOrders.filter(
      (wo) =>
        wo.scheduled_date === todayStr &&
        ["enroute", "on_site", "in_progress"].includes(wo.status),
    );

    return technicians.map((tech) => {
      const fullName = `${tech.first_name} ${tech.last_name}`;
      const currentJob = inProgressJobs.find(
        (wo) => wo.assigned_technician === fullName,
      );

      let status: TechnicianWithStatus["status"] = "offline";
      if (tech.is_active) {
        status = currentJob ? "busy" : "available";
      }

      return { ...tech, status, currentJob };
    });
  }, [technicians, workOrders, todayStr]);

  // Generate alerts (mock based on current data)
  const alerts: Alert[] = useMemo(() => {
    const generatedAlerts: Alert[] = [];

    // Check for emergency priority jobs not started
    const emergencyJobs = workOrders.filter(
      (wo) =>
        wo.priority === "emergency" &&
        wo.scheduled_date === todayStr &&
        !["completed", "in_progress", "on_site"].includes(wo.status),
    );

    emergencyJobs.forEach((job) => {
      generatedAlerts.push({
        id: `emergency-${job.id}`,
        type: "emergency",
        severity: "danger",
        message: `Emergency job not started: ${job.customer_name || "Unknown"}`,
        workOrderId: job.id,
        technicianName: job.assigned_technician || undefined,
        createdAt: new Date(),
      });
    });

    // Check for jobs running late (scheduled time passed but not started)
    const now = new Date();
    const currentHour = now.getHours();
    workOrders
      .filter((wo) => {
        if (wo.scheduled_date !== todayStr) return false;
        if (["completed", "canceled"].includes(wo.status)) return false;
        if (!wo.time_window_start) return false;
        const scheduledHour = parseInt(wo.time_window_start.split(":")[0], 10);
        return (
          scheduledHour < currentHour &&
          !["in_progress", "on_site"].includes(wo.status)
        );
      })
      .slice(0, 3) // Limit to 3 late alerts
      .forEach((job) => {
        generatedAlerts.push({
          id: `late-${job.id}`,
          type: "running_late",
          severity: "warning",
          message: `Running late: ${job.customer_name || "Unknown"} - scheduled for ${job.time_window_start}`,
          workOrderId: job.id,
          technicianName: job.assigned_technician || undefined,
          createdAt: new Date(),
        });
      });

    return generatedAlerts;
  }, [workOrders, todayStr]);

  // Drag and drop handlers
  const handleDragStart = useCallback((jobId: string) => {
    setDraggedJobId(jobId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedJobId(null);
    setDropTargetTechId(null);
  }, []);

  const handleDragOverTech = useCallback((techId: string) => {
    setDropTargetTechId(techId);
  }, []);

  const handleDragLeaveTech = useCallback(() => {
    setDropTargetTechId(null);
  }, []);

  const handleDropOnTech = useCallback(
    (techId: string) => {
      if (!draggedJobId) return;

      const job = unscheduledJobs.find((j) => j.id === draggedJobId);
      const tech = techniciansWithStatus.find((t) => t.id === techId);

      if (job && tech) {
        // Show confirmation modal
        setAssignmentConfirmation({ job, technician: tech });
      }

      setDraggedJobId(null);
      setDropTargetTechId(null);
    },
    [draggedJobId, unscheduledJobs, techniciansWithStatus],
  );

  const handleConfirmAssignment = useCallback(() => {
    if (!assignmentConfirmation) return;

    const { job, technician } = assignmentConfirmation;
    const techName = `${technician.first_name} ${technician.last_name}`;
    const today = new Date().toISOString().split("T")[0];

    setIsAssigning(true);
    assignWorkOrder.mutate(
      {
        id: job.id,
        technician: techName,
        date: today,
      },
      {
        onSuccess: () => {
          addToast("success", `Job assigned to ${techName}`);
          setAssignmentConfirmation(null);
          setIsAssigning(false);
        },
        onError: () => {
          addToast("error", "Failed to assign job. Please try again.");
          setIsAssigning(false);
        },
      },
    );
  }, [assignmentConfirmation, assignWorkOrder, addToast]);

  const handleCancelAssignment = useCallback(() => {
    setAssignmentConfirmation(null);
  }, []);

  const handleJobAssign = useCallback(
    (_jobId: string, techName: string) => {
      addToast("success", `Job assigned to ${techName}`);
    },
    [addToast],
  );

  const handleMetricDrillDown = useCallback(
    (metric: string) => {
      addToast("info", `Drilling down into ${metric}...`);
    },
    [addToast],
  );

  return (
    <div className="p-6">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Assignment Confirmation Modal */}
      <AssignmentConfirmModal
        confirmation={assignmentConfirmation}
        onConfirm={handleConfirmAssignment}
        onCancel={handleCancelAssignment}
        isAssigning={isAssigning}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Operations Command Center
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Real-time operations dashboard -{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus lastUpdated={lastUpdated} />
            <button
              onClick={() => setShowShortcuts(true)}
              className="text-xs text-text-muted hover:text-text-primary"
              title="Keyboard Shortcuts"
            >
              <kbd className="px-2 py-1 bg-bg-secondary border border-border rounded">
                ?
              </kbd>
            </button>
            <Link to="/schedule">
              <Button variant="secondary" size="sm">
                Full Schedule
              </Button>
            </Link>
            <Link to="/work-orders">
              <Button size="sm">New Work Order</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <QuickStatsRow
        techsOnDuty={quickStats.techsOnDuty}
        jobsInProgress={quickStats.inProgress}
        jobsRemaining={quickStats.remaining}
        utilization={quickStats.utilization}
        isLoading={isLoading}
      />

      {/* Today's Metrics */}
      <TodaysMetrics
        completedToday={todaysMetrics.completed}
        scheduledToday={todaysMetrics.scheduled}
        revenueToday={todaysMetrics.revenue}
        avgCompletionTime={todaysMetrics.avgTime}
        isLoading={isLoading}
        onDrillDown={handleMetricDrillDown}
      />

      {/* Main Content Grid - DISPATCH QUEUE NOW ON LEFT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Dispatch Queue (Primary Action Zone) */}
        <div>
          <DispatchQueue
            unassignedJobs={unscheduledJobs}
            technicians={technicians}
            isLoading={isLoading || unscheduledLoading}
            onAssign={handleJobAssign}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            draggedJobId={draggedJobId}
          />
        </div>

        {/* Right Column: Map + Alerts */}
        <div className="space-y-6">
          <LiveTechnicianMap
            technicians={techniciansWithStatus}
            isLoading={isLoading}
            dropTargetTechId={dropTargetTechId}
            onDragOver={handleDragOverTech}
            onDragLeave={handleDragLeaveTech}
            onDrop={handleDropOnTech}
          />
          <ActiveAlertsPanel alerts={alerts} isLoading={isLoading} />
        </div>
      </div>

      {/* Footer with keyboard hint */}
      <div className="mt-6 text-center text-xs text-text-muted">
        Press{" "}
        <kbd className="px-1.5 py-0.5 bg-bg-secondary border border-border rounded mx-1">
          ?
        </kbd>{" "}
        for keyboard shortcuts
      </div>
    </div>
  );
}
