import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import type { CommissionFilters as CommissionFiltersType } from "@/api/types/payroll.ts";
import { X } from "lucide-react";

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
}

interface CommissionFiltersProps {
  filters: CommissionFiltersType;
  onFiltersChange: (filters: CommissionFiltersType) => void;
  technicians: Technician[];
  isLoading?: boolean;
}

export function CommissionFilters({
  filters,
  onFiltersChange,
  technicians,
  isLoading,
}: CommissionFiltersProps) {
  const hasActiveFilters =
    (filters.status && filters.status !== "all") ||
    filters.technician_id ||
    (filters.commission_type && filters.commission_type !== "all") ||
    filters.date_from ||
    filters.date_to;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      status: e.target.value as CommissionFiltersType["status"],
      page: 1,
    });
  };

  const handleTechnicianChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      technician_id: e.target.value || undefined,
      page: 1,
    });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      commission_type: e.target
        .value as CommissionFiltersType["commission_type"],
      page: 1,
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      date_from: e.target.value || undefined,
      page: 1,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      date_to: e.target.value || undefined,
      page: 1,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "all",
      technician_id: undefined,
      commission_type: "all",
      date_from: undefined,
      date_to: undefined,
      page: 1,
      page_size: filters.page_size,
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label
              htmlFor="status-filter"
              className="block text-xs text-text-muted mb-1"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status || "all"}
              onChange={handleStatusChange}
              disabled={isLoading}
              className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="technician-filter"
              className="block text-xs text-text-muted mb-1"
            >
              Technician
            </label>
            <select
              id="technician-filter"
              value={filters.technician_id || ""}
              onChange={handleTechnicianChange}
              disabled={isLoading}
              className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
            >
              <option value="">All Technicians</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="type-filter"
              className="block text-xs text-text-muted mb-1"
            >
              Type
            </label>
            <select
              id="type-filter"
              value={filters.commission_type || "all"}
              onChange={handleTypeChange}
              disabled={isLoading}
              className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-w-[160px]"
            >
              <option value="all">All Types</option>
              <option value="job_completion">Job Completion</option>
              <option value="upsell">Upsell</option>
              <option value="referral">Referral</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="date-from"
              className="block text-xs text-text-muted mb-1"
            >
              From
            </label>
            <input
              type="date"
              id="date-from"
              value={filters.date_from || ""}
              onChange={handleDateFromChange}
              disabled={isLoading}
              className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="date-to"
              className="block text-xs text-text-muted mb-1"
            >
              To
            </label>
            <input
              type="date"
              id="date-to"
              value={filters.date_to || ""}
              onChange={handleDateToChange}
              disabled={isLoading}
              className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {hasActiveFilters && (
            <div className="pt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4 mr-1" />
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
