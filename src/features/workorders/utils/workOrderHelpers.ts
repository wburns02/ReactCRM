import type {
  WorkOrder,
  WorkOrderStatus,
  Priority,
} from '@/api/types/workOrder';

// Re-export color constants for convenience
export { STATUS_COLORS, PRIORITY_COLORS } from '@/api/types/workOrder';

/**
 * Get the hex color for a work order status
 */
export function getStatusColor(status: WorkOrderStatus): string {
  const colors: Record<WorkOrderStatus, string> = {
    draft: '#6b7280',
    scheduled: '#3b82f6',
    confirmed: '#10b981',
    enroute: '#f59e0b',
    on_site: '#06b6d4',
    in_progress: '#8b5cf6',
    completed: '#22c55e',
    canceled: '#ef4444',
    requires_followup: '#f97316',
  };
  return colors[status] || '#6b7280';
}

/**
 * Get Tailwind background color class for a work order status
 */
export function getStatusBgClass(status: WorkOrderStatus): string {
  const classes: Record<WorkOrderStatus, string> = {
    draft: 'bg-gray-500',
    scheduled: 'bg-blue-500',
    confirmed: 'bg-emerald-500',
    enroute: 'bg-amber-500',
    on_site: 'bg-cyan-500',
    in_progress: 'bg-violet-500',
    completed: 'bg-green-500',
    canceled: 'bg-red-500',
    requires_followup: 'bg-orange-500',
  };
  return classes[status] || 'bg-gray-500';
}

/**
 * Get Tailwind text/bg light classes for status badges
 */
export function getStatusClasses(status: WorkOrderStatus): string {
  const classes: Record<WorkOrderStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    enroute: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    on_site: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
    in_progress: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    canceled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    requires_followup: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Get the hex color for a priority level
 */
export function getPriorityColor(priority: Priority): string {
  const colors: Record<Priority, string> = {
    low: '#6b7280',
    normal: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
    emergency: '#dc2626',
  };
  return colors[priority] || '#6b7280';
}

/**
 * Get Tailwind classes for priority badges
 */
export function getPriorityClasses(priority: Priority): string {
  const classes: Record<Priority, string> = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    emergency: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return classes[priority] || 'bg-gray-100 text-gray-700';
}

/**
 * Check if priority should show pulsing animation
 */
export function isPriorityUrgent(priority: Priority): boolean {
  return priority === 'urgent' || priority === 'emergency';
}

/**
 * Format a service address from work order fields
 */
export function formatAddress(workOrder: WorkOrder): string {
  const parts: string[] = [];

  if (workOrder.service_address_line1) {
    parts.push(workOrder.service_address_line1);
  }
  if (workOrder.service_address_line2) {
    parts.push(workOrder.service_address_line2);
  }

  const cityStateZip: string[] = [];
  if (workOrder.service_city) {
    cityStateZip.push(workOrder.service_city);
  }
  if (workOrder.service_state) {
    cityStateZip.push(workOrder.service_state);
  }
  if (workOrder.service_postal_code) {
    cityStateZip.push(workOrder.service_postal_code);
  }

  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }

  return parts.join('\n') || 'No address';
}

/**
 * Format a single-line short address
 */
export function formatShortAddress(workOrder: WorkOrder): string {
  const parts: string[] = [];

  if (workOrder.service_address_line1) {
    parts.push(workOrder.service_address_line1);
  }
  if (workOrder.service_city) {
    parts.push(workOrder.service_city);
  }

  return parts.join(', ') || 'No address';
}

/**
 * Get customer display name from work order
 */
export function getCustomerName(workOrder: WorkOrder): string {
  if (workOrder.customer_name) {
    return workOrder.customer_name;
  }
  if (workOrder.customer) {
    return `${workOrder.customer.first_name} ${workOrder.customer.last_name}`.trim();
  }
  return 'Unknown Customer';
}

/**
 * Calculate the age of a work order (time since created)
 */
export function calculateAge(createdAt: string | null): string {
  if (!createdAt) return 'Unknown';

  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}

/**
 * Format relative time for activity entries
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Sort order options for work orders
 */
export type SortField = 'created_at' | 'scheduled_date' | 'priority' | 'status' | 'customer_name';
export type SortDirection = 'asc' | 'desc';

export interface SortOrder {
  field: SortField;
  direction: SortDirection;
}

