import { useState, useMemo, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useUnscheduledWorkOrders } from '@/api/hooks/useWorkOrders.ts';
import {
  type WorkOrder,
  type Priority,
  type JobType,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/api/types/workOrder.ts';
import { useScheduleStore } from '../store/scheduleStore.ts';

/**
 * Priority color mapping
 */
const PRIORITY_COLORS: Record<Priority, string> = {
  emergency: 'bg-red-500',
  urgent: 'bg-orange-500',
  high: 'bg-yellow-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400',
};

/**
 * Draggable work order row in the unscheduled panel
 * Memoized to prevent unnecessary re-renders when parent list updates
 */
const DraggableWorkOrderRow = memo(function DraggableWorkOrderRow({
  workOrder,
}: {
  workOrder: WorkOrder;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: workOrder.id,
    data: { workOrder },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-3 p-3 bg-white border-b border-border
        cursor-grab active:cursor-grabbing hover:bg-bg-hover transition-colors
        ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}
      `}
    >
      {/* Priority indicator */}
      <div
        className={`w-2 h-8 rounded-full ${PRIORITY_COLORS[workOrder.priority as Priority] || PRIORITY_COLORS.normal}`}
        title={PRIORITY_LABELS[workOrder.priority as Priority]}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary truncate">
            {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
          </span>
          <Badge variant="default" className="text-[10px] shrink-0">
            {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}
          </Badge>
        </div>
        <div className="text-xs text-text-secondary truncate">
          {workOrder.service_city && `${workOrder.service_city}, `}
          {workOrder.service_address_line1 || 'No address'}
        </div>
      </div>

      {/* Duration */}
      {workOrder.estimated_duration_hours && (
        <div className="text-xs text-text-muted whitespace-nowrap">
          {workOrder.estimated_duration_hours}h
        </div>
      )}
    </div>
  );
});

/**
 * Sortable column header
 */
type SortField = 'priority' | 'customer' | 'city' | 'job_type';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

/**
 * Unscheduled Panel - Slide-out drawer with draggable work orders
 */
export function UnscheduledPanel() {
  const { unscheduledPanelOpen, setUnscheduledPanelOpen } = useScheduleStore();
  const { data, isLoading, isError } = useUnscheduledWorkOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortState>({ field: 'priority', direction: 'desc' });

  // Priority order for sorting
  const priorityOrder: Record<Priority, number> = {
    emergency: 5,
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

  // Filter and sort work orders
  const filteredWorkOrders = useMemo(() => {
    let items = data?.items || [];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (wo) =>
          wo.customer_name?.toLowerCase().includes(query) ||
          wo.service_city?.toLowerCase().includes(query) ||
          wo.service_address_line1?.toLowerCase().includes(query) ||
          wo.job_type?.toLowerCase().includes(query)
      );
    }

    // Sort
    items = [...items].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'priority':
          comparison =
            (priorityOrder[b.priority as Priority] || 0) -
            (priorityOrder[a.priority as Priority] || 0);
          break;
        case 'customer':
          comparison = (a.customer_name || '').localeCompare(b.customer_name || '');
          break;
        case 'city':
          comparison = (a.service_city || '').localeCompare(b.service_city || '');
          break;
        case 'job_type':
          comparison = (a.job_type || '').localeCompare(b.job_type || '');
          break;
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });

    return items;
  }, [data?.items, searchQuery, sort, priorityOrder]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <span className="text-text-muted">⇅</span>;
    return <span>{sort.direction === 'desc' ? '↓' : '↑'}</span>;
  };

  if (!unscheduledPanelOpen) {
    return (
      <button
        onClick={() => setUnscheduledPanelOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-primary text-white px-2 py-4 rounded-l-lg shadow-lg hover:bg-primary-hover transition-colors z-40"
        title="Open Unscheduled Jobs"
        aria-label={`Open unscheduled jobs panel, ${data?.items?.length || 0} jobs`}
      >
        <span className="writing-mode-vertical text-sm font-medium">
          Unscheduled ({data?.items?.length || 0})
        </span>
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-bg-card border-l border-border shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-muted">
        <h3 className="font-semibold text-text-primary">
          Unscheduled Jobs ({filteredWorkOrders.length})
        </h3>
        <button
          onClick={() => setUnscheduledPanelOpen(false)}
          className="text-text-muted hover:text-text-primary p-1"
          title="Close panel"
          aria-label="Close unscheduled jobs panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <Input
          type="search"
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* Sort headers */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-subtle text-xs text-text-secondary">
        <button onClick={() => toggleSort('priority')} className="hover:text-primary" aria-label="Sort by priority">
          Pri <SortIndicator field="priority" />
        </button>
        <button onClick={() => toggleSort('customer')} className="hover:text-primary flex-1" aria-label="Sort by customer name">
          Customer <SortIndicator field="customer" />
        </button>
        <button onClick={() => toggleSort('city')} className="hover:text-primary" aria-label="Sort by city">
          City <SortIndicator field="city" />
        </button>
      </div>

      {/* Work orders list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-text-muted">Loading...</div>
        ) : isError ? (
          <div className="p-4 text-center text-danger">Failed to load work orders</div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="p-4 text-center text-text-muted">
            {searchQuery ? 'No matching jobs' : 'No unscheduled jobs'}
          </div>
        ) : (
          filteredWorkOrders.map((wo) => <DraggableWorkOrderRow key={wo.id} workOrder={wo} />)
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-bg-muted">
        <Button variant="primary" size="sm" className="w-full">
          + New Work Order
        </Button>
      </div>
    </div>
  );
}
