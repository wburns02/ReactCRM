import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { type Quote, QUOTE_STATUS_LABELS, type QuoteStatus } from '@/api/types/quote.ts';

interface QuotesListProps {
  quotes: Quote[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onView: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
}

const STATUS_COLORS: Record<QuoteStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  declined: 'danger',
  expired: 'warning',
};

export function QuotesList({
  quotes,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
  onDelete,
}: QuotesListProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Loading quotes...
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="p-8 text-center text-text-secondary">
        No quotes found. Create your first quote to get started.
      </div>
    );
  }

  return (
    <div>
      <table className="w-full">
        <thead className="bg-bg-subtle border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Quote #</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Customer</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Status</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Total</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Valid Until</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {quotes.map((quote) => (
            <tr key={quote.id} className="hover:bg-bg-hover">
              <td className="px-4 py-3">
                <Link
                  to={`/quotes/${quote.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {quote.quote_number}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-primary">
                {quote.customer
                  ? `${quote.customer.first_name} ${quote.customer.last_name}`
                  : quote.customer_name || '-'}
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_COLORS[quote.status]}>
                  {QUOTE_STATUS_LABELS[quote.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right font-medium text-text-primary">
                ${quote.total.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {quote.valid_until
                  ? new Date(quote.valid_until).toLocaleDateString()
                  : '-'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(quote)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(quote)}
                    className="text-danger hover:text-danger"
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
