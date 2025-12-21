import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { PaymentMethodBadge } from './PaymentMethodBadge.tsx';
import { formatDate, formatCurrency } from '@/lib/utils.ts';
import { PAYMENT_STATUS_LABELS, type Payment, type PaymentStatus } from '@/api/types/payment.ts';

interface PaymentsListProps {
  payments: Payment[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
}

/**
 * Get badge variant based on payment status
 */
function getStatusVariant(status: PaymentStatus): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'danger';
    case 'refunded':
      return 'default';
    default:
      return 'default';
  }
}

/**
 * Payments data table with pagination
 */
export function PaymentsList({
  payments,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: PaymentsListProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">💰</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">No payments found</h3>
        <p className="text-text-secondary">Try adjusting your filters or record a new payment.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Payments list">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Customer
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Invoice
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Method
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="hover:bg-bg-hover transition-colors"
                tabIndex={0}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-text-primary">
                      {payment.customer_name ||
                        (payment.customer
                          ? `${payment.customer.first_name} ${payment.customer.last_name}`
                          : `Customer #${payment.customer_id}`)}
                    </p>
                    {payment.customer?.email && (
                      <p className="text-sm text-text-secondary">{payment.customer.email}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {payment.invoice_id ? (
                    <Link
                      to={`/invoices/${payment.invoice_id}`}
                      className="text-text-link hover:underline text-sm"
                    >
                      View Invoice
                    </Link>
                  ) : (
                    <span className="text-text-muted text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(payment.amount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PaymentMethodBadge method={payment.payment_method} />
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(payment.status)}>
                    {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {formatDate(payment.payment_date)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(payment)}
                        aria-label="Edit payment"
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(payment)}
                        aria-label="Delete payment"
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
            Showing {startItem} to {endItem} of {total} payments
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
