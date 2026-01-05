import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { formatPhone } from '@/lib/utils.ts';
import { useIsMobileOrTablet } from '@/hooks/useMediaQuery';
import { PROSPECT_STAGE_LABELS } from '@/api/types/common.ts';
import { CUSTOMER_TYPE_LABELS } from '@/api/types/customer.ts';
import type { Customer } from '@/api/types/customer.ts';

/**
 * Props for memoized row components
 */
interface CustomerRowProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

/**
 * Memoized mobile card - prevents re-render unless props change
 */
const MobileCustomerCard = memo(function MobileCustomerCard({
  customer,
  onEdit,
  onDelete,
}: CustomerRowProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">
            {customer.first_name} {customer.last_name}
          </h3>
          <p className="text-xs text-text-muted">ID: {customer.id}</p>
        </div>
        <div className="ml-2">
          {customer.prospect_stage ? (
            <Badge variant="stage" stage={customer.prospect_stage}>
              {PROSPECT_STAGE_LABELS[customer.prospect_stage] || customer.prospect_stage}
            </Badge>
          ) : (
            <Badge variant={customer.is_active ? 'success' : 'default'}>
              {customer.is_active ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm mb-3">
        {customer.email && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">📧</span>
            <a
              href={'mailto:' + customer.email}
              className="text-text-link hover:underline truncate"
            >
              {customer.email}
            </a>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">📱</span>
            <a
              href={'tel:' + customer.phone}
              className="text-text-secondary"
            >
              {formatPhone(customer.phone)}
            </a>
          </div>
        )}
        {(customer.city || customer.state) && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">📍</span>
            <span className="text-text-secondary">
              {customer.city && customer.state
                ? customer.city + ', ' + customer.state
                : customer.city || customer.state}
            </span>
          </div>
        )}
        {customer.customer_type && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">🏷️</span>
            <span className="text-text-secondary">
              {CUSTOMER_TYPE_LABELS[customer.customer_type as keyof typeof CUSTOMER_TYPE_LABELS] ||
                customer.customer_type}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link to={`/customers/${customer.id}`} className="flex-1">
          <Button variant="primary" size="sm" className="w-full">
            View
          </Button>
        </Link>
        {onEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(customer)}
            className="flex-1"
          >
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(customer)}
            className="text-danger hover:text-danger"
          >
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
});

/**
 * Memoized table row - prevents re-render unless props change
 */
const TableCustomerRow = memo(function TableCustomerRow({
  customer,
  onEdit,
  onDelete,
}: CustomerRowProps) {
  return (
    <tr
      className="hover:bg-bg-hover transition-colors"
      tabIndex={0}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-text-primary">
            {customer.first_name} {customer.last_name}
          </p>
          <p className="text-sm text-text-secondary">
            ID: {customer.id}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          {customer.email && (
            <a
              href={'mailto:' + customer.email}
              className="text-text-link hover:underline block"
            >
              {customer.email}
            </a>
          )}
          {customer.phone && (
            <span className="text-text-secondary">{formatPhone(customer.phone)}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">
        {customer.city && customer.state
          ? customer.city + ', ' + customer.state
          : customer.city || customer.state || '-'}
      </td>
      <td className="px-4 py-3 text-sm">
        {customer.customer_type && CUSTOMER_TYPE_LABELS[customer.customer_type as keyof typeof CUSTOMER_TYPE_LABELS]
          ? CUSTOMER_TYPE_LABELS[customer.customer_type as keyof typeof CUSTOMER_TYPE_LABELS]
          : customer.customer_type || '-'}
      </td>
      <td className="px-4 py-3">
        {customer.prospect_stage ? (
          <Badge variant="stage" stage={customer.prospect_stage}>
            {PROSPECT_STAGE_LABELS[customer.prospect_stage] || customer.prospect_stage}
          </Badge>
        ) : (
          <Badge variant={customer.is_active ? 'success' : 'default'}>
            {customer.is_active ? 'Active' : 'Inactive'}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link to={`/customers/${customer.id}`}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={'View ' + customer.first_name + ' ' + customer.last_name}
            >
              View
            </Button>
          </Link>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(customer)}
              aria-label={'Edit ' + customer.first_name + ' ' + customer.last_name}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(customer)}
              aria-label={'Delete ' + customer.first_name + ' ' + customer.last_name}
              className="text-danger hover:text-danger"
            >
              Delete
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});

interface CustomersListProps {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

/**
 * Customers data table with pagination
 */
export function CustomersList({
  customers,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: CustomersListProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const isMobileOrTablet = useIsMobileOrTablet();

  if (isLoading) {
    return <LoadingSkeleton isMobile={isMobileOrTablet} />;
  }

  // Memoized callbacks for child components
  const handleEdit = useCallback((customer: Customer) => onEdit?.(customer), [onEdit]);
  const handleDelete = useCallback((customer: Customer) => onDelete?.(customer), [onDelete]);

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">👥</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">No customers found</h3>
        <p className="text-text-secondary">Try adjusting your filters or add a new customer.</p>
      </div>
    );
  }

  // Mobile card view
  if (isMobileOrTablet) {
    return (
      <div>
        <div className="space-y-3">
          {customers.map((customer) => (
            <MobileCustomerCard
              key={customer.id}
              customer={customer}
              onEdit={onEdit ? handleEdit : undefined}
              onDelete={onDelete ? handleDelete : undefined}
            />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 mt-4">
          <p className="text-sm text-text-secondary">
            {startItem}-{endItem} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              Prev
            </Button>
            <span className="text-sm text-text-secondary px-2">
              {page}/{totalPages}
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
      </div>
    );
  }

  // Desktop table view
  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Customers list">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {customers.map((customer) => (
              <TableCustomerRow
                key={customer.id}
                customer={customer}
                onEdit={onEdit ? handleEdit : undefined}
                onDelete={onDelete ? handleDelete : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-text-secondary">
          Showing {startItem} to {endItem} of {total} customers
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
    </div>
  );
}

/**
 * Loading skeleton for table or cards
 */
function LoadingSkeleton({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-border p-4">
            <div className="h-6 bg-bg-muted rounded w-3/4 mb-3" />
            <div className="h-4 bg-bg-hover rounded w-1/2 mb-2" />
            <div className="h-4 bg-bg-hover rounded w-2/3 mb-2" />
            <div className="flex gap-2 mt-3">
              <div className="h-8 bg-bg-muted rounded flex-1" />
              <div className="h-8 bg-bg-muted rounded flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      <div className="h-10 bg-bg-muted mb-2" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-bg-hover mb-1" />
      ))}
    </div>
  );
}
