import { useState } from "react";
import {
  useInspections,
  type Inspection,
  type InspectionFilters,
} from "../api/compliance.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatDate } from "@/lib/utils.ts";

interface InspectionListProps {
  customerId?: number;
  onSelect?: (inspection: Inspection) => void;
}

export function InspectionList({ customerId, onSelect }: InspectionListProps) {
  const [filters, setFilters] = useState<InspectionFilters>({
    page: 1,
    page_size: 20,
    customer_id: customerId,
  });

  const { data, isLoading, error } = useInspections(filters);
  const inspections = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (filters.page_size || 20));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "scheduled":
        return <Badge variant="info">Scheduled</Badge>;
      case "in_progress":
        return <Badge variant="info">In Progress</Badge>;
      case "failed":
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getResultBadge = (result?: string | null) => {
    if (!result) return null;
    switch (result) {
      case "pass":
        return <Badge variant="success">Pass</Badge>;
      case "fail":
        return <Badge variant="danger">Fail</Badge>;
      case "conditional":
        return <Badge variant="warning">Conditional</Badge>;
      default:
        return <Badge>{result}</Badge>;
    }
  };

  if (error) {
    return (
      <div className="text-center text-text-error py-8">
        Error loading inspections: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg">
        <span className="text-4xl mb-4 block">🔍</span>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No inspections found
        </h3>
        <p className="text-text-muted">
          Schedule inspections to track compliance
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex gap-2">
        <select
          value={filters.status || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              page: 1,
              status: e.target.value || undefined,
            }))
          }
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filters.inspection_type || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              page: 1,
              inspection_type: e.target.value || undefined,
            }))
          }
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          <option value="annual">Annual</option>
          <option value="sale">Sale</option>
          <option value="complaint">Complaint</option>
          <option value="permit">Permit</option>
          <option value="routine">Routine</option>
        </select>
      </div>

      {/* Inspection list */}
      <div className="space-y-2">
        {inspections.map((inspection) => (
          <div
            key={inspection.id}
            onClick={() => onSelect?.(inspection)}
            className={`
              p-4 rounded-lg border border-border bg-bg-primary
              hover:bg-bg-hover transition-colors
              ${onSelect ? "cursor-pointer" : ""}
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">
                    #{inspection.inspection_number}
                  </span>
                  {getStatusBadge(inspection.status)}
                  {getResultBadge(inspection.result)}
                </div>
                <p className="text-sm text-text-muted mt-1">
                  {inspection.inspection_type}
                  {inspection.property_address &&
                    ` • ${inspection.property_address}`}
                </p>
                {inspection.technician_name && (
                  <p className="text-xs text-text-muted mt-1">
                    Technician: {inspection.technician_name}
                  </p>
                )}
              </div>
              <div className="text-right">
                {inspection.scheduled_date && (
                  <>
                    <p className="text-sm text-text-muted">Scheduled</p>
                    <p className="font-medium text-text-primary">
                      {formatDate(inspection.scheduled_date)}
                    </p>
                  </>
                )}
                {inspection.completed_date && (
                  <>
                    <p className="text-sm text-text-muted mt-1">Completed</p>
                    <p className="text-sm text-text-primary">
                      {formatDate(inspection.completed_date)}
                    </p>
                  </>
                )}
                {inspection.requires_followup && (
                  <Badge variant="warning" className="mt-2">
                    Followup Required
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-text-muted">
            Page {filters.page || 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))
              }
              disabled={(filters.page || 1) <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
              }
              disabled={(filters.page || 1) >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
