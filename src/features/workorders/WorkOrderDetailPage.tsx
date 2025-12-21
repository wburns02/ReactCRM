import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import {
  useWorkOrder,
  useUpdateWorkOrder,
  useDeleteWorkOrder,
} from '@/api/hooks/useWorkOrders.ts';
import { WorkOrderForm } from './components/WorkOrderForm.tsx';
import { StatusWorkflow } from './components/StatusWorkflow.tsx';
import { DialButton } from '@/features/phone/components/DialButton.tsx';
import { formatDate } from '@/lib/utils.ts';
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
  type WorkOrderFormData,
  type WorkOrderStatus,
  type JobType,
  type Priority,
} from '@/api/types/workOrder.ts';

/**
 * Get badge variant based on status
 */
function getStatusVariant(status: WorkOrderStatus): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'canceled':
      return 'danger';
    case 'enroute':
    case 'on_site':
    case 'in_progress':
    case 'requires_followup':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Get badge variant based on priority
 */
function getPriorityVariant(priority: Priority): 'default' | 'success' | 'warning' | 'danger' {
  switch (priority) {
    case 'low':
      return 'default';
    case 'normal':
      return 'success';
    case 'high':
      return 'warning';
    case 'urgent':
    case 'emergency':
      return 'danger';
    default:
      return 'default';
  }
}

/**
 * Work Order detail page - shows full work order info with edit/delete
 */
export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: workOrder, isLoading, error } = useWorkOrder(id);
  const updateMutation = useUpdateWorkOrder();
  const deleteMutation = useDeleteWorkOrder();

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleUpdate = useCallback(
    async (data: WorkOrderFormData) => {
      if (id) {
        await updateMutation.mutateAsync({ id, data });
        setIsEditOpen(false);
      }
    },
    [id, updateMutation]
  );

  const handleDelete = useCallback(async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate('/work-orders');
    }
  }, [id, deleteMutation, navigate]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted rounded w-1/4 mb-6" />
          <div className="h-64 bg-bg-muted rounded mb-4" />
          <div className="h-48 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">404</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Work Order Not Found</h2>
            <p className="text-text-secondary mb-4">
              The work order you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/work-orders">
              <Button variant="secondary">Back to Work Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName = workOrder.customer_name ||
    (workOrder.customer ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}` : `Customer #${workOrder.customer_id}`);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/work-orders"
            className="text-text-secondary hover:text-text-primary"
          >
            &larr; Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-text-primary">
                Work Order
              </h1>
              <Badge variant={getStatusVariant(workOrder.status as WorkOrderStatus)}>
                {WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus] || workOrder.status}
              </Badge>
              <Badge variant={getPriorityVariant(workOrder.priority as Priority)}>
                {PRIORITY_LABELS[workOrder.priority as Priority] || workOrder.priority}
              </Badge>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type} for {customerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary text-lg">{customerName}</p>
                  {workOrder.customer?.email && (
                    <a
                      href={'mailto:' + workOrder.customer.email}
                      className="text-text-link hover:underline block mt-1"
                    >
                      {workOrder.customer.email}
                    </a>
                  )}
                  {workOrder.customer?.phone && (
                    <div className="flex items-center gap-2">
                      <a
                        href={'tel:' + workOrder.customer.phone}
                        className="text-text-link hover:underline"
                      >
                        {workOrder.customer.phone}
                      </a>
                      <DialButton
                        phoneNumber={workOrder.customer.phone}
                        customerId={workOrder.customer_id}
                      />
                    </div>
                  )}
                </div>
                <Link to={`/customers/${workOrder.customer_id}`}>
                  <Button variant="ghost" size="sm">View Customer</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Service Address */}
          <Card>
            <CardHeader>
              <CardTitle>Service Location</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.service_address_line1 ? (
                <div>
                  <p className="text-text-primary">{workOrder.service_address_line1}</p>
                  {workOrder.service_address_line2 && (
                    <p className="text-text-primary">{workOrder.service_address_line2}</p>
                  )}
                  <p className="text-text-secondary">
                    {[workOrder.service_city, workOrder.service_state, workOrder.service_postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {workOrder.service_latitude && workOrder.service_longitude && (
                    <a
                      href={`https://maps.google.com/?q=${workOrder.service_latitude},${workOrder.service_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-link hover:underline text-sm mt-2 inline-block"
                    >
                      View on Google Maps
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-text-muted">No service address specified</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {workOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary whitespace-pre-wrap">{workOrder.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-6">
          {/* Status Workflow */}
          <StatusWorkflow
            workOrderId={workOrder.id}
            currentStatus={workOrder.status as WorkOrderStatus}
          />

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-text-muted">Date</dt>
                  <dd className="text-text-primary font-medium">
                    {workOrder.scheduled_date ? formatDate(workOrder.scheduled_date) : 'Not scheduled'}
                  </dd>
                </div>
                {(workOrder.time_window_start || workOrder.time_window_end) && (
                  <div>
                    <dt className="text-sm text-text-muted">Time Window</dt>
                    <dd className="text-text-primary">
                      {workOrder.time_window_start?.slice(0, 5) || '?'}
                      {' - '}
                      {workOrder.time_window_end?.slice(0, 5) || '?'}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-text-muted">Duration</dt>
                  <dd className="text-text-primary">
                    {workOrder.estimated_duration_hours
                      ? `${workOrder.estimated_duration_hours} hours`
                      : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-text-muted">Technician</dt>
                  <dd className="text-text-primary font-medium">
                    {workOrder.assigned_technician || 'Unassigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Vehicle</dt>
                  <dd className="text-text-primary">
                    {workOrder.assigned_vehicle || '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-text-muted">Job Type</dt>
                  <dd>
                    <Badge variant="default">
                      {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Priority</dt>
                  <dd>
                    <Badge variant={getPriorityVariant(workOrder.priority as Priority)}>
                      {PRIORITY_LABELS[workOrder.priority as Priority] || workOrder.priority}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Status</dt>
                  <dd>
                    <Badge variant={getStatusVariant(workOrder.status as WorkOrderStatus)}>
                      {WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus] || workOrder.status}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Record Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-text-muted">Work Order ID</dt>
                  <dd className="text-text-primary font-mono text-xs break-all">{workOrder.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Created</dt>
                  <dd className="text-text-primary">
                    {workOrder.created_at ? formatDate(workOrder.created_at) : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Last Updated</dt>
                  <dd className="text-text-primary">
                    {workOrder.updated_at ? formatDate(workOrder.updated_at) : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <WorkOrderForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        workOrder={workOrder}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setIsDeleteOpen(false)}>
            Delete Work Order
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete this work order for{' '}
              <span className="font-medium text-text-primary">{customerName}</span>?
              This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
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
