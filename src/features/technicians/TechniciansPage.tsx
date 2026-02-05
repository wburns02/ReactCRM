import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useTechnicians,
  useCreateTechnician,
  useUpdateTechnician,
  useDeleteTechnician,
} from "@/api/hooks/useTechnicians.ts";
import { TechniciansList } from "./TechniciansList.tsx";
import { TechnicianForm } from "./components/TechnicianForm.tsx";
import type {
  Technician,
  TechnicianFormData,
  TechnicianFilters,
} from "@/api/types/technician.ts";

const PAGE_SIZE = 20;

/**
 * Technicians list page with CRUD operations
 */
export function TechniciansPage() {
  // Filters state
  const [filters, setFilters] = useState<TechnicianFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    search: "",
    active_only: true, // Only show active technicians by default
  });

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(
    null,
  );

  // Delete confirmation state
  const [deletingTechnician, setDeletingTechnician] =
    useState<Technician | null>(null);

  // Fetch technicians
  const { data, isLoading, error } = useTechnicians(filters);

  // Mutations
  const createMutation = useCreateTechnician();
  const updateMutation = useUpdateTechnician();
  const deleteMutation = useDeleteTechnician();

  // Handlers
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }));
  }, []);

  const handleActiveOnlyToggle = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      active_only: !prev.active_only,
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleCreate = useCallback(() => {
    setEditingTechnician(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((technician: Technician) => {
    setEditingTechnician(technician);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((technician: Technician) => {
    setDeletingTechnician(technician);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: TechnicianFormData) => {
      if (editingTechnician) {
        await updateMutation.mutateAsync({ id: editingTechnician.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingTechnician(null);
    },
    [editingTechnician, createMutation, updateMutation],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deletingTechnician) {
      try {
        await deleteMutation.mutateAsync(deletingTechnician.id);
        setDeletingTechnician(null);
      } catch (error) {
        console.error("Failed to delete technician:", error);
        // Keep the dialog open on error so user can try again
      }
    }
  }, [deletingTechnician, deleteMutation]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger">
              Failed to load technicians. Please try again.
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
          <h1 className="text-2xl font-semibold text-text-primary">
            Technicians
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your field technicians
          </p>
        </div>
        <Button onClick={handleCreate}>+ Add Technician</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="search"
                placeholder="Search by name, email, or employee ID..."
                value={filters.search || ""}
                onChange={handleSearch}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.active_only}
                onChange={handleActiveOnlyToggle}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm text-text-secondary">Active only</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total
              ? `${data.total} technician${data.total !== 1 ? "s" : ""}`
              : "Technicians"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TechniciansList
            technicians={data?.items || []}
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

      {/* Create/Edit Form Modal — key forces remount so useForm gets fresh defaultValues */}
      <TechnicianForm
        key={editingTechnician?.id ?? "new"}
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTechnician(null);
        }}
        onSubmit={handleFormSubmit}
        technician={editingTechnician}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingTechnician}
        onClose={() => setDeletingTechnician(null)}
      >
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeletingTechnician(null)}>
            Delete Technician
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete{" "}
              <span className="font-medium text-text-primary">
                {deletingTechnician?.first_name} {deletingTechnician?.last_name}
              </span>
              ? This will mark them as inactive.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeletingTechnician(null)}
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
