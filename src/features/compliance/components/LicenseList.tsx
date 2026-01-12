import { useState } from "react";
import {
  useLicenses,
  type License,
  type LicenseFilters,
} from "../api/compliance.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatDate } from "@/lib/utils.ts";

interface LicenseListProps {
  holderType?: string;
  onSelect?: (license: License) => void;
}

export function LicenseList({ holderType, onSelect }: LicenseListProps) {
  const [filters, setFilters] = useState<LicenseFilters>({
    page: 1,
    page_size: 20,
    holder_type: holderType,
  });

  const { data, isLoading, error } = useLicenses(filters);
  const licenses = data?.items || [];
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
    if (status === "suspended") {
      return <Badge variant="warning">Suspended</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  if (error) {
    return (
      <div className="text-center text-text-error py-8">
        Error loading licenses: {error.message}
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

  if (licenses.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg">
        <span className="text-4xl mb-4 block">📜</span>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No licenses found
        </h3>
        <p className="text-text-muted">
          Add licenses to track expiration dates
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
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
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

      {/* License list */}
      <div className="space-y-2">
        {licenses.map((license) => (
          <div
            key={license.id}
            onClick={() => onSelect?.(license)}
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
                    {license.license_type}
                  </span>
                  {getStatusBadge(license.status, license.days_until_expiry)}
                </div>
                <p className="text-sm text-text-muted mt-1">
                  #{license.license_number}
                  {license.holder_name && ` • ${license.holder_name}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">Expires</p>
                <p
                  className={`font-medium ${license.days_until_expiry !== null && license.days_until_expiry !== undefined && license.days_until_expiry <= 30 ? "text-warning" : "text-text-primary"}`}
                >
                  {license.expiry_date ? formatDate(license.expiry_date) : "-"}
                </p>
                {license.days_until_expiry !== null &&
                  license.days_until_expiry !== undefined && (
                    <p className="text-xs text-text-muted">
                      {license.days_until_expiry < 0
                        ? `${Math.abs(license.days_until_expiry)} days ago`
                        : `${license.days_until_expiry} days left`}
                    </p>
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
