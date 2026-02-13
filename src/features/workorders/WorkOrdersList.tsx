import { memo, useCallback, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { formatDate } from "@/lib/utils.ts";
import { useIsMobileOrTablet } from "@/hooks/useMediaQuery";
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
  type WorkOrder,
  type WorkOrderStatus,
  type JobType,
  type Priority,
} from "@/api/types/workOrder.ts";

interface WorkOrdersListProps {
  workOrders: WorkOrder[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (workOrder: WorkOrder) => void;
  onDelete?: (workOrder: WorkOrder) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

/**
 * Get badge variant based on status
 */
function getStatusVariant(
  status: WorkOrderStatus,
): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case "completed":
      return "success";
    case "canceled":
      return "danger";
    case "scheduled":
    case "confirmed":
      return "default";
    case "enroute":
    case "on_site":
    case "in_progress":
      return "warning";
    case "requires_followup":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Get badge variant based on priority
 */
function getPriorityVariant(
  priority: Priority,
): "default" | "success" | "warning" | "danger" {
  switch (priority) {
    case "low":
      return "default";
    case "normal":
      return "success";
    case "high":
      return "warning";
    case "urgent":
    case "emergency":
      return "danger";
    default:
      return "default";
  }
}

/**
 * Memoized mobile card row - prevents re-render unless props change
 */
interface WorkOrderRowProps {
  wo: WorkOrder;
  onEdit?: (wo: WorkOrder) => void;
  onDelete?: (wo: WorkOrder) => void;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
}

const MobileWorkOrderCard = memo(function MobileWorkOrderCard({
  wo,
  onEdit,
  onDelete,
}: WorkOrderRowProps) {
  const navigate = useNavigate();

  const customerName =
    wo.customer_name ||
    (wo.customer
      ? `${wo.customer.first_name} ${wo.customer.last_name}`
      : `Customer #${wo.customer_id}`);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking interactive elements
    if ((e.target as HTMLElement).closest("a, button")) {
      return;
    }
    navigate(`/work-orders/${wo.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/work-orders/${wo.id}`);
    }
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Work order for ${customerName}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">
            {wo.customer_name ||
              (wo.customer
                ? `${wo.customer.first_name} ${wo.customer.last_name}`
                : `Customer #${wo.customer_id}`)}
          </h3>
          <p className="text-xs text-text-muted">{wo.work_order_number || `WO-${wo.id.slice(0, 8)}`}</p>
        </div>
        <Badge variant={getStatusVariant(wo.status as WorkOrderStatus)}>
          {WORK_ORDER_STATUS_LABELS[wo.status as WorkOrderStatus] || wo.status}
        </Badge>
      </div>

      <div className="space-y-2 text-sm mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            {JOB_TYPE_LABELS[wo.job_type as JobType] || wo.job_type}
          </Badge>
          <Badge
            variant={getPriorityVariant(wo.priority as Priority)}
            className="text-xs"
          >
            {PRIORITY_LABELS[wo.priority as Priority] || wo.priority}
          </Badge>
        </div>

        {wo.scheduled_date ? (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">📅</span>
            <div>
              <span className="text-text-primary font-medium">
                {formatDate(wo.scheduled_date)}
              </span>
              {wo.time_window_start && (
                <span className="text-text-secondary ml-2 text-xs">
                  {wo.time_window_start.slice(0, 5)}
                  {wo.time_window_end && ` - ${wo.time_window_end.slice(0, 5)}`}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">📅</span>
            <span className="text-text-muted italic">Not scheduled</span>
          </div>
        )}

        {wo.assigned_technician && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">👷</span>
            <span className="text-text-secondary">
              {wo.assigned_technician}
            </span>
          </div>
        )}

        {(wo.service_city || wo.service_state) && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">📍</span>
            <span className="text-text-secondary">
              {wo.service_city}
              {wo.service_state && `, ${wo.service_state}`}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link to={`/work-orders/${wo.id}`} className="flex-1">
          <Button variant="primary" size="sm" className="w-full">
            View
          </Button>
        </Link>
        {onEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(wo)}
            className="flex-1"
          >
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(wo)}
            className="text-danger hover:text-danger"
          >
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
});

/**
 * Memoized table row - prevents re-render unless props change
 */
const TableWorkOrderRow = memo(function TableWorkOrderRow({
  wo,
  onEdit,
  onDelete,
  isSelected,
  onToggleSelection,
}: WorkOrderRowProps) {
  const navigate = useNavigate();

  const customerName =
    wo.customer_name ||
    (wo.customer
      ? `${wo.customer.first_name} ${wo.customer.last_name}`
      : `Customer #${wo.customer_id}`);

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking interactive elements
    if ((e.target as HTMLElement).closest("a, button")) {
      return;
    }
    navigate(`/work-orders/${wo.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/work-orders/${wo.id}`);
    }
  };

  return (
    <tr
      className="hover:bg-bg-hover transition-colors cursor-pointer"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      role="row"
      aria-label={`View work order for ${customerName}`}
    >
      {onToggleSelection && (
        <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={() => onToggleSelection(wo.id)}
            className="rounded border-gray-300"
            aria-label={`Select work order for ${customerName}`}
          />
        </td>
      )}
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-text-primary">
            {wo.customer_name ||
              (wo.customer
                ? `${wo.customer.first_name} ${wo.customer.last_name}`
                : `Customer #${wo.customer_id}`)}
          </p>
          {wo.service_city && wo.service_state && (
            <p className="text-sm text-text-secondary">
              {wo.service_city}, {wo.service_state}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="default">
          {JOB_TYPE_LABELS[wo.job_type as JobType] || wo.job_type}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm">
        {wo.scheduled_date ? (
          <div>
            <p className="text-text-primary">{formatDate(wo.scheduled_date)}</p>
            {wo.time_window_start && (
              <p className="text-text-secondary text-xs">
                {wo.time_window_start.slice(0, 5)}
                {wo.time_window_end && ` - ${wo.time_window_end.slice(0, 5)}`}
              </p>
            )}
          </div>
        ) : (
          <span className="text-text-muted">Not scheduled</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">
        {wo.assigned_technician || "-"}
      </td>
      <td className="px-4 py-3">
        <Badge variant={getPriorityVariant(wo.priority as Priority)}>
          {PRIORITY_LABELS[wo.priority as Priority] || wo.priority}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={getStatusVariant(wo.status as WorkOrderStatus)}>
          {WORK_ORDER_STATUS_LABELS[wo.status as WorkOrderStatus] || wo.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link to={`/work-orders/${wo.id}`}>
            <Button variant="ghost" size="sm" aria-label="View work order">
              View
            </Button>
          </Link>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(wo)}
              aria-label="Edit work order"
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(wo)}
              aria-label="Delete work order"
              className="text-danger hover:text-danger"
            >
              Delete
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});

/**
 * Work Orders data table with pagination
 */
/**
 * Sortable column types
 */
type SortField = "customer" | "job_type" | "scheduled_date" | "priority" | "status" | "technician";
type SortDirection = "asc" | "desc";

export function WorkOrdersList({
  workOrders,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
}: WorkOrdersListProps) {
  const hasSelection = selectedIds && onToggleSelection;
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const isMobileOrTablet = useIsMobileOrTablet();

  // Sort state
  const [sortField, setSortField] = useState<SortField>("scheduled_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Priority order mapping for sorting
  const priorityOrder: Record<Priority, number> = {
    emergency: 5,
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

  // Status order mapping for sorting
  const statusOrder: Record<WorkOrderStatus, number> = {
    draft: 1,
    scheduled: 2,
    confirmed: 3,
    enroute: 4,
    on_site: 5,
    in_progress: 6,
    completed: 7,
    canceled: 8,
    requires_followup: 9,
  };

  // Sorted work orders
  const sortedWorkOrders = useMemo(() => {
    return [...workOrders].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "customer":
          const aCustomer = a.customer_name || (a.customer ? `${a.customer.first_name} ${a.customer.last_name}` : "");
          const bCustomer = b.customer_name || (b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "");
          comparison = aCustomer.localeCompare(bCustomer);
          break;
        case "job_type":
          comparison = (a.job_type || "").localeCompare(b.job_type || "");
          break;
        case "scheduled_date":
          comparison = (a.scheduled_date || "").localeCompare(b.scheduled_date || "");
          break;
        case "technician":
          comparison = (a.assigned_technician || "").localeCompare(b.assigned_technician || "");
          break;
        case "priority":
          comparison = (priorityOrder[a.priority as Priority] || 0) - (priorityOrder[b.priority as Priority] || 0);
          break;
        case "status":
          comparison = (statusOrder[a.status as WorkOrderStatus] || 0) - (statusOrder[b.status as WorkOrderStatus] || 0);
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [workOrders, sortField, sortDirection, priorityOrder, statusOrder]);

  // Toggle sort function
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-text-muted opacity-50 ml-1">⇅</span>;
    }
    return (
      <span className="ml-1">{sortDirection === "desc" ? "↓" : "↑"}</span>
    );
  };

  // Memoized callbacks for child components - must be called before any conditional returns
  const handleEdit = useCallback((wo: WorkOrder) => onEdit?.(wo), [onEdit]);
  const handleDelete = useCallback(
    (wo: WorkOrder) => onDelete?.(wo),
    [onDelete],
  );

  if (isLoading) {
    return <LoadingSkeleton isMobile={isMobileOrTablet} />;
  }

  if (workOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔧</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No work orders found
        </h3>
        <p className="text-text-secondary">
          Try adjusting your filters or create a new work order.
        </p>
      </div>
    );
  }

  // Mobile card view
  if (isMobileOrTablet) {
    return (
      <div>
        <div className="space-y-3">
          {sortedWorkOrders.map((wo) => (
            <MobileWorkOrderCard
              key={wo.id}
              wo={wo}
              onEdit={onEdit ? handleEdit : undefined}
              onDelete={onDelete ? handleDelete : undefined}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 mt-4">
            <p className="text-sm text-text-secondary">
              {startItem}-{endItem} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                Prev
              </Button>
              <span className="text-sm text-text-secondary px-2">
                {page}/{totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Work orders list">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              {hasSelection && (
                <th scope="col" className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === workOrders.length && workOrders.length > 0}
                    onChange={onToggleSelectAll}
                    className="rounded border-gray-300"
                    aria-label="Select all"
                  />
                </th>
              )}
              <th
                scope="col"
                onClick={() => toggleSort("customer")}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hover:bg-bg-hover transition-colors select-none"
              >
                Customer <SortIndicator field="customer" />
              </th>
              <th
                scope="col"
                onClick={() => toggleSort("job_type")}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hover:bg-bg-hover transition-colors select-none"
              >
                Job Type <SortIndicator field="job_type" />
              </th>
              <th
                scope="col"
                onClick={() => toggleSort("scheduled_date")}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hover:bg-bg-hover transition-colors select-none"
              >
                Scheduled <SortIndicator field="scheduled_date" />
              </th>
              <th
                scope="col"
                onClick={() => toggleSort("technician")}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hover:bg-bg-hover transition-colors select-none"
              >
                Technician <SortIndicator field="technician" />
              </th>
              <th
                scope="col"
                onClick={() => toggleSort("priority")}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hover:bg-bg-hover transition-colors select-none"
              >
                Priority <SortIndicator field="priority" />
              </th>
              <th
                scope="col"
                onClick={() => toggleSort("status")}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hover:bg-bg-hover transition-colors select-none"
              >
                Status <SortIndicator field="status" />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {sortedWorkOrders.map((wo) => (
              <TableWorkOrderRow
                key={wo.id}
                wo={wo}
                onEdit={onEdit ? handleEdit : undefined}
                onDelete={onDelete ? handleDelete : undefined}
                isSelected={selectedIds?.has(wo.id)}
                onToggleSelection={onToggleSelection}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-text-secondary">
            Showing {startItem} to {endItem} of {total} work orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton for table or cards
 */
function LoadingSkeleton({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-border p-4">
            <div className="h-6 bg-bg-muted rounded w-3/4 mb-3" />
            <div className="h-4 bg-bg-hover rounded w-1/2 mb-2" />
            <div className="h-4 bg-bg-hover rounded w-2/3 mb-2" />
            <div className="flex gap-2 mt-3">
              <div className="h-8 bg-bg-muted rounded flex-1" />
              <div className="h-8 bg-bg-muted rounded flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      <div className="h-10 bg-bg-muted mb-2" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-bg-hover mb-1" />
      ))}
    </div>
  );
}