/**
 * Priority weight for sorting (higher = more urgent)
 */
const PRIORITY_WEIGHT: Record<Priority, number> = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4,
  emergency: 5,
};

/**
 * Status weight for sorting (workflow order)
 */
const STATUS_WEIGHT: Record<WorkOrderStatus, number> = {
  emergency: 0, // Not a real status but included for safety
  draft: 1,
  scheduled: 2,
  confirmed: 3,
  enroute: 4,
  on_site: 5,
  in_progress: 6,
  completed: 7,
  canceled: 8,
  requires_followup: 9,
} as unknown as Record<WorkOrderStatus, number>;

/**
 * Sort work orders by specified field and direction
 */
export function sortWorkOrders(
  workOrders: WorkOrder[],
  sortOrder: SortOrder
): WorkOrder[] {
  const sorted = [...workOrders].sort((a, b) => {
    let comparison = 0;

    switch (sortOrder.field) {
      case 'created_at': {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = dateA - dateB;
        break;
      }
      case 'scheduled_date': {
        const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
        const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
        comparison = dateA - dateB;
        break;
      }
      case 'priority': {
        comparison = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        break;
      }
      case 'status': {
        comparison = (STATUS_WEIGHT[a.status] || 0) - (STATUS_WEIGHT[b.status] || 0);
        break;
      }
      case 'customer_name': {
        const nameA = getCustomerName(a).toLowerCase();
        const nameB = getCustomerName(b).toLowerCase();
        comparison = nameA.localeCompare(nameB);
        break;
      }
    }

    return sortOrder.direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Filter interface for work orders
 */
export interface WorkOrderFilterState {
  statuses: WorkOrderStatus[];
  priorities: Priority[];
  technicianId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  searchQuery: string;
}

/**
 * Default filter state
 */
export const DEFAULT_FILTERS: WorkOrderFilterState = {
  statuses: [],
  priorities: [],
  technicianId: null,
  dateFrom: null,
  dateTo: null,
  searchQuery: '',
};

/**
 * Filter work orders based on filter state
 */
export function filterWorkOrders(
  workOrders: WorkOrder[],
  filters: WorkOrderFilterState
): WorkOrder[] {
  return workOrders.filter((wo) => {
    // Status filter
    if (filters.statuses.length > 0 && !filters.statuses.includes(wo.status)) {
      return false;
    }

    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(wo.priority)) {
      return false;
    }

    // Technician filter
    if (filters.technicianId && wo.assigned_technician !== filters.technicianId) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const scheduledDate = wo.scheduled_date ? new Date(wo.scheduled_date) : null;
      if (!scheduledDate) return false;

      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (scheduledDate < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (scheduledDate > to) return false;
      }
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const customerName = getCustomerName(wo).toLowerCase();
      const address = formatShortAddress(wo).toLowerCase();
      const notes = (wo.notes || '').toLowerCase();

      if (
        !customerName.includes(query) &&
        !address.includes(query) &&
        !notes.includes(query) &&
        !wo.id.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Format scheduled time window
 */
export function formatTimeWindow(workOrder: WorkOrder): string {
  if (!workOrder.time_window_start && !workOrder.time_window_end) {
    return 'No time set';
  }

  const formatTime = (time: string | null): string => {
    if (!time) return '';
    try {
      const date = new Date(`2000-01-01T${time}`);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  const start = formatTime(workOrder.time_window_start);
  const end = formatTime(workOrder.time_window_end);

  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end;
}

/**
 * Get initials from a name for avatar display
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Check if a work order is overdue
 */
export function isOverdue(workOrder: WorkOrder): boolean {
  if (workOrder.status === 'completed' || workOrder.status === 'canceled') {
    return false;
  }
  if (!workOrder.scheduled_date) {
    return false;
  }

  const scheduled = new Date(workOrder.scheduled_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return scheduled < today;
}

/**
 * Check if a work order is scheduled for today
 */
export function isToday(workOrder: WorkOrder): boolean {
  if (!workOrder.scheduled_date) return false;

  const scheduled = new Date(workOrder.scheduled_date);
  const today = new Date();

  return (
    scheduled.getFullYear() === today.getFullYear() &&
    scheduled.getMonth() === today.getMonth() &&
    scheduled.getDate() === today.getDate()
  );
}
