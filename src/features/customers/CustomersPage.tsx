import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "@/api/hooks/useCustomers.ts";
import { CustomersList } from "./CustomersList.tsx";
import { CustomerFilters } from "./components/CustomerFilters.tsx";
import { CustomerForm } from "./components/CustomerForm.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { ApiError } from "@/components/ui/ApiError.tsx";
import { ConfirmDialog } from "@/components/ui/Dialog.tsx";
import { apiClient } from "@/api/client.ts";
import type {
  CustomerFilters as CustomerFiltersType,
  Customer,
  CustomerFormData,
} from "@/api/types/customer.ts";

type ViewMode = "active" | "archived";

/**
 * Main Customers page - list view with filters and CRUD modals
 *
 * Features:
 * - Tabbed view: Active customers vs Legacy Archive
 * - Paginated list with filters (search, stage, active status)
 * - Create/Edit modal with form validation
 * - Archive/unarchive individual customers
 * - Delete confirmation dialog
 */
export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // View mode: active customers or legacy archive
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  // Filter state
  const [filters, setFilters] = useState<CustomerFiltersType>({
    page: 1,
    page_size: 20,
  });

  // Merge archive filter based on view mode
  const effectiveFilters: CustomerFiltersType = {
    ...filters,
    is_archived: viewMode === "archived" ? true : false,
  };

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Auto-open create modal when navigating from /customers/new
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(
    null,
  );

  // Data fetching
  const { data, isLoading, error, refetch } = useCustomers(effectiveFilters);

  // Also fetch archived count for the tab badge
  const { data: archivedData } = useCustomers({
    page: 1,
    page_size: 1,
    is_archived: true,
  });
  const archivedCount = archivedData?.total ?? 0;

  // Mutations
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  // Filter handlers
  const handleFilterChange = useCallback(
    (newFilters: Partial<CustomerFiltersType>) => {
      setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  // CRUD handlers
  const handleCreate = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setDeletingCustomer(customer);
  };

  const handleFormSubmit = async (data: CustomerFormData) => {
    if (editingCustomer) {
      await updateMutation.mutateAsync({ id: editingCustomer.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingCustomer) {
      await deleteMutation.mutateAsync(deletingCustomer.id);
      setDeletingCustomer(null);
    }
  };

  const handleArchiveCustomer = async (customer: Customer) => {
    try {
      const endpoint = customer.is_archived
        ? `/customers/${customer.id}/unarchive`
        : `/customers/${customer.id}/archive`;
      await apiClient.post(endpoint);
      refetch();
    } catch (err) {
      console.error("Archive/unarchive failed:", err);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  const isFormLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Customers
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your customer database and service history
          </p>
        </div>
        <Button onClick={handleCreate}>+ Add Customer</Button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-surface-secondary rounded-lg p-1 w-fit">
        <button
          onClick={() => handleViewModeChange("active")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === "active"
              ? "bg-white dark:bg-surface-primary text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Active Customers
          {data && viewMode === "active" && (
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {data.total.toLocaleString()}
            </span>
          )}
        </button>
        <button
          onClick={() => handleViewModeChange("archived")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === "archived"
              ? "bg-white dark:bg-surface-primary text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Legacy Archive
          {archivedCount > 0 && (
            <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
              {archivedCount.toLocaleString()}
            </span>
          )}
        </button>
      </div>

      {/* Archive info banner */}
      {viewMode === "archived" && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg flex items-start gap-3">
          <span className="text-lg mt-0.5">📦</span>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Legacy Archive
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              These are historical records imported from your previous system.
              They&apos;re preserved here for reference but won&apos;t appear in
              your active pipeline or dashboard stats. Click &quot;Restore&quot;
              on any record to move it back to active.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CustomerFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </Card>

      {/* Error state */}
      {error && (
        <div className="mb-6">
          <ApiError
            error={error}
            onRetry={() => refetch()}
            title="Failed to load customers"
          />
        </div>
      )}

      {/* List */}
      {!error && (
        <Card>
          <CustomersList
            customers={data?.items || []}
            total={data?.total || 0}
            page={filters.page || 1}
            pageSize={filters.page_size || 20}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onArchive={handleArchiveCustomer}
            viewMode={viewMode}
          />
        </Card>
      )}

      {/* Create/Edit Form Modal */}
      <CustomerForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        customer={editingCustomer}
        isLoading={isFormLoading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deletingCustomer?.first_name} ${deletingCustomer?.last_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
