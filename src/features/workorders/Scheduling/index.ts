/**
 * Scheduling Components Index
 * Export all scheduling-related components and utilities
 */

// Main calendar and timeline views
export { ScheduleCalendar } from "./ScheduleCalendar.tsx";
export { ScheduleTimeline } from "./ScheduleTimeline.tsx";

// Time and date selection
export { TimeSlotPicker } from "./TimeSlotPicker.tsx";

// Capacity and availability
export { TechnicianAvailability } from "./TechnicianAvailability.tsx";

// Conflict detection
export {
  ConflictDetector,
  ConflictIndicator,
  ConflictSummary,
} from "./ConflictDetector.tsx";

// Drag and drop scheduling
export { DragDropScheduler } from "./DragDropScheduler.tsx";

// Recurring schedules
export { RecurringSchedule, RecurringBadge } from "./RecurringSchedule.tsx";

// Smart/AI scheduling
export { SmartScheduler, SmartSchedulerInline } from "./SmartScheduler.tsx";

// Hooks
export {
  useAvailableSlots,
  useConflicts,
  useTechnicianCapacity,
  useSchedulingSuggestions,
  useCalendarWorkOrders,
  useTechnicianDaySchedule,
  useUnscheduledStats,
  useRecurringSchedule,
  schedulingKeys,
} from "./hooks/useScheduling.ts";

// Utilities
export {
  calculateTravelTime,
  calculateDistance,
  detectConflicts,
  findOptimalSlot,
  getAvailableSlots,
  calculateTechnicianUtilization,
  optimizeRouteOrder,
} from "./utils/scheduleOptimizer.ts";
