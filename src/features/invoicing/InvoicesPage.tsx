import { useState, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
} from "@/api/hooks/useInvoices.ts";
import { InvoicesList } from "./components/InvoicesList.tsx";
import { InvoiceForm } from "./components/InvoiceForm.tsx";
import {
  INVOICE_STATUS_LABELS,
  type Invoice,
  type InvoiceFormData,
  type InvoiceFilters,
  type InvoiceStatus,
} from "@/api/types/invoice.ts";

const PAGE_SIZE = 20;

/**
 * Get a descriptive label for the current filter state
 */
function getSearchPlaceholder(): string {
  return "Search name, email, phone, invoice #...";
}

/**
 * Get a descriptive label for the current filter state
 */
function getFilterLabel(status: string, count: number): string {
  const statusLabel = status
    ? INVOICE_STATUS_LABELS[status as InvoiceStatus]
    : "";
  const countText = count === 1 ? "invoice" : "invoices";

  if (status && statusLabel) {
    return `${count} ${statusLabel} ${countText}`;
  }
  return `${count} ${countText}`;
}

/**
 * Invoices list page with filtering and CRUD operations
 */
export function InvoicesPage() {
  // Search input state (immediate)
  const [searchInput, setSearchInput] = useState("");

  // Debounced search value (300ms delay for API calls)
  const debouncedSearch = useDebounce(searchInput, 300);

  // Filters state
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    status: "",
    date_from: "",
    date_to: "",
  });

  // Sync debounced search to filters
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: debouncedSearch || undefined,
      page: 1,
    }));
  }, [debouncedSearch]);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Delete confirmation state
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  // Fetch invoices
  const { data, isLoading, error } = useInvoices(filters);

  // Mutations
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();

  // Handlers
  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }));
    },
    [],
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, date_from: e.target.value, page: 1 }));
    },
    [],
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, date_to: e.target.value, page: 1 }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleCreate = useCallback(() => {
    setEditingInvoice(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((invoice: Invoice) => {
    setDeletingInvoice(invoice);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: InvoiceFormData) => {
      if (editingInvoice) {
        await updateMutation.mutateAsync({ id: editingInvoice.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingInvoice(null);
    },
    [editingInvoice, createMutation, updateMutation],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deletingInvoice) {
      await deleteMutation.mutateAsync(deletingInvoice.id);
      setDeletingInvoice(null);
    }
  }, [deletingInvoice, deleteMutation]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger">
              Failed to load invoices. Please try again.
            </p>
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
          <h1 className="text-2xl font-semibold text-text-primary">Invoices</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage customer invoices and billing
          </p>
        </div>
        <Button onClick={handleCreate}>+ Create Invoice</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64 max-w-md">
              <Input
                type="search"
                placeholder={getSearchPlaceholder()}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                value={filters.status || ""}
                onChange={handleStatusChange}
              >
                <option value="">All Statuses</option>
                {(
                  Object.entries(INVOICE_STATUS_LABELS) as [
                    InvoiceStatus,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-48">
              <Input
                type="date"
                value={filters.date_from || ""}
                onChange={handleDateFromChange}
                placeholder="From date"
              />
            </div>
            <div className="w-48">
              <Input
                type="date"
                value={filters.date_to || ""}
                onChange={handleDateToChange}
                placeholder="To date"
              />
            </div>
            {(searchInput ||
              filters.status ||
              filters.date_from ||
              filters.date_to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setFilters((prev) => ({
                    ...prev,
                    status: "",
                    date_from: "",
                    date_to: "",
                    search: undefined,
                    page: 1,
                  }));
                }}
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
            {data?.total !== undefined
              ? getFilterLabel(filters.status || "", data.total)
              : "Invoices"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InvoicesList
            invoices={data?.items || []}
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
      <InvoiceForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingInvoice(null);
        }}
        onSubmit={handleFormSubmit}
        invoice={editingInvoice}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingInvoice} onClose={() => setDeletingInvoice(null)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeletingInvoice(null)}>
            Delete Invoice
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete invoice{" "}
              <span className="font-medium text-text-primary">
                {deletingInvoice?.invoice_number || deletingInvoice?.id}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeletingInvoice(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
