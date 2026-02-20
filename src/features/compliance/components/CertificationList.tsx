import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState.tsx";
import {
  useCertifications,
  type Certification,
  type CertificationFilters,
} from "../api/compliance.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatDate } from "@/lib/utils.ts";

interface CertificationListProps {
  technicianId?: string;
  onSelect?: (certification: Certification) => void;
}

export function CertificationList({
  technicianId,
  onSelect,
}: CertificationListProps) {
  const [filters, setFilters] = useState<CertificationFilters>({
    page: 1,
    page_size: 20,
    technician_id: technicianId,
  });

  const { data, isLoading, error } = useCertifications(filters);
  const certifications = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (filters.page_size || 20));

  const getStatusBadge = (status: string, daysUntilExpiry?: number | null) => {
    if (daysUntilExpiry !== null && daysUntilExpiry !== undefined) {
      if (daysUntilExpiry < 0) {
        return <Badge variant="danger">Expired</Badge>;
      }
      if (daysUntilExpiry <= 30) {
        return <Badge variant="warning">Expiring Soon</Badge>;
      }
    }
    if (status === "active") {
      return <Badge variant="success">Active</Badge>;
    }
    if (status === "expired") {
      return <Badge variant="danger">Expired</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  if (error) {
    return (
      <div className="text-center text-text-error py-8">
        Error loading certifications: {error.message}
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

  if (certifications.length === 0) {
    return (
      <div className="border border-border rounded-lg">
        <EmptyState icon="🎓" title="No certifications found" description="Add technician certifications to track training" />
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
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={filters.expiring_within_days || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              page: 1,
              expiring_within_days: e.target.value
                ? Number(e.target.value)
                : undefined,
            }))
          }
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          aria-label="Filter by expiry"
        >
          <option value="">All Expiry</option>
          <option value="30">Expiring in 30 days</option>
          <option value="60">Expiring in 60 days</option>
          <option value="90">Expiring in 90 days</option>
        </select>
      </div>

      {/* Certification list */}
      <div className="space-y-2">
        {certifications.map((cert) => (
          <div
            key={cert.id}
            onClick={() => onSelect?.(cert)}
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
                    {cert.name}
                  </span>
                  {getStatusBadge(cert.status, cert.days_until_expiry)}
                </div>
                <p className="text-sm text-text-muted mt-1">
                  {cert.certification_type}
                  {cert.technician_name && ` • ${cert.technician_name}`}
                </p>
              </div>
              <div className="text-right">
                {cert.expiry_date && (
                  <>
                    <p className="text-sm text-text-muted">Expires</p>
                    <p
                      className={`font-medium ${cert.days_until_expiry !== null && cert.days_until_expiry !== undefined && cert.days_until_expiry <= 30 ? "text-warning" : "text-text-primary"}`}
                    >
                      {formatDate(cert.expiry_date)}
                    </p>
                    {cert.days_until_expiry !== null &&
                      cert.days_until_expiry !== undefined && (
                        <p className="text-xs text-text-muted">
                          {cert.days_until_expiry < 0
                            ? `${Math.abs(cert.days_until_expiry)} days ago`
                            : `${cert.days_until_expiry} days left`}
                        </p>
                      )}
                  </>
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
