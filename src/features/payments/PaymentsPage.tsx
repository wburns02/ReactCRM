import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import {
  usePayments,
  useRecordPayment,
  useUpdatePayment,
  useDeletePayment,
  usePaymentStats,
} from '@/api/hooks/usePayments.ts';
import { PaymentsList } from './components/PaymentsList.tsx';
import { PaymentForm } from './components/PaymentForm.tsx';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Payment,
  type PaymentFormData,
  type PaymentFilters,
  type PaymentMethod,
  type PaymentStatus,
} from '@/api/types/payment.ts';
import { formatCurrency } from '@/lib/utils.ts';

const PAGE_SIZE = 20;

/**
 * Payments list page with filtering and CRUD operations
 */
export function PaymentsPage() {
  // Filters state
  const [filters, setFilters] = useState<PaymentFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    status: '',
    payment_method: '',
    date_from: '',
    date_to: '',
  });

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Delete confirmation state
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  // Fetch payments and stats
  const { data, isLoading, error } = usePayments(filters);
  const { data: stats } = usePaymentStats();

  // Mutations
  const createMutation = useRecordPayment();
  const updateMutation = useUpdatePayment();
  const deleteMutation = useDeletePayment();

  // Handlers
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }));
  }, []);

  const handleMethodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, payment_method: e.target.value, page: 1 }));
  }, []);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, date_from: e.target.value, page: 1 }));
  }, []);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, date_to: e.target.value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleCreate = useCallback(() => {
    setEditingPayment(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((payment: Payment) => {
    setEditingPayment(payment);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((payment: Payment) => {
    setDeletingPayment(payment);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: PaymentFormData) => {
      if (editingPayment) {
        await updateMutation.mutateAsync({ id: editingPayment.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingPayment(null);
    },
    [editingPayment, createMutation, updateMutation]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deletingPayment) {
      await deleteMutation.mutateAsync(deletingPayment.id);
      setDeletingPayment(null);
    }
  }, [deletingPayment, deleteMutation]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger">Failed to load payments. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Payments</h1>
          <p className="text-sm text-text-secondary mt-1">
            Track and manage customer payments
          </p>
        </div>
        <Button onClick={handleCreate}>+ Record Payment</Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-text-muted mb-1">Total Received</div>
              <div className="text-2xl font-semibold text-text-primary">
                {formatCurrency(stats.totalReceived)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-text-muted mb-1">This Month</div>
              <div className="text-2xl font-semibold text-text-primary">
                {formatCurrency(stats.thisMonth)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-text-muted mb-1">Pending</div>
              <div className="text-2xl font-semibold text-warning">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-text-muted mb-1">Completed</div>
              <div className="text-2xl font-semibold text-success">
                {stats.completed}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-48">
              <Select
                value={filters.status || ''}
                onChange={handleStatusChange}
              >
                <option value="">All Statuses</option>
                {(Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-48">
              <Select
                value={filters.payment_method || ''}
                onChange={handleMethodChange}
              >
                <option value="">All Methods</option>
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-48">
              <Input
                type="date"
                value={filters.date_from || ''}
                onChange={handleDateFromChange}
                placeholder="From date"
              />
            </div>
            <div className="w-48">
              <Input
                type="date"
                value={filters.date_to || ''}
                onChange={handleDateToChange}
                placeholder="To date"
              />
            </div>
            {(filters.status || filters.payment_method || filters.date_from || filters.date_to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, status: '', payment_method: '', date_from: '', date_to: '', page: 1 }))}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total ? `${data.total} payment${data.total !== 1 ? 's' : ''}` : 'Payments'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PaymentsList
            payments={data?.items || []}
            total={data?.total || 0}
            page={filters.page || 1}
            pageSize={PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Form Modal */}
      <PaymentForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPayment(null);
        }}
        onSubmit={handleFormSubmit}
        payment={editingPayment}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingPayment}
        onClose={() => setDeletingPayment(null)}
      >
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeletingPayment(null)}>
            Delete Payment
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete this payment of{' '}
              <span className="font-medium text-text-primary">
                {formatCurrency(deletingPayment?.amount || 0)}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeletingPayment(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
