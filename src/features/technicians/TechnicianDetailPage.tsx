import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useTechnician,
  useUpdateTechnician,
  useDeleteTechnician,
} from "@/api/hooks/useTechnicians.ts";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { TechnicianForm } from "./components/TechnicianForm.tsx";
import { DialButton } from "@/features/phone/components/DialButton.tsx";
import { formatPhone, formatDate } from "@/lib/utils.ts";
import {
  TECHNICIAN_SKILL_LABELS,
  type TechnicianFormData,
  type TechnicianSkill,
} from "@/api/types/technician.ts";
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  type WorkOrderStatus,
  type JobType,
} from "@/api/types/workOrder.ts";

/**
 * Technician detail page - shows full technician info with edit/delete
 */
export function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: technician, isLoading, error } = useTechnician(id);
  const updateMutation = useUpdateTechnician();
  const deleteMutation = useDeleteTechnician();

  // Fetch work orders assigned to this technician
  const technicianName = technician
    ? `${technician.first_name} ${technician.last_name}`
    : "";
  const { data: workOrdersData, isLoading: workOrdersLoading } = useWorkOrders({
    page: 1,
    page_size: 100,
  });

  // Filter work orders for this technician (API doesn't support technician filter yet)
  const assignedWorkOrders = useMemo(() => {
    if (!workOrdersData?.items || !technicianName) return [];
    return workOrdersData.items.filter(
      (wo) => wo.assigned_technician === technicianName,
    );
  }, [workOrdersData, technicianName]);

  // Calculate workload stats
  const workloadStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const upcoming = assignedWorkOrders.filter(
      (wo) =>
        wo.scheduled_date &&
        wo.scheduled_date >= today &&
        !["completed", "canceled"].includes(wo.status),
    );
    const todayJobs = assignedWorkOrders.filter(
      (wo) => wo.scheduled_date === today,
    );
    const inProgress = assignedWorkOrders.filter((wo) =>
      ["enroute", "on_site", "in_progress"].includes(wo.status),
    );
    const completed = assignedWorkOrders.filter(
      (wo) => wo.status === "completed",
    );
    return { upcoming, todayJobs, inProgress, completed };
  }, [assignedWorkOrders]);

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleUpdate = useCallback(
    async (data: TechnicianFormData) => {
      if (id) {
        await updateMutation.mutateAsync({ id, data });
        setIsEditOpen(false);
      }
    },
    [id, updateMutation],
  );

  const handleDelete = useCallback(async () => {
    if (id) {
      try {
        await deleteMutation.mutateAsync(id);
        navigate("/technicians");
      } catch (error) {
        console.error("Failed to delete technician:", error);
        // TODO: Show error toast/notification to user
      }
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

  if (error || !technician) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">404</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Technician Not Found
            </h2>
            <p className="text-text-secondary mb-4">
              The technician you're looking for doesn't exist or has been
              removed.
            </p>
            <Link to="/technicians">
              <Button variant="secondary">Back to Technicians</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/technicians"
            className="text-text-secondary hover:text-text-primary"
          >
            &larr; Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-text-primary">
                {technician.first_name} {technician.last_name}
              </h1>
              <Badge variant={technician.is_active ? "success" : "default"}>
                {technician.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {technician.employee_id && (
              <p className="text-sm text-text-secondary mt-1">
                Employee ID: {technician.employee_id}
              </p>
            )}
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
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-text-muted">Email</dt>
                  <dd className="text-text-primary">
                    {technician.email ? (
                      <a
                        href={"mailto:" + technician.email}
                        className="text-text-link hover:underline"
                      >
                        {technician.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Phone</dt>
                  <dd className="text-text-primary">
                    {technician.phone ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={"tel:" + technician.phone}
                          className="text-text-link hover:underline"
                        >
                          {formatPhone(technician.phone)}
                        </a>
                        <DialButton phoneNumber={technician.phone} />
                      </div>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              {technician.skills && technician.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {technician.skills.map((skill) => (
                    <Badge key={skill} variant="default">
                      {TECHNICIAN_SKILL_LABELS[skill as TechnicianSkill] ||
                        skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted">No skills listed</p>
              )}
            </CardContent>
          </Card>

          {/* Home Location */}
          <Card>
            <CardHeader>
              <CardTitle>Home Location</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-text-muted">Region</dt>
                  <dd className="text-text-primary">
                    {technician.home_region || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Address</dt>
                  <dd className="text-text-primary">
                    {technician.home_address ? (
                      <>
                        {technician.home_address}
                        {technician.home_city && (
                          <>
                            <br />
                            {technician.home_city}
                            {technician.home_state &&
                              `, ${technician.home_state}`}
                            {technician.home_postal_code &&
                              ` ${technician.home_postal_code}`}
                          </>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                {(technician.home_latitude || technician.home_longitude) && (
                  <div className="col-span-2">
                    <dt className="text-sm text-text-muted">Coordinates</dt>
                    <dd className="text-text-primary">
                      {technician.home_latitude}, {technician.home_longitude}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Notes */}
          {technician.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary whitespace-pre-wrap">
                  {technician.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Workload / Assigned Work Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assigned Work Orders</CardTitle>
                <Link
                  to="/schedule"
                  className="text-sm text-primary hover:underline"
                >
                  View Schedule
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {workloadStats.todayJobs.length}
                  </p>
                  <p className="text-xs text-text-muted">Today</p>
                </div>
                <div className="text-center p-3 bg-bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-warning">
                    {workloadStats.inProgress.length}
                  </p>
                  <p className="text-xs text-text-muted">In Progress</p>
                </div>
                <div className="text-center p-3 bg-bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-text-primary">
                    {workloadStats.upcoming.length}
                  </p>
                  <p className="text-xs text-text-muted">Upcoming</p>
                </div>
                <div className="text-center p-3 bg-bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-success">
                    {workloadStats.completed.length}
                  </p>
                  <p className="text-xs text-text-muted">Completed</p>
                </div>
              </div>

              {/* Work Order List */}
              {workOrdersLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-16 bg-bg-muted rounded" />
                  <div className="h-16 bg-bg-muted rounded" />
                </div>
              ) : assignedWorkOrders.length === 0 ? (
                <p className="text-center text-text-muted py-4">
                  No work orders assigned to this technician
                </p>
              ) : (
                <div className="space-y-3">
                  {assignedWorkOrders.slice(0, 5).map((wo) => (
                    <Link
                      key={wo.id}
                      to={`/work-orders/${wo.id}`}
                      className="block p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-text-primary">
                            {wo.customer_name || `Customer #${wo.customer_id}`}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {JOB_TYPE_LABELS[wo.job_type as JobType] ||
                              wo.job_type}
                            {" - "}
                            {wo.scheduled_date
                              ? formatDate(wo.scheduled_date)
                              : "Not scheduled"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            wo.status === "completed"
                              ? "success"
                              : wo.status === "canceled"
                                ? "danger"
                                : [
                                      "enroute",
                                      "on_site",
                                      "in_progress",
                                    ].includes(wo.status)
                                  ? "warning"
                                  : "default"
                          }
                        >
                          {WORK_ORDER_STATUS_LABELS[
                            wo.status as WorkOrderStatus
                          ] || wo.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {assignedWorkOrders.length > 5 && (
                    <p className="text-center text-sm text-text-muted pt-2">
                      +{assignedWorkOrders.length - 5} more work orders
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-6">
          {/* Vehicle Info */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-text-muted">Assigned Vehicle</dt>
                  <dd className="text-text-primary font-medium">
                    {technician.assigned_vehicle || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Tank Capacity</dt>
                  <dd className="text-text-primary">
                    {technician.vehicle_capacity_gallons
                      ? `${technician.vehicle_capacity_gallons.toLocaleString()} gallons`
                      : "-"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* License Info */}
          <Card>
            <CardHeader>
              <CardTitle>License & Payroll</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-text-muted">License Number</dt>
                  <dd className="text-text-primary">
                    {technician.license_number || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">License Expiry</dt>
                  <dd className="text-text-primary">
                    {technician.license_expiry
                      ? formatDate(technician.license_expiry)
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Hourly Rate</dt>
                  <dd className="text-text-primary font-medium">
                    {technician.hourly_rate
                      ? `$${technician.hourly_rate.toFixed(2)}/hr`
                      : "-"}
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
                  <dt className="text-sm text-text-muted">Technician ID</dt>
                  <dd className="text-text-primary font-mono text-sm">
                    {technician.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Created</dt>
                  <dd className="text-text-primary">
                    {technician.created_at
                      ? formatDate(technician.created_at)
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Last Updated</dt>
                  <dd className="text-text-primary">
                    {technician.updated_at
                      ? formatDate(technician.updated_at)
                      : "-"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <TechnicianForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        technician={technician}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setIsDeleteOpen(false)}>
            Delete Technician
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete{" "}
              <span className="font-medium text-text-primary">
                {technician.first_name} {technician.last_name}
              </span>
              ? This will mark them as inactive.
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
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
