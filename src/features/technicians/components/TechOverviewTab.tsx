import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { DialButton } from "@/features/phone/components/DialButton.tsx";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { formatPhone, formatDate } from "@/lib/utils.ts";
import { useEmailCompose } from "@/context/EmailComposeContext";
import {
  TECHNICIAN_SKILL_LABELS,
  type Technician,
  type TechnicianSkill,
} from "@/api/types/technician.ts";
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  type WorkOrderStatus,
  type JobType,
} from "@/api/types/workOrder.ts";

interface TechOverviewTabProps {
  technician: Technician;
  technicianId: string;
}

export function TechOverviewTab({ technician, technicianId }: TechOverviewTabProps) {
  const { openEmailCompose } = useEmailCompose();
  const technicianName = `${technician.first_name} ${technician.last_name}`;

  const { data: workOrdersData, isLoading: workOrdersLoading } = useWorkOrders({
    page: 1,
    page_size: 100,
  });

  const assignedWorkOrders = useMemo(() => {
    if (!workOrdersData?.items || !technicianId) return [];
    return workOrdersData.items.filter(
      (wo) =>
        wo.technician_id === technicianId || wo.assigned_technician === technicianName,
    );
  }, [workOrdersData, technicianId, technicianName]);

  const workloadStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayJobs = assignedWorkOrders.filter(
      (wo) => wo.scheduled_date === today,
    );
    const inProgress = assignedWorkOrders.filter((wo) =>
      ["enroute", "on_site", "in_progress"].includes(wo.status),
    );
    const upcoming = assignedWorkOrders.filter(
      (wo) =>
        wo.scheduled_date &&
        wo.scheduled_date >= today &&
        !["completed", "canceled"].includes(wo.status),
    );
    const completed = assignedWorkOrders.filter(
      (wo) => wo.status === "completed",
    );
    return { todayJobs, inProgress, upcoming, completed };
  }, [assignedWorkOrders]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-text-muted">Email</dt>
                <dd className="text-text-primary">
                  {technician.email ? (
                    <button
                      onClick={() =>
                        openEmailCompose({
                          to: technician.email!,
                          customerName: technicianName,
                        })
                      }
                      className="text-text-link hover:underline"
                    >
                      {technician.email}
                    </button>
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
              {technician.employee_id && (
                <div>
                  <dt className="text-sm text-text-muted">Employee ID</dt>
                  <dd className="text-text-primary font-mono text-sm">
                    {technician.employee_id}
                  </dd>
                </div>
              )}
              {technician.department && (
                <div>
                  <dt className="text-sm text-text-muted">Department</dt>
                  <dd className="text-text-primary">{technician.department}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Expertise</CardTitle>
          </CardHeader>
          <CardContent>
            {technician.skills && technician.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {technician.skills.map((skill) => (
                  <Badge key={skill} variant="default">
                    {TECHNICIAN_SKILL_LABELS[skill as TechnicianSkill] || skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">No skills listed</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Work Orders */}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
                No work orders assigned
              </p>
            ) : (
              <div className="space-y-3">
                {assignedWorkOrders.slice(0, 5).map((wo) => (
                  <Link
                    key={wo.id}
                    to={`/work-orders/${wo.id}`}
                    className="block p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-text-primary">
                          {wo.customer_name || `Customer #${wo.customer_id}`}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {JOB_TYPE_LABELS[wo.job_type as JobType] || wo.job_type}
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
                              : ["enroute", "on_site", "in_progress"].includes(wo.status)
                                ? "warning"
                                : "default"
                        }
                      >
                        {WORK_ORDER_STATUS_LABELS[wo.status as WorkOrderStatus] ||
                          wo.status}
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

      {/* Right Column */}
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

        {/* Home Region */}
        <Card>
          <CardHeader>
            <CardTitle>Home Region</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-primary">
              {technician.home_region || "-"}
            </p>
            {technician.home_city && (
              <p className="text-sm text-text-secondary mt-1">
                {technician.home_city}
                {technician.home_state && `, ${technician.home_state}`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {technician.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary whitespace-pre-wrap text-sm line-clamp-6">
                {technician.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* License Quick View */}
        <Card>
          <CardHeader>
            <CardTitle>License</CardTitle>
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
                <dt className="text-sm text-text-muted">Expiry</dt>
                <dd className="text-text-primary">
                  {technician.license_expiry
                    ? formatDate(technician.license_expiry)
                    : "-"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
