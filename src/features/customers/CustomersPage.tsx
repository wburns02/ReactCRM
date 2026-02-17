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
import type {
  CustomerFilters as CustomerFiltersType,
  Customer,
  CustomerFormData,
} from "@/api/types/customer.ts";

/**
 * Main Customers page - list view with filters and CRUD modals
 *
 * Features:
 * - Paginated list with filters (search, stage, active status)
 * - Create/Edit modal with form validation
 * - Delete confirmation dialog
 * - Error handling with retry and fallback to legacy
 */
export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state
  const [filters, setFilters] = useState<CustomerFiltersType>({
    page: 1,
    page_size: 20,
  });

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
  const { data, isLoading, error, refetch } = useCustomers(filters);

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

      {/* Filters */}
      <Card className="mb-6">
        <CustomerFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </Card>

      {/* Error state - handles 500, network errors, etc. */}
      {error && (
        <div className="mb-6">
          <ApiError
            error={error}
            onRetry={() => refetch()}
            title="Failed to load customers"
          />
        </div>
      )}

      {/* List - only show when no error */}
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
