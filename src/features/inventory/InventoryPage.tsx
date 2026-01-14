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
  useInventory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useAdjustInventory,
  useDeleteInventoryItem,
} from "@/api/hooks/useInventory.ts";
import { InventoryList } from "./components/InventoryList.tsx";
import { InventoryForm } from "./components/InventoryForm.tsx";
import { InventoryAdjustment } from "./components/InventoryAdjustment.tsx";
import { StockAlerts } from "./components/StockAlerts.tsx";
import {
  type InventoryItem,
  type InventoryFormData,
  type InventoryFilters,
  type InventoryAdjustmentData,
} from "@/api/types/inventory.ts";

const PAGE_SIZE = 20;

/**
 * Inventory list page with CRUD operations
 */
export function InventoryPage() {
  // Filters state
  const [filters, setFilters] = useState<InventoryFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    search: "",
    low_stock: false,
  });

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Adjustment modal state
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(
    null,
  );

  // Delete confirmation state
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  // Fetch inventory
  const { data, isLoading, error } = useInventory(filters);

  // Mutations
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const adjustMutation = useAdjustInventory();
  const deleteMutation = useDeleteInventoryItem();

  // Handlers
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }));
  }, []);

  const handleLowStockToggle = useCallback(() => {
    setFilters((prev) => ({ ...prev, low_stock: !prev.low_stock, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleCreate = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const handleAdjust = useCallback((item: InventoryItem) => {
    setAdjustingItem(item);
    setIsAdjustmentOpen(true);
  }, []);

  const handleDelete = useCallback((item: InventoryItem) => {
    setDeletingItem(item);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: InventoryFormData) => {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsFormOpen(false);
      setEditingItem(null);
    },
    [editingItem, createMutation, updateMutation],
  );

  const handleAdjustmentSubmit = useCallback(
    async (data: InventoryAdjustmentData) => {
      if (adjustingItem) {
        await adjustMutation.mutateAsync({ id: adjustingItem.id, data });
        setIsAdjustmentOpen(false);
        setAdjustingItem(null);
      }
    },
    [adjustingItem, adjustMutation],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deletingItem) {
      await deleteMutation.mutateAsync(deletingItem.id);
      setDeletingItem(null);
    }
  }, [deletingItem, deleteMutation]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger">
              Failed to load inventory. Please try again.
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
            Inventory
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track stock levels and manage inventory
          </p>
        </div>
        <Button onClick={handleCreate}>+ Add Item</Button>
      </div>

      {/* Stock Alerts */}
      {data?.items && data.items.length > 0 && (
        <div className="mb-6">
          <StockAlerts items={data.items} />
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="search"
                placeholder="Search by name, SKU, or category..."
                value={filters.search || ""}
                onChange={handleSearch}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.low_stock}
                onChange={handleLowStockToggle}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm text-text-secondary">
                Low stock only
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total
              ? `${data.total} item${data.total !== 1 ? "s" : ""}`
              : "Inventory Items"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InventoryList
            items={data?.items || []}
            total={data?.total || 0}
            page={filters.page || 1}
            pageSize={PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onEdit={handleEdit}
            onAdjust={handleAdjust}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Form Modal */}
      <InventoryForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleFormSubmit}
        item={editingItem}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Adjustment Modal */}
      <InventoryAdjustment
        open={isAdjustmentOpen}
        onClose={() => {
          setIsAdjustmentOpen(false);
          setAdjustingItem(null);
        }}
        onSubmit={handleAdjustmentSubmit}
        item={adjustingItem}
        isLoading={adjustMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingItem} onClose={() => setDeletingItem(null)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeletingItem(null)}>
            Delete Inventory Item
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete{" "}
              <span className="font-medium text-text-primary">
                {deletingItem?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeletingItem(null)}
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
