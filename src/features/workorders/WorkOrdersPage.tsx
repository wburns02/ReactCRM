import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
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
} from '@/api/hooks/useWorkOrders.ts';
import { WorkOrdersList } from './WorkOrdersList.tsx';
import { WorkOrderForm } from './components/WorkOrderForm.tsx';
import {
  WORK_ORDER_STATUS_LABELS,
  type WorkOrder,
  type WorkOrderFormData,
  type WorkOrderFilters,
  type WorkOrderStatus,
} from '@/api/types/workOrder.ts';

const PAGE_SIZE = 20;

/**
 * Work Orders list page with filtering and CRUD operations
 */
export function WorkOrdersPage() {
  // Filters state
  const [filters, setFilters] = useState<WorkOrderFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    status: '',
    scheduled_date: '',
  });

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);

  // Delete confirmation state
  const [deletingWorkOrder, setDeletingWorkOrder] = useState<WorkOrder | null>(null);

  // Fetch work orders
  const { data, isLoading, error } = useWorkOrders(filters);

  // Mutations
  const createMutation = useCreateWorkOrder();
  const updateMutation = useUpdateWorkOrder();
  const deleteMutation = useDeleteWorkOrder();

  // Handlers
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }));
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, scheduled_date: e.target.value, page: 1 }));
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

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger">Failed to load work orders. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Work Orders</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage service appointments and jobs
          </p>
        </div>
        <Button onClick={handleCreate}>+ Create Work Order</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-48">
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
            <div className="w-48">
              <Input
                type="date"
                value={filters.scheduled_date || ''}
                onChange={handleDateChange}
                placeholder="Filter by date"
              />
            </div>
            {(filters.status || filters.scheduled_date) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, status: '', scheduled_date: '', page: 1 }))}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total ? `${data.total} work order${data.total !== 1 ? 's' : ''}` : 'Work Orders'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <WorkOrdersList
            workOrders={data?.items || []}
            total={data?.total || 0}
            page={filters.page || 1}
            pageSize={PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

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
  );
}
