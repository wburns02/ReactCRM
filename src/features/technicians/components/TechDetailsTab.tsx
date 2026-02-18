import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { formatDate } from "@/lib/utils.ts";
import type { Technician } from "@/api/types/technician.ts";

interface TechDetailsTabProps {
  technician: Technician;
}

export function TechDetailsTab({ technician }: TechDetailsTabProps) {
  const fullAddress = [
    technician.home_address,
    technician.home_city,
    technician.home_state && technician.home_postal_code
      ? `${technician.home_state} ${technician.home_postal_code}`
      : technician.home_state || technician.home_postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const hasCoordinates = technician.home_latitude && technician.home_longitude;
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${technician.home_latitude},${technician.home_longitude}`
    : fullAddress
      ? `https://www.google.com/maps/search/${encodeURIComponent(fullAddress)}`
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">Status</dt>
              <dd>
                <Badge variant={technician.is_active ? "success" : "default"}>
                  {technician.is_active ? "Active" : "Inactive"}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">Employee ID</dt>
              <dd className="text-text-primary font-mono text-sm">
                {technician.employee_id || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">Hire Date</dt>
              <dd className="text-text-primary">
                {technician.hire_date
                  ? formatDate(technician.hire_date)
                  : "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">Department</dt>
              <dd className="text-text-primary">
                {technician.department || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">Pay Type</dt>
              <dd className="text-text-primary capitalize">
                {technician.pay_type || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">Hourly Rate</dt>
              <dd className="text-text-primary font-medium">
                {technician.hourly_rate
                  ? `$${technician.hourly_rate.toFixed(2)}/hr`
                  : "-"}
              </dd>
            </div>
            {technician.overtime_rate != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-muted">Overtime Rate</dt>
                <dd className="text-text-primary">
                  ${Number(technician.overtime_rate).toFixed(2)}/hr
                </dd>
              </div>
            )}
            {technician.salary_amount != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-muted">Annual Salary</dt>
                <dd className="text-text-primary">
                  ${Number(technician.salary_amount).toLocaleString()}
                </dd>
              </div>
            )}
            {technician.pto_balance_hours != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-muted">PTO Balance</dt>
                <dd className="text-text-primary">
                  {Number(technician.pto_balance_hours).toFixed(1)} hours
                </dd>
              </div>
            )}
            {technician.external_payroll_id && (
              <div className="flex justify-between">
                <dt className="text-sm text-text-muted">External Payroll ID</dt>
                <dd className="text-text-primary font-mono text-sm">
                  {technician.external_payroll_id}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Home Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Home Location</CardTitle>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open in Maps
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-text-muted">Region</dt>
              <dd className="text-text-primary">
                {technician.home_region || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Address</dt>
              <dd className="text-text-primary">
                {fullAddress || "-"}
              </dd>
            </div>
            {hasCoordinates && (
              <div>
                <dt className="text-sm text-text-muted">Coordinates</dt>
                <dd className="text-text-primary font-mono text-sm">
                  {technician.home_latitude}, {technician.home_longitude}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Vehicle Details */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">Assigned Vehicle</dt>
              <dd className="text-text-primary font-medium">
                {technician.assigned_vehicle || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
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
          <CardTitle>License Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">License Number</dt>
              <dd className="text-text-primary">
                {technician.license_number || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-text-muted">License Expiry</dt>
              <dd className="text-text-primary">
                {technician.license_expiry
                  ? formatDate(technician.license_expiry)
                  : "-"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {technician.notes ? (
            <p className="text-text-secondary whitespace-pre-wrap">
              {technician.notes}
            </p>
          ) : (
            <p className="text-text-muted">No notes</p>
          )}
        </CardContent>
      </Card>

      {/* Record Metadata */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Record Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-text-muted">Technician ID</dt>
              <dd className="text-text-primary font-mono text-sm break-all">
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
  );
}
