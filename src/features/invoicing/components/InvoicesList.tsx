import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button.tsx";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge.tsx";
import { formatDate, formatCurrency } from "@/lib/utils.ts";
import type { Invoice } from "@/api/types/invoice.ts";

interface InvoicesListProps {
  invoices: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
}

/**
 * Invoices data table with pagination
 */
export function InvoicesList({
  invoices,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: InvoicesListProps) {
  const navigate = useNavigate();
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No invoices found
        </h3>
        <p className="text-text-secondary">
          Try adjusting your filters or create a new invoice.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Invoices list">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Invoice #
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Customer
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Total
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Due Date
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="hover:bg-bg-hover transition-colors cursor-pointer group"
                tabIndex={0}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/invoices/${invoice.id}`);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="font-mono text-sm text-text-link hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {invoice.invoice_number || invoice.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-text-primary">
                      {invoice.customer_name ||
                        (invoice.customer
                          ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
                          : `Customer #${invoice.customer_id}`)}
                    </p>
                    {invoice.customer?.email && (
                      <p className="text-sm text-text-secondary">
                        {invoice.customer.email}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(invoice.total)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {invoice.due_date ? (
                    <span className="text-text-primary">
                      {formatDate(invoice.due_date)}
                    </span>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {formatDate(invoice.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/invoices/${invoice.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="View invoice"
                      >
                        View
                      </Button>
                    </Link>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(invoice);
                        }}
                        aria-label="Edit invoice"
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(invoice);
                        }}
                        aria-label="Delete invoice"
                        className="text-danger hover:text-danger"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-text-secondary">
            Showing {startItem} to {endItem} of {total} invoices
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton for table
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-bg-muted mb-2" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-bg-hover mb-1" />
      ))}
    </div>
  );
}
