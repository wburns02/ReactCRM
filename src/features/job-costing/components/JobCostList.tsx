import { useState } from "react";
import {
  useJobCosts,
  useDeleteJobCost,
  COST_TYPES,
  type JobCostFilters,
} from "../api/jobCosting.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatCurrency } from "@/lib/utils.ts";

interface JobCostListProps {
  workOrderId?: string;
  onAddCost?: () => void;
  onEditCost?: (costId: string) => void;
}

export function JobCostList({
  workOrderId,
  onAddCost,
  onEditCost,
}: JobCostListProps) {
  const [filters, setFilters] = useState<JobCostFilters>({
    page: 1,
    page_size: 20,
    work_order_id: workOrderId,
  });
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data, isLoading, error } = useJobCosts({
    ...filters,
    cost_type: typeFilter || undefined,
  });
  const deleteCost = useDeleteJobCost();

  const costs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (filters.page_size || 20));

  const getCostTypeIcon = (type: string): string => {
    return COST_TYPES.find((t) => t.value === type)?.icon || "📋";
  };

  const handleDelete = async (costId: string) => {
    if (window.confirm("Are you sure you want to delete this cost entry?")) {
      try {
        await deleteCost.mutateAsync(costId);
      } catch (err) {
        console.error("Failed to delete cost:", err);
      }
    }
  };

  if (error) {
    return (
      <div className="bg-bg-error/10 border border-border-error rounded-lg p-4 text-text-error">
        Error loading job costs: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with add button and filters */}
      <div className="flex justify-between items-center">
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
          {COST_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>

        {onAddCost && <Button onClick={onAddCost}>+ Add Cost</Button>}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && costs.length === 0 && (
        <div className="text-center py-12 border border-border rounded-lg">
          <span className="text-4xl mb-4 block">💰</span>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No costs found
          </h3>
          <p className="text-text-muted">
            {typeFilter
              ? "Try adjusting your filters"
              : "Job costs will appear here"}
          </p>
          {onAddCost && !typeFilter && (
            <Button onClick={onAddCost} className="mt-4">
              Add First Cost
            </Button>
          )}
        </div>
      )}

      {/* Cost list */}
      {!isLoading && costs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Description
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  Qty
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  Unit Cost
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  Total
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost) => (
                <tr
                  key={cost.id}
                  className="border-b border-border hover:bg-bg-hover"
                >
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-2">
                      <span>{getCostTypeIcon(cost.cost_type)}</span>
                      <span className="capitalize text-text-primary">
                        {cost.cost_type}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-text-primary">
                        {cost.description}
                      </p>
                      {cost.vendor_name && (
                        <p className="text-xs text-text-muted">
                          Vendor: {cost.vendor_name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-text-primary">
                    {cost.quantity} {cost.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-text-primary">
                    {formatCurrency(cost.unit_cost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-text-primary">
                    {formatCurrency(cost.total_cost)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {cost.is_billed ? (
                      <Badge variant="success">Billed</Badge>
                    ) : cost.is_billable ? (
                      <Badge variant="warning">Billable</Badge>
                    ) : (
                      <Badge variant="default">Non-billable</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center gap-2">
                      {onEditCost && !cost.is_billed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditCost(cost.id)}
                        >
                          Edit
                        </Button>
                      )}
                      {!cost.is_billed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cost.id)}
                          disabled={deleteCost.isPending}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-text-muted">
            Showing {((filters.page || 1) - 1) * (filters.page_size || 20) + 1}{" "}
            to{" "}
            {Math.min((filters.page || 1) * (filters.page_size || 20), total)}{" "}
            of {total} costs
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
