import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "@/api/hooks/useCustomers.ts";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { CustomerForm } from "./components/CustomerForm.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { ApiError } from "@/components/ui/ApiError.tsx";
import { ConfirmDialog } from "@/components/ui/Dialog.tsx";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils.ts";
import {
  PROSPECT_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
} from "@/api/types/common.ts";
import { CUSTOMER_TYPE_LABELS } from "@/api/types/customer.ts";
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  type WorkOrderStatus,
  type JobType,
} from "@/api/types/workOrder.ts";
import type { CustomerFormData } from "@/api/types/customer.ts";
import { ActivityTimeline } from "@/features/activities";
import { AttachmentList } from "@/features/documents";
import { DialButton, CallLog } from "@/features/phone/index.ts";
import { CustomerHealthScore } from "./components/CustomerHealthScore.tsx";
import { CustomerEmailHistory } from "./components/CustomerEmailHistory.tsx";
import { useEmailCompose } from "@/context/EmailComposeContext";

/**
 * Customer detail page - view/edit individual customer
 */
export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openEmailCompose } = useEmailCompose();

  const { data: customer, isLoading, error, refetch } = useCustomer(id);

  // Fetch work orders for this customer
  const { data: workOrdersData, isLoading: workOrdersLoading } = useWorkOrders({
    page: 1,
    page_size: 50,
    customer_id: id,
  });
  const workOrders = workOrdersData?.items || [];

  // Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Mutations
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const handleEdit = async (data: CustomerFormData) => {
    if (id) {
      await updateMutation.mutateAsync({ id, data });
    }
  };

  const handleDelete = async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate("/customers");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted w-48 mb-4 rounded" />
          <div className="h-64 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ApiError
          error={error}
          onRetry={() => refetch()}
          title="Failed to load customer"
        />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Customer not found
        </h2>
        <p className="text-text-secondary mb-4">
          The customer you're looking for doesn't exist or has been deleted.
        </p>
        <Link to="/customers">
          <Button>Back to Customers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              to="/customers"
              className="text-text-secondary hover:text-text-primary text-sm"
            >
              ← Back to Customers
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {customer.first_name} {customer.last_name}
          </h1>
          {customer.customer_type && (
            <p className="text-text-secondary">
              {CUSTOMER_TYPE_LABELS[
                customer.customer_type as keyof typeof CUSTOMER_TYPE_LABELS
              ] || customer.customer_type}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      {customer.prospect_stage && (
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text-secondary">
              Prospect Stage:
            </span>
            <Badge variant="stage" stage={customer.prospect_stage}>
              {PROSPECT_STAGE_LABELS[customer.prospect_stage as keyof typeof PROSPECT_STAGE_LABELS] || customer.prospect_stage}
            </Badge>
            {!customer.is_active && <Badge variant="danger">Inactive</Badge>}
          </div>
        </Card>
      )}

      {/* Customer Health Score */}
      <CustomerHealthScore customer={customer} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-text-secondary">Email</dt>
                <dd className="font-medium">
                  {customer.email ? (
                    <button
                      onClick={() => openEmailCompose({ to: customer.email!, customerId: id, customerName: `${customer.first_name} ${customer.last_name}` })}
                      className="text-text-link hover:underline"
                    >
                      {customer.email}
                    </button>
                  ) : (
                    <span className="text-text-muted">Not provided</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Phone</dt>
                <dd className="font-medium flex items-center gap-2">
                  {customer.phone ? (
                    <>
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-text-link hover:underline"
                      >
                        {formatPhone(customer.phone)}
                      </a>
                      <DialButton
                        phoneNumber={customer.phone}
                        customerId={id}
                      />
                    </>
                  ) : (
                    <span className="text-text-muted">Not provided</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Address</dt>
                <dd className="font-medium">
                  {customer.address_line1 ? (
                    <>
                      {customer.address_line1}
                      {customer.address_line2 && (
                        <>
                          <br />
                          {customer.address_line2}
                        </>
                      )}
                      <br />
                      {customer.city && `${customer.city}, `}
                      {customer.state} {customer.postal_code}
                    </>
                  ) : (
                    <span className="text-text-muted">Not provided</span>
                  )}
                </dd>
              </div>
              {(customer.latitude || customer.longitude) && (
                <div>
                  <dt className="text-sm text-text-secondary">Coordinates</dt>
                  <dd className="font-medium text-sm font-mono">
                    {customer.latitude}, {customer.longitude}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Sales/Prospect Information */}
        {(customer.prospect_stage ||
          customer.lead_source ||
          customer.estimated_value ||
          customer.assigned_sales_rep) && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                {customer.lead_source && (
                  <div>
                    <dt className="text-sm text-text-secondary">Lead Source</dt>
                    <dd className="font-medium">
                      {LEAD_SOURCE_LABELS[customer.lead_source as keyof typeof LEAD_SOURCE_LABELS] || customer.lead_source}
                    </dd>
                  </div>
                )}
                {customer.estimated_value != null && (
                  <div>
                    <dt className="text-sm text-text-secondary">
                      Estimated Value
                    </dt>
                    <dd className="font-medium text-success">
                      {formatCurrency(customer.estimated_value)}
                    </dd>
                  </div>
                )}
                {customer.assigned_sales_rep && (
                  <div>
                    <dt className="text-sm text-text-secondary">
                      Assigned Sales Rep
                    </dt>
                    <dd className="font-medium">
                      {customer.assigned_sales_rep}
                    </dd>
                  </div>
                )}
                {customer.next_follow_up_date && (
                  <div>
                    <dt className="text-sm text-text-secondary">
                      Next Follow-up
                    </dt>
                    <dd className="font-medium">
                      {formatDate(customer.next_follow_up_date)}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Billing Information */}
        {customer.default_payment_terms && (
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-text-secondary">
                    Default Payment Terms
                  </dt>
                  <dd className="font-medium">
                    {customer.default_payment_terms}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {/* External IDs */}
        {(customer.quickbooks_customer_id ||
          customer.hubspot_contact_id ||
          customer.servicenow_ticket_ref) && (
          <Card>
            <CardHeader>
              <CardTitle>External Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                {customer.quickbooks_customer_id && (
                  <div>
                    <dt className="text-sm text-text-secondary">
                      QuickBooks Customer ID
                    </dt>
                    <dd className="font-medium font-mono text-sm">
                      {customer.quickbooks_customer_id}
                    </dd>
                  </div>
                )}
                {customer.hubspot_contact_id && (
                  <div>
                    <dt className="text-sm text-text-secondary">
                      HubSpot Contact ID
                    </dt>
                    <dd className="font-medium font-mono text-sm">
                      {customer.hubspot_contact_id}
                    </dd>
                  </div>
                )}
                {customer.servicenow_ticket_ref && (
                  <div>
                    <dt className="text-sm text-text-secondary">
                      ServiceNow Ticket Reference
                    </dt>
                    <dd className="font-medium font-mono text-sm">
                      {customer.servicenow_ticket_ref}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {customer.lead_notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-text-primary">
                {customer.lead_notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Link to={`/work-orders?customer_id=${id}`}>
                <Button variant="secondary">
                  View All Work Orders ({workOrders.length})
                </Button>
              </Link>
              <Link to={`/work-orders?new=true&customer_id=${id}`}>
                <Button>Create Work Order</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Work Order History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Work Order History</CardTitle>
              <Link
                to={`/work-orders?customer_id=${id}`}
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {workOrdersLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-bg-muted rounded" />
                <div className="h-16 bg-bg-muted rounded" />
              </div>
            ) : workOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-muted mb-4">No work orders yet</p>
                <Link to={`/work-orders?new=true&customer_id=${id}`}>
                  <Button size="sm">Create First Work Order</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.slice(0, 5).map((wo) => (
                  <Link
                    key={wo.id}
                    to={`/work-orders/${wo.id}`}
                    className="block p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-primary">
                          {JOB_TYPE_LABELS[wo.job_type as JobType] ||
                            wo.job_type}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {wo.scheduled_date
                            ? formatDate(wo.scheduled_date)
                            : "Not scheduled"}
                          {wo.time_window_start &&
                            ` at ${wo.time_window_start.slice(0, 5)}`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          wo.status === "completed"
                            ? "success"
                            : wo.status === "canceled"
                              ? "danger"
                              : ["enroute", "on_site", "in_progress"].includes(
                                    wo.status,
                                  )
                                ? "warning"
                                : "default"
                        }
                      >
                        {WORK_ORDER_STATUS_LABELS[
                          wo.status as WorkOrderStatus
                        ] || wo.status}
                      </Badge>
                    </div>
                    {wo.assigned_technician && (
                      <p className="text-xs text-text-muted">
                        Technician: {wo.assigned_technician}
                      </p>
                    )}
                  </Link>
                ))}
                {workOrders.length > 5 && (
                  <p className="text-center text-sm text-text-muted pt-2">
                    +{workOrders.length - 5} more work orders
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call History */}
        <div className="lg:col-span-2">
          <CallLog customerId={id} limit={5} />
        </div>

        {/* Email History */}
        <div className="lg:col-span-2">
          <CustomerEmailHistory
            customerId={id!}
            customerEmail={customer.email ?? undefined}
            customerName={`${customer.first_name} ${customer.last_name}`}
          />
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline customerId={id!} />
        </div>

        {/* Attachments */}
        <div className="lg:col-span-2">
          <AttachmentList entityId={id!} entityType="customer" />
        </div>

        {/* Metadata */}
        <Card className="lg:col-span-2">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>Created: {formatDate(customer.created_at)}</span>
              <span>Last Updated: {formatDate(customer.updated_at)}</span>
              <span className="text-xs font-mono text-text-muted">
                ID: {customer.id}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <CustomerForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEdit}
        customer={customer}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customer.first_name} ${customer.last_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
