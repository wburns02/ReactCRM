import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Select } from '@/components/ui/Select.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import {
  useQuotes,
  useDeleteQuote,
} from '@/api/hooks/useQuotes.ts';
import { QuotesList } from './components/QuotesList.tsx';
import {
  QUOTE_STATUS_LABELS,
  type Quote,
  type QuoteFilters,
  type QuoteStatus,
} from '@/api/types/quote.ts';

const PAGE_SIZE = 20;

/**
 * Quotes list page with filtering and CRUD operations
 */
export function QuotesPage() {
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState<QuoteFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    status: '',
  });

  // Delete confirmation state
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);

  // Fetch quotes
  const { data, isLoading, error } = useQuotes(filters);

  // Mutations
  const deleteMutation = useDeleteQuote();

  // Handlers
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleCreate = useCallback(() => {
    navigate('/quotes/new');
  }, [navigate]);

  const handleView = useCallback((quote: Quote) => {
    navigate(`/quotes/${quote.id}`);
  }, [navigate]);

  const handleDelete = useCallback((quote: Quote) => {
    setDeletingQuote(quote);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingQuote) {
      await deleteMutation.mutateAsync(deletingQuote.id);
      setDeletingQuote(null);
    }
  }, [deletingQuote, deleteMutation]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger">Failed to load quotes. Please try again.</p>
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
          <h1 className="text-2xl font-semibold text-text-primary">Quotes</h1>
          <p className="text-sm text-text-secondary mt-1">
            Create and manage customer quotes
          </p>
        </div>
        <Button onClick={handleCreate}>+ Create Quote</Button>
      </div>

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
                {(Object.entries(QUOTE_STATUS_LABELS) as [QuoteStatus, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            {filters.status && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, status: '', page: 1 }))}
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
            {data?.total ? `${data.total} quote${data.total !== 1 ? 's' : ''}` : 'Quotes'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <QuotesList
            quotes={data?.items || []}
            total={data?.total || 0}
            page={filters.page || 1}
            pageSize={PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onView={handleView}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingQuote}
        onClose={() => setDeletingQuote(null)}
      >
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeletingQuote(null)}>
            Delete Quote
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete quote{' '}
              <span className="font-medium text-text-primary">
                {deletingQuote?.quote_number || deletingQuote?.id}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeletingQuote(null)}
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
