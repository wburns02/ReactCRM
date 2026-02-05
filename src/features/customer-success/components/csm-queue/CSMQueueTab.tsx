/**
 * CSMQueueTab Component
 *
 * Main container for the CSM Task Queue feature - the primary work interface for CSMs.
 */

import { useState, useMemo } from "react";
import {
  useCSMTaskQueue,
  useCSMWeeklyOutcomes,
  useStartCSMTask,
  useCompleteCSMTask,
  useRescheduleCSMTask,
  useEscalateCSMTask,
  useSnoozeCSMTask,
} from "../../../../api/hooks/useCustomerSuccess";
import type {
  CSMQueueTask,
  CSMQueueFilters,
  CSMTaskOutcomeFormData,
} from "../../../../api/types/customerSuccess";
import { QueueStats } from "./QueueStats";
import { QueueFilters } from "./QueueFilters";
import { PriorityQueue } from "./PriorityQueue";
import { TaskDetailView } from "./TaskDetailView";
import { WeeklyOutcomes } from "./WeeklyOutcomes";
import {
  demoQueueTasks,
  demoTaskTypes,
  demoPlaybooks,
  demoWeeklyOutcomes,
  demoTaskWithContext,
} from "./demoData";

type ViewMode = "queue" | "outcomes";

export function CSMQueueTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("queue");
  const [filters, setFilters] = useState<CSMQueueFilters>({
    page: 1,
    page_size: 50,
    status: ["pending", "in_progress"],
    sort_by: "priority_score",
    sort_order: "desc",
  });
  const [selectedTask, setSelectedTask] = useState<CSMQueueTask | null>(null);

  // API queries
  const { data: queueData, isLoading: isQueueLoading } =
    useCSMTaskQueue(filters);
  const { data: outcomesData, isLoading: isOutcomesLoading } =
    useCSMWeeklyOutcomes();

  // Mutations
  const startTask = useStartCSMTask();
  const completeTask = useCompleteCSMTask();
  const rescheduleTask = useRescheduleCSMTask();
  const escalateTask = useEscalateCSMTask();
  const snoozeTask = useSnoozeCSMTask();

  // Use demo data if API returns empty
  const tasks = useMemo(() => {
    if (queueData?.items && queueData.items.length > 0) {
      return queueData.items;
    }
    // Filter demo data based on filters
    let filteredTasks = [...demoQueueTasks];

    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      filteredTasks = filteredTasks.filter((t) => statuses.includes(t.status));
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      filteredTasks = filteredTasks.filter((t) =>
        priorities.includes(t.priority),
      );
    }

    if (filters.category) {
      const categoryTaskSlugs = demoTaskTypes
        .filter((tt) => tt.category === filters.category)
        .map((tt) => tt.slug);
      filteredTasks = filteredTasks.filter((t) =>
        categoryTaskSlugs.includes(t.task_type_slug || ""),
      );
    }

    // Sort by priority score descending
    if (filters.sort_by === "priority_score") {
      filteredTasks.sort((a, b) =>
        filters.sort_order === "asc"
          ? a.priority_score - b.priority_score
          : b.priority_score - a.priority_score,
      );
    }

    return filteredTasks;
  }, [queueData, filters]);

  const weeklyOutcomes = outcomesData || demoWeeklyOutcomes;

  // Get task type and playbook for selected task
  const selectedTaskType = selectedTask
    ? demoTaskTypes.find(
        (tt) =>
          tt.id === selectedTask.task_type_id ||
          tt.slug === selectedTask.task_type_slug,
      )
    : undefined;
  const selectedPlaybook = selectedTaskType?.playbook_id
    ? demoPlaybooks.find((p) => p.id === selectedTaskType.playbook_id)
    : undefined;

  // Use demo context for now (in production, would fetch from API)
  const selectedTaskContext = selectedTask
    ? selectedTask.id === 1
      ? demoTaskWithContext
      : {
          task: selectedTask,
          task_type: selectedTaskType!,
          playbook: selectedPlaybook || null,
          customer: {
            id: Number(selectedTask.customer_id),
            name: selectedTask.customer_name || "Unknown",
            email: selectedTask.customer_email || "",
            phone: null,
            arr: selectedTask.customer_arr,
            health_score: selectedTask.customer_health_score,
            health_status: selectedTask.customer_health_status,
            tier: selectedTask.customer_tier,
            renewal_date: selectedTask.customer_renewal_date,
            churn_probability: null,
            days_since_last_contact: null,
            contacts: [],
          },
          interaction_history: [],
        }
    : null;

  const handleStartTask = async (taskId: number) => {
    try {
      await startTask.mutateAsync(taskId);
    } catch (error) {
      console.error("Failed to start task:", error);
    }
  };

  const handleCompleteTask = async (taskId: number, outcomeData: unknown) => {
    try {
      await completeTask.mutateAsync({
        taskId,
        data: outcomeData as CSMTaskOutcomeFormData,
      });
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleReschedule = async (taskId: number) => {
    const newDate = window.prompt("Reschedule to (YYYY-MM-DD):");
    if (!newDate) return;
    const reason = window.prompt("Reason for rescheduling:") || "Rescheduled";
    try {
      await rescheduleTask.mutateAsync({
        taskId,
        data: { new_due_date: newDate, reason },
      });
    } catch (error) {
      console.error("Failed to reschedule task:", error);
    }
  };

  const handleEscalate = async (taskId: number) => {
    const reason = window.prompt("Reason for escalation:");
    if (!reason) return;
    try {
      await escalateTask.mutateAsync({
        taskId,
        data: { reason },
      });
    } catch (error) {
      console.error("Failed to escalate task:", error);
    }
  };

  const handleSnooze = async (taskId: number) => {
    const hours = window.prompt("Snooze for how many hours?", "24");
    if (!hours) return;
    const snoozeUntil = new Date(
      Date.now() + parseInt(hours, 10) * 60 * 60 * 1000,
    ).toISOString();
    const reason = window.prompt("Reason for snoozing:") || "Snoozed";
    try {
      await snoozeTask.mutateAsync({
        taskId,
        snoozeUntil,
        reason,
      });
    } catch (error) {
      console.error("Failed to snooze task:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            CSM Task Queue
          </h1>
          <p className="text-text-muted">
            Your prioritized work queue - focus on outcomes, not activities
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-bg-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode("queue")}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                viewMode === "queue"
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text-primary"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Queue
            </span>
          </button>
          <button
            onClick={() => setViewMode("outcomes")}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                viewMode === "outcomes"
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text-primary"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Outcomes
            </span>
          </button>
        </div>
      </div>

      {viewMode === "queue" ? (
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left: Queue List */}
          <div
            className={`flex flex-col min-h-0 ${selectedTask ? "w-1/2" : "w-full"}`}
          >
            <QueueStats tasks={tasks} isLoading={isQueueLoading} />
            <QueueFilters filters={filters} onFiltersChange={setFilters} />
            <div className="flex-1 overflow-y-auto">
              <PriorityQueue
                tasks={tasks}
                selectedTaskId={selectedTask?.id}
                onSelectTask={setSelectedTask}
                onStartTask={handleStartTask}
                onSnoozeTask={handleSnooze}
                onRescheduleTask={handleReschedule}
                isLoading={isQueueLoading}
                groupByPriority={true}
              />
            </div>
          </div>

          {/* Right: Task Detail */}
          {selectedTask && selectedTaskContext && (
            <div className="w-1/2 min-h-0">
              <TaskDetailView
                task={selectedTask}
                taskType={selectedTaskContext.task_type}
                playbook={selectedTaskContext.playbook}
                customer={selectedTaskContext.customer}
                interactionHistory={selectedTaskContext.interaction_history}
                onClose={() => setSelectedTask(null)}
                onComplete={handleCompleteTask}
                onReschedule={handleReschedule}
                onEscalate={handleEscalate}
                isCompletePending={completeTask.isPending}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <WeeklyOutcomes
            outcomes={weeklyOutcomes}
            isLoading={isOutcomesLoading}
          />
        </div>
      )}
    </div>
  );
}

export default CSMQueueTab;
