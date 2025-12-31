import { useState, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { useUnscheduledWorkOrders } from '@/api/hooks/useWorkOrders.ts';
import {
  type WorkOrder,
  type Priority,
  type JobType,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/api/types/workOrder.ts';

/**
 * Priority color mapping for indicators
 */
const PRIORITY_COLORS: Record<Priority, string> = {
  emergency: 'bg-red-500',
  urgent: 'bg-orange-500',
  high: 'bg-yellow-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400',
};

const PRIORITY_TEXT_COLORS: Record<Priority, string> = {
  emergency: 'text-red-600',
  urgent: 'text-orange-600',
  high: 'text-yellow-600',
  normal: 'text-blue-600',
  low: 'text-gray-500',
};

/**
 * Draggable table row for unscheduled work orders
 */
function DraggableWorkOrderRow({ workOrder }: { workOrder: WorkOrder }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: workOrder.id,
    data: { workOrder },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const priority = (workOrder.priority as Priority) || 'normal';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        border-b border-border hover:bg-bg-hover transition-colors
        cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 shadow-lg bg-primary/10' : ''}
      `}
    >
      {/* Priority */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-6 rounded-full ${PRIORITY_COLORS[priority]}`} />
          <span className={`text-xs font-medium ${PRIORITY_TEXT_COLORS[priority]}`}>
            {PRIORITY_LABELS[priority]}
          </span>
        </div>
      </td>

      {/* Region (placeholder - using city as region) */}
      <td className="px-3 py-2 text-sm text-text-secondary">
        {workOrder.service_city || '-'}
      </td>

      {/* Customer */}
      <td className="px-3 py-2">
        <span className="font-medium text-sm text-text-primary">
          {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
        </span>
      </td>

      {/* Service Type */}
      <td className="px-3 py-2">
        <Badge variant="default" className="text-xs">
          {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}
        </Badge>
      </td>

      {/* City */}
      <td className="px-3 py-2 text-sm text-text-secondary">
        {workOrder.service_city || '-'}
      </td>

      {/* Address */}
      <td className="px-3 py-2 text-sm text-text-secondary max-w-[200px] truncate">
        {workOrder.service_address_line1 || 'No address'}
      </td>

      {/* Est. Time */}
      <td className="px-3 py-2 text-sm text-text-muted text-center">
        {workOrder.estimated_duration_hours ? `${workOrder.estimated_duration_hours}h` : '-'}
      </td>

      {/* Value (placeholder - not in schema) */}
      <td className="px-3 py-2 text-sm text-text-secondary text-right">
        -
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        <button
          className="text-xs text-primary hover:text-primary-hover"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open work order detail
          }}
        >
          View
        </button>
      </td>
    </tr>
  );
}

/**
 * Sortable column definitions
 */
type SortField = 'priority' | 'region' | 'customer' | 'service' | 'city' | 'duration' | 'value';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

interface ColumnDef {
  field: SortField;
  label: string;
  className?: string;
}

const COLUMNS: ColumnDef[] = [
  { field: 'priority', label: 'Priority' },
  { field: 'region', label: 'Region' },
  { field: 'customer', label: 'Customer' },
  { field: 'service', label: 'Service' },
  { field: 'city', label: 'City' },
  { field: 'duration', label: 'Est. Time', className: 'text-center' },
  { field: 'value', label: 'Value', className: 'text-right' },
];

/**
 * UnscheduledOrdersTable - Collapsible table at top of schedule page
 *
 * Shows all unscheduled work orders in a sortable, searchable table.
 * Rows are draggable and can be dropped onto the calendar below.
 */
export function UnscheduledOrdersTable() {
  const { data, isLoading, isError, refetch, isFetching } = useUnscheduledWorkOrders();

  // Droppable zone for unscheduling work orders (drag scheduled items here)
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: 'unscheduled-drop-zone',
    data: { type: 'unschedule' },
  });

  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortState>({ field: 'priority', direction: 'desc' });
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Priority order for sorting
  const priorityOrder: Record<Priority, number> = {
    emergency: 5,
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

  // Get unique regions (cities) from work orders
  const regions = useMemo(() => {
    const cities = new Set<string>();
    (data?.items || []).forEach((wo) => {
      if (wo.service_city) cities.add(wo.service_city);
    });
    return Array.from(cities).sort();
  }, [data?.items]);

  // Filter and sort work orders
  const filteredWorkOrders = useMemo(() => {
    let items = data?.items || [];

    // Filter by region
    if (regionFilter !== 'all') {
      items = items.filter((wo) => wo.service_city === regionFilter);
    }

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
        case 'region':
        case 'city':
          comparison = (a.service_city || '').localeCompare(b.service_city || '');
          break;
        case 'customer':
          comparison = (a.customer_name || '').localeCompare(b.customer_name || '');
          break;
        case 'service':
          comparison = (a.job_type || '').localeCompare(b.job_type || '');
          break;
        case 'duration':
          comparison = (a.estimated_duration_hours || 0) - (b.estimated_duration_hours || 0);
          break;
        case 'value':
          // Value field not in schema, sort by duration as placeholder
          comparison = (a.estimated_duration_hours || 0) - (b.estimated_duration_hours || 0);
          break;
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });

    return items;
  }, [data?.items, searchQuery, sort, regionFilter, priorityOrder]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sort.field !== field) {
      return <span className="text-text-muted opacity-50 ml-1">⇅</span>;
    }
    return <span className="ml-1">{sort.direction === 'desc' ? '↓' : '↑'}</span>;
  };

  const totalCount = data?.items?.length || 0;

  return (
    <div
      ref={setDropRef}
      data-testid="unscheduled-drop-zone"
      className={`bg-bg-card border rounded-lg mb-6 overflow-hidden transition-all ${
        isDropOver
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
          : 'border-border'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-bg-muted border-b border-border cursor-pointer hover:bg-bg-hover transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <button
            className="text-text-secondary hover:text-text-primary transition-transform"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <h3 className="font-semibold text-text-primary">
            Unscheduled Work Orders
          </h3>
          <Badge variant="primary" className="text-xs">
            {filteredWorkOrders.length} {regionFilter !== 'all' || searchQuery ? `of ${totalCount}` : ''} jobs
          </Badge>
        </div>

        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {/* Region filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="text-sm border border-border rounded px-2 py-1 bg-white text-text-primary"
          >
            <option value="all">All Regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>

          {/* Search */}
          <Input
            type="search"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm w-48"
          />
        </div>
      </div>

      {/* Table */}
      {isExpanded && (
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          {isLoading || isFetching ? (
            <div className="p-8 text-center text-text-muted">Loading unscheduled work orders...</div>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-danger mb-3">Failed to load work orders</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          ) : filteredWorkOrders.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              {searchQuery || regionFilter !== 'all'
                ? 'No matching jobs found'
                : 'No unscheduled work orders'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-bg-subtle sticky top-0">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.field}
                      onClick={() => toggleSort(col.field)}
                      className={`px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hover:bg-bg-hover transition-colors ${col.className || ''}`}
                    >
                      {col.label}
                      <SortIndicator field={col.field} />
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkOrders.map((wo) => (
                  <DraggableWorkOrderRow key={wo.id} workOrder={wo} />
                ))}
              </tbody>
            </table>
          )}

          {/* Footer hint */}
          {filteredWorkOrders.length > 0 && (
            <div className="px-4 py-2 bg-bg-subtle border-t border-border text-xs text-text-muted text-center">
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 9l7 7 7-7" />
                </svg>
                Drag rows to the calendar below to schedule
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
