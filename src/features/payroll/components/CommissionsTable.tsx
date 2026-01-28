import { useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import type { Commission } from "@/api/types/payroll.ts";
import {
  ChevronUp,
  ChevronDown,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { Link } from "react-router-dom";

interface CommissionsTableProps {
  commissions: Commission[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onPageChange: (page: number) => void;
  onApprove: (id: string) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
  onEdit?: (commission: Commission) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusStyles = {
  pending: "bg-warning/20 text-warning border-warning/30",
  approved: "bg-primary/20 text-primary border-primary/30",
  paid: "bg-success/20 text-success border-success/30",
};

export function CommissionsTable({
  commissions,
  total,
  page,
  pageSize,
  isLoading,
  selectedIds,
  onSelectionChange,
  onPageChange,
  onApprove,
  onMarkPaid,
  onEdit,
  sortBy,
  sortOrder,
  onSortChange,
}: CommissionsTableProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const toggleAll = () => {
    if (selectedIds.size === commissions.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(commissions.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await onApprove(id);
    } finally {
      setApprovingId(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setMarkingPaidId(id);
    try {
      await onMarkPaid(id);
    } finally {
      setMarkingPaidId(null);
    }
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: string;
    children: React.ReactNode;
  }) => {
    const isActive = sortBy === field;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-primary"
        onClick={() => onSortChange?.(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive &&
            (sortOrder === "asc" ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            ))}
        </div>
      </th>
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-bg-muted rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="text-center py-12 bg-bg-card border border-border rounded-lg">
        <div className="text-4xl mb-4">💵</div>
        <h3 className="font-medium text-text-primary mb-2">
          No Commissions Found
        </h3>
        <p className="text-sm text-text-secondary">
          Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto bg-bg-card border border-border rounded-lg">
        <table className="w-full" role="grid">
          <thead className="bg-bg-muted/50">
            <tr className="border-b border-border">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === commissions.length &&
                    commissions.length > 0
                  }
                  onChange={toggleAll}
                  className="rounded border-border"
                  aria-label="Select all"
                />
              </th>
              <SortableHeader field="created_at">Date</SortableHeader>
              <SortableHeader field="technician_name">Technician</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Work Order
              </th>
              <SortableHeader field="job_total">Job Total</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Rate
              </th>
              <SortableHeader field="commission_amount">
                Commission
              </SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {commissions.map((commission) => (
              <tr
                key={commission.id}
                className={`hover:bg-bg-muted/30 ${selectedIds.has(commission.id) ? "bg-primary/5" : ""}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(commission.id)}
                    onChange={() => toggleOne(commission.id)}
                    className="rounded border-border"
                    aria-label={`Select commission for ${commission.technician_name}`}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">
                  {formatDate(commission.earned_date || commission.created_at || "")}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-text-primary">
                    {commission.technician_name ||
                      `Tech #${commission.technician_id}`}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {commission.work_order_id ? (
                    <Link
                      to={`/work-orders/${commission.work_order_id}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      #{commission.work_order_number || commission.work_order_id}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-text-muted text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  {formatCurrency(commission.base_amount || commission.job_total || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {((commission.rate || commission.commission_rate || 0) * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-3">
                  <span className="text-lg font-bold text-success">
                    {formatCurrency(commission.commission_amount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={statusStyles[commission.status]}
                    variant="outline"
                  >
                    {commission.status.charAt(0).toUpperCase() +
                      commission.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {/* Edit button - show for pending commissions */}
                    {commission.status === "pending" && onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(commission)}
                        className="text-text-muted hover:text-text-primary"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                    {commission.status === "pending" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(commission.id)}
                        disabled={approvingId === commission.id}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {approvingId === commission.id
                          ? "..."
                          : "Approve"}
                      </Button>
                    )}
                    {commission.status === "approved" && (
                      <>
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(commission)}
                            className="text-text-muted hover:text-text-primary"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMarkPaid(commission.id)}
                          disabled={markingPaidId === commission.id}
                          className="bg-success/20 hover:bg-success/30 text-success"
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          {markingPaidId === commission.id ? "..." : "Mark Paid"}
                        </Button>
                      </>
                    )}
                    {commission.status === "paid" && (
                      <span className="text-xs text-text-muted">Completed</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-text-muted">
            Showing {startItem} to {endItem} of {total} commissions
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="min-w-[36px]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-text-muted">...</span>
                  <Button
                    variant={page === totalPages ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    className="min-w-[36px]"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
