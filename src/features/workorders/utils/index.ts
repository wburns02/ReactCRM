// Work Order Utilities - Public API

export {
  // Color helpers
  getStatusColor,
  getStatusBgClass,
  getStatusClasses,
  getPriorityColor,
  getPriorityClasses,
  isPriorityUrgent,

  // Address formatting
  formatAddress,
  formatShortAddress,

  // Customer helpers
  getCustomerName,
  getInitials,

  // Time helpers
  calculateAge,
  formatRelativeTime,
  formatTimeWindow,

  // Sorting
  sortWorkOrders,
  DEFAULT_FILTERS,

  // Filtering
  filterWorkOrders,

  // Status checks
  isOverdue,
  isToday,

  // Re-exported constants
  STATUS_COLORS,
  PRIORITY_COLORS,
} from "./workOrderHelpers";

export type {
  SortField,
  SortDirection,
  SortOrder,
  WorkOrderFilterState,
} from "./workOrderHelpers";
