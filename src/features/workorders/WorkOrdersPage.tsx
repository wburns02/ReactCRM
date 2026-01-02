import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import {
  useWorkOrders,
  useCreateWorkOrder,
  useUpdateWorkOrder,
  useDeleteWorkOrder,
  useScheduleStats,
  useUpdateWorkOrderStatus,
} from '@/api/hooks/useWorkOrders.ts';
import { useTechnicians } from '@/api/hooks/useTechnicians.ts';
import { WorkOrdersList } from './WorkOrdersList.tsx';
import { WorkOrderForm } from './components/WorkOrderForm.tsx';
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
  type WorkOrder,
  type WorkOrderFormData,
  type WorkOrderFilters,
  type WorkOrderStatus,
  type JobType,
  type Priority,
} from '@/api/types/workOrder.ts';
import { formatDate } from '@/lib/utils.ts';

const PAGE_SIZE = 20;

type ViewMode = 'list' | 'kanban';

// Status columns for Kanban view
const KANBAN_COLUMNS: { status: WorkOrderStatus; label: string; color: string }[] = [
  { status: 'draft', label: 'Draft', color: 'bg-gray-100' },
  { status: 'scheduled', label: 'Scheduled', color: 'bg-blue-50' },
  { status: 'confirmed', label: 'Confirmed', color: 'bg-indigo-50' },
  { status: 'enroute', label: 'En Route', color: 'bg-yellow-50' },
  { status: 'on_site', label: 'On Site', color: 'bg-orange-50' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-amber-50' },
  { status: 'completed', label: 'Completed', color: 'bg-green-50' },
];

/**
 * Enhanced Work Orders page with 2025-2026 best practices:
 * - Stats dashboard cards
 * - Advanced filtering with search
 * - Quick filter chips
 * - List/Kanban view toggle
 * - Improved UX
 */
export function WorkOrdersPage() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filters state
  const [filters, setFilters] = useState<WorkOrderFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    status: '',
    scheduled_date: '',
  });

  // Additional filter state
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<string>('');

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);

  // Delete confirmation state
  const [deletingWorkOrder, setDeletingWorkOrder] = useState<WorkOrder | null>(null);

  // Fetch work orders with extended filters
  const apiFilters = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let effectiveFilters: WorkOrderFilters = { ...filters };

    // Apply quick filters
    if (quickFilter === 'today') {
      effectiveFilters.scheduled_date = today;
    } else if (quickFilter === 'unscheduled') {
      effectiveFilters.status = 'draft';
    } else if (quickFilter === 'emergency') {
      effectiveFilters.priority = 'emergency';
    }

    // Apply dropdown filters
    if (jobTypeFilter) effectiveFilters.job_type = jobTypeFilter;
    if (priorityFilter) effectiveFilters.priority = priorityFilter;
    if (technicianFilter) effectiveFilters.assigned_technician = technicianFilter;

    // For kanban view, fetch more items
    if (viewMode === 'kanban') {
      effectiveFilters.page_size = 200;
    }

    return effectiveFilters;
  }, [filters, jobTypeFilter, priorityFilter, technicianFilter, quickFilter, viewMode]);

  const { data, isLoading, error } = useWorkOrders(apiFilters);
  const stats = useScheduleStats();
  const { data: technicians } = useTechnicians();

  // Mutations
  const createMutation = useCreateWorkOrder();
  const updateMutation = useUpdateWorkOrder();
  const deleteMutation = useDeleteWorkOrder();
  const updateStatusMutation = useUpdateWorkOrderStatus();

  // Filter work orders by search query
  const filteredWorkOrders = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;

    const query = searchQuery.toLowerCase();
    return data.items.filter((wo) => {
      const customerName = wo.customer_name ||
        (wo.customer ? `${wo.customer.first_name} ${wo.customer.last_name}` : '');
      return (
        customerName.toLowerCase().includes(query) ||
        wo.id.toLowerCase().includes(query) ||
        wo.service_city?.toLowerCase().includes(query) ||
        wo.assigned_technician?.toLowerCase().includes(query) ||
        wo.notes?.toLowerCase().includes(query)
      );
    });
  }, [data?.items, searchQuery]);

  // Group work orders by status for Kanban
  const kanbanData = useMemo(() => {
    const grouped: Record<WorkOrderStatus, WorkOrder[]> = {} as Record<WorkOrderStatus, WorkOrder[]>;
    KANBAN_COLUMNS.forEach(col => {
      grouped[col.status] = [];
    });

    filteredWorkOrders.forEach((wo) => {
      const status = wo.status as WorkOrderStatus;
      if (grouped[status]) {
        grouped[status].push(wo);
      }
    });

    return grouped;
  }, [filteredWorkOrders]);

  // Handlers
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }));
    setQuickFilter('');
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, scheduled_date: e.target.value, page: 1 }));
    setQuickFilter('');
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleCreate = useCallback(() => {
    setEditingWorkOrder(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((workOrder: WorkOrder) => {
    setEditingWorkOrder(workOrder);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((workOrder: WorkOrder) => {
    setDeletingWorkOrder(workOrder);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: WorkOrderFormData) => {
      if (editingWorkOrder) {
        await updateMutation.mutateAsync({ id: editingWorkOrder.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingWorkOrder(null);
    },
    [editingWorkOrder, createMutation, updateMutation]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deletingWorkOrder) {
      await deleteMutation.mutateAsync(deletingWorkOrder.id);
      setDeletingWorkOrder(null);
    }
  }, [deletingWorkOrder, deleteMutation]);

  const handleQuickStatusChange = useCallback(async (workOrderId: string, newStatus: WorkOrderStatus) => {
    await updateStatusMutation.mutateAsync({ id: workOrderId, status: newStatus });
  }, [updateStatusMutation]);

  const clearAllFilters = useCallback(() => {
    setFilters({ page: 1, page_size: PAGE_SIZE, status: '', scheduled_date: '' });
    setJobTypeFilter('');
    setPriorityFilter('');
    setTechnicianFilter('');
    setQuickFilter('');
    setSearchQuery('');
  }, []);

  const hasActiveFilters = filters.status || filters.scheduled_date || jobTypeFilter ||
    priorityFilter || technicianFilter || quickFilter || searchQuery;

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-danger">Failed to load work orders. Please try again.</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Work Orders</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage service appointments and field operations
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                📊 Kanban
              </button>
            </div>
            <Button onClick={handleCreate}>+ New Work Order</Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => { setQuickFilter('today'); clearAllFilters(); setQuickFilter('today'); }}
            className={`text-left ${quickFilter === 'today' ? 'ring-2 ring-primary' : ''}`}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Today</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.todayJobs}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>

          <button
            onClick={() => { clearAllFilters(); setQuickFilter('week'); }}
            className={`text-left ${quickFilter === 'week' ? 'ring-2 ring-primary' : ''}`}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">This Week</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.weekJobs}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📆</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>

          <button
            onClick={() => { clearAllFilters(); setQuickFilter('unscheduled'); }}
            className={`text-left ${quickFilter === 'unscheduled' ? 'ring-2 ring-primary' : ''}`}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Unscheduled</p>
                    <p className="text-2xl font-bold text-warning">{stats.unscheduledJobs}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⏳</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>

          <button
            onClick={() => { clearAllFilters(); setQuickFilter('emergency'); }}
            className={`text-left ${quickFilter === 'emergency' ? 'ring-2 ring-primary' : ''}`}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Emergency</p>
                    <p className="text-2xl font-bold text-danger">{stats.emergencyJobs}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🚨</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer, location, technician, or notes..."
                  className="pl-10"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-40">
                  <Select
                    value={filters.status || ''}
                    onChange={handleStatusChange}
                  >
                    <option value="">All Statuses</option>
                    {(Object.entries(WORK_ORDER_STATUS_LABELS) as [WorkOrderStatus, string][]).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="w-36">
                  <Select
                    value={jobTypeFilter}
                    onChange={(e) => { setJobTypeFilter(e.target.value); setQuickFilter(''); }}
                  >
                    <option value="">All Job Types</option>
                    {(Object.entries(JOB_TYPE_LABELS) as [JobType, string][]).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="w-32">
                  <Select
                    value={priorityFilter}
                    onChange={(e) => { setPriorityFilter(e.target.value); setQuickFilter(''); }}
                  >
                    <option value="">All Priorities</option>
                    {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="w-40">
                  <Select
                    value={technicianFilter}
                    onChange={(e) => { setTechnicianFilter(e.target.value); setQuickFilter(''); }}
                  >
                    <option value="">All Technicians</option>
                    {technicians?.items?.map((tech) => (
                      <option key={tech.id} value={tech.name}>
                        {tech.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="w-40">
                  <Input
                    type="date"
                    value={filters.scheduled_date || ''}
                    onChange={handleDateChange}
                    placeholder="Filter by date"
                  />
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-text-secondary"
                  >
                    ✕ Clear all
                  </Button>
                )}
              </div>

              {/* Quick Filter Chips */}
              <div className="flex flex-wrap gap-2">
                {quickFilter && (
                  <Badge variant="default" className="px-3 py-1">
                    {quickFilter === 'today' && '📅 Today'}
                    {quickFilter === 'week' && '📆 This Week'}
                    {quickFilter === 'unscheduled' && '⏳ Unscheduled'}
                    {quickFilter === 'emergency' && '🚨 Emergency'}
                    <button
                      onClick={() => setQuickFilter('')}
                      className="ml-2 hover:text-danger"
                    >
                      ✕
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {viewMode === 'list' ? (
          /* List View */
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {searchQuery
                  ? `${filteredWorkOrders.length} result${filteredWorkOrders.length !== 1 ? 's' : ''}`
                  : data?.total
                    ? `${data.total} work order${data.total !== 1 ? 's' : ''}`
                    : 'Work Orders'
                }
              </CardTitle>
              <div className="flex gap-2">
                <Link to="/schedule">
                  <Button variant="secondary" size="sm">📅 Schedule View</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <WorkOrdersList
                workOrders={searchQuery ? filteredWorkOrders : (data?.items || [])}
                total={searchQuery ? filteredWorkOrders.length : (data?.total || 0)}
                page={filters.page || 1}
                pageSize={PAGE_SIZE}
                isLoading={isLoading}
                onPageChange={handlePageChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        ) : (
          /* Kanban View */
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {KANBAN_COLUMNS.map((column) => (
                <div
                  key={column.status}
                  className={`w-72 flex-shrink-0 rounded-lg ${column.color}`}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-text-primary">{column.label}</h3>
                      <Badge variant="default" className="text-xs">
                        {kanbanData[column.status]?.length || 0}
                      </Badge>
                    </div>
                  </div>

                  {/* Column Cards */}
                  <div className="p-2 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {kanbanData[column.status]?.length === 0 ? (
                      <div className="text-center py-8 text-text-muted text-sm">
                        No work orders
                      </div>
                    ) : (
                      kanbanData[column.status]?.map((wo) => (
                        <KanbanCard
                          key={wo.id}
                          workOrder={wo}
                          onEdit={handleEdit}
                          onStatusChange={handleQuickStatusChange}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        <WorkOrderForm
          open={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingWorkOrder(null);
          }}
          onSubmit={handleFormSubmit}
          workOrder={editingWorkOrder}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deletingWorkOrder}
          onClose={() => setDeletingWorkOrder(null)}
        >
          <DialogContent size="sm">
            <DialogHeader onClose={() => setDeletingWorkOrder(null)}>
              Delete Work Order
            </DialogHeader>
            <DialogBody>
              <p className="text-text-secondary">
                Are you sure you want to delete this work order for{' '}
                <span className="font-medium text-text-primary">
                  {deletingWorkOrder?.customer_name || `Customer #${deletingWorkOrder?.customer_id}`}
                </span>
                ? This action cannot be undone.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setDeletingWorkOrder(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/**
 * Kanban card component for individual work orders
 */
function KanbanCard({
  workOrder,
  onEdit,
  onStatusChange,
}: {
  workOrder: WorkOrder;
  onEdit: (wo: WorkOrder) => void;
  onStatusChange: (id: string, status: WorkOrderStatus) => void;
}) {
  const customerName = workOrder.customer_name ||
    (workOrder.customer
      ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
      : `Customer #${workOrder.customer_id}`);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'emergency': return 'border-l-red-500';
      case 'urgent': return 'border-l-orange-500';
      case 'high': return 'border-l-yellow-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <Card className={`p-3 border-l-4 ${getPriorityColor(workOrder.priority as Priority)} hover:shadow-md transition-shadow cursor-pointer`}>
      <div className="space-y-2">
        {/* Customer Name */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm text-text-primary line-clamp-1">
            {customerName}
          </h4>
          <Badge variant="default" className="text-[10px] px-1.5 shrink-0">
            {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-1 text-xs text-text-secondary">
          {workOrder.scheduled_date && (
            <div className="flex items-center gap-1">
              <span>📅</span>
              <span>{formatDate(workOrder.scheduled_date)}</span>
              {workOrder.time_window_start && (
                <span className="text-text-muted">
                  {workOrder.time_window_start.slice(0, 5)}
                </span>
              )}
            </div>
          )}

          {workOrder.assigned_technician && (
            <div className="flex items-center gap-1">
              <span>👷</span>
              <span>{workOrder.assigned_technician}</span>
            </div>
          )}

          {workOrder.service_city && (
            <div className="flex items-center gap-1">
              <span>📍</span>
              <span>{workOrder.service_city}{workOrder.service_state && `, ${workOrder.service_state}`}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-light">
          <Link
            to={`/work-orders/${workOrder.id}`}
            className="text-xs text-primary hover:underline"
          >
            View Details
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(workOrder); }}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Edit
          </button>
        </div>
      </div>
    </Card>
  );
}
