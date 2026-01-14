/**
 * CSM Queue Components
 *
 * Outcome-driven task queue for Customer Success Managers.
 */

export { CSMQueueTab } from "./CSMQueueTab";
export { PriorityQueue } from "./PriorityQueue";
export { TaskCard } from "./TaskCard";
export { QueueFilters } from "./QueueFilters";
export { QueueStats } from "./QueueStats";
export { TaskDetailView } from "./TaskDetailView";
export { PlaybookPanel } from "./PlaybookPanel";
export { OutcomeForm } from "./OutcomeForm";
export { WeeklyOutcomes } from "./WeeklyOutcomes";

// Demo data exports
export {
  demoQueueTasks,
  demoTaskTypes,
  demoPlaybooks,
  demoWeeklyOutcomes,
  demoTaskWithContext,
  getTaskType,
  getPlaybookForTaskType,
} from "./demoData";
