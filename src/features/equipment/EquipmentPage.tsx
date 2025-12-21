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
  useEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
} from '@/api/hooks/useEquipment.ts';
import { EquipmentList } from './components/EquipmentList.tsx';
import { EquipmentForm } from './components/EquipmentForm.tsx';
import {
  type Equipment,
  type EquipmentFormData,
  type EquipmentFilters,
  type EquipmentStatus,
  EQUIPMENT_STATUS_LABELS,
} from '@/api/types/equipment.ts';

const PAGE_SIZE = 20;

/**
 * Equipment list page with CRUD operations
 */
export function EquipmentPage() {
  // Filters state
  const [filters, setFilters] = useState<EquipmentFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    search: '',
    status: undefined,
  });

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // Delete confirmation state
  const [deletingEquipment, setDeletingEquipment] = useState<Equipment | null>(null);

  // Fetch equipment
  const { data, isLoading, error } = useEquipment(filters);

  // Mutations
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const deleteMutation = useDeleteEquipment();

  // Handlers
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }));
  }, []);

  const handleStatusFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      status: value ? (value as EquipmentStatus) : undefined,
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleCreate = useCallback(() => {
    setEditingEquipment(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((equipment: Equipment) => {
    setEditingEquipment(equipment);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((equipment: Equipment) => {
    setDeletingEquipment(equipment);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: EquipmentFormData) => {
      if (editingEquipment) {
        await updateMutation.mutateAsync({ id: editingEquipment.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingEquipment(null);
    },
    [editingEquipment, createMutation, updateMutation]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deletingEquipment) {
      await deleteMutation.mutateAsync(deletingEquipment.id);
      setDeletingEquipment(null);
    }
  }, [deletingEquipment, deleteMutation]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger">Failed to load equipment. Please try again.</p>
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
          <h1 className="text-2xl font-semibold text-text-primary">Equipment</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your company equipment and assets
          </p>
        </div>
        <Button onClick={handleCreate}>+ Add Equipment</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="search"
                placeholder="Search by name, type, or serial number..."
                value={filters.search || ''}
                onChange={handleSearch}
              />
            </div>
            <div className="w-48">
              <Select
                value={filters.status || ''}
                onChange={handleStatusFilter}
              >
                <option value="">All Statuses</option>
                {Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total ? `${data.total} item${data.total !== 1 ? 's' : ''}` : 'Equipment'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <EquipmentList
            equipment={data?.items || []}
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
      <EquipmentForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEquipment(null);
        }}
        onSubmit={handleFormSubmit}
        equipment={editingEquipment}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingEquipment}
        onClose={() => setDeletingEquipment(null)}
      >
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeletingEquipment(null)}>
            Delete Equipment
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete{' '}
              <span className="font-medium text-text-primary">
                {deletingEquipment?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeletingEquipment(null)}
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
