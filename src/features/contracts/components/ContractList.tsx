import { useState } from "react";
import {
  useContracts,
  type Contract,
  type ContractFilters,
} from "../api/contracts.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatDate, formatCurrency } from "@/lib/utils.ts";

interface ContractListProps {
  customerId?: string;
  onContractSelect?: (contract: Contract) => void;
}

export function ContractList({
  customerId,
  onContractSelect,
}: ContractListProps) {
  const [filters, setFilters] = useState<ContractFilters>({
    page: 1,
    page_size: 20,
    customer_id: customerId,
  });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data, isLoading, error } = useContracts({
    ...filters,
    status: statusFilter || undefined,
    contract_type: typeFilter || undefined,
  });

  const contracts = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (filters.page_size || 20));

  const getStatusVariant = (
    status: string,
  ): "success" | "warning" | "danger" | "info" | "default" => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "expired":
        return "danger";
      case "cancelled":
        return "danger";
      case "draft":
        return "default";
      case "renewed":
        return "info";
      default:
        return "default";
    }
  };

  const getDaysUntilExpiryBadge = (days: number | null) => {
    if (days === null) return null;
    if (days < 0) {
      return <Badge variant="danger">Expired</Badge>;
    } else if (days <= 30) {
      return <Badge variant="warning">{days} days left</Badge>;
    } else if (days <= 60) {
      return <Badge variant="info">{days} days left</Badge>;
    }
    return null;
  };

  if (error) {
    return (
      <div className="bg-bg-error/10 border border-border-error rounded-lg p-4 text-text-error">
        Error loading contracts: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setFilters((prev) => ({ ...prev, page: 1 }));
          }}
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
          <option value="renewed">Renewed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setFilters((prev) => ({ ...prev, page: 1 }));
          }}
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          <option value="maintenance">Maintenance</option>
          <option value="service">Service</option>
          <option value="annual">Annual</option>
          <option value="multi-year">Multi-Year</option>
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && contracts.length === 0 && (
        <div className="text-center py-12 border border-border rounded-lg">
          <span className="text-4xl mb-4 block">📄</span>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No contracts found
          </h3>
          <p className="text-text-muted">
            {statusFilter || typeFilter
              ? "Try adjusting your filters"
              : "Contracts will appear here"}
          </p>
        </div>
      )}

      {/* Contract list */}
      {!isLoading && contracts.length > 0 && (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              onClick={() => onContractSelect?.(contract)}
              className={`
                p-4 rounded-lg border border-border bg-bg-primary
                hover:bg-bg-hover transition-colors
                ${onContractSelect ? "cursor-pointer" : ""}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-blue-100 text-lg">📄</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">
                        {contract.contract_number}
                      </span>
                      <Badge variant={getStatusVariant(contract.status)}>
                        {contract.status}
                      </Badge>
                      {getDaysUntilExpiryBadge(contract.days_until_expiry)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
                      <span>{contract.name}</span>
                      {contract.customer_name && (
                        <span>• {contract.customer_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {contract.total_value && (
                      <span className="font-semibold text-text-primary">
                        {formatCurrency(contract.total_value)}
                      </span>
                    )}
                    {contract.auto_renew && (
                      <Badge variant="info">Auto-Renew</Badge>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {formatDate(contract.start_date)} -{" "}
                    {formatDate(contract.end_date)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-text-muted">
            Showing {((filters.page || 1) - 1) * (filters.page_size || 20) + 1}{" "}
            to{" "}
            {Math.min((filters.page || 1) * (filters.page_size || 20), total)}{" "}
            of {total} contracts
          </p>
          <div className="flex items-center gap-2">
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
            <span className="text-sm text-text-muted">
              Page {filters.page || 1} of {totalPages}
            </span>
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
