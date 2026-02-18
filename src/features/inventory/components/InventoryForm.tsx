import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  inventoryFormSchema,
  type InventoryFormData,
  type InventoryItem,
} from "@/api/types/inventory.ts";

export interface InventoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryFormData) => Promise<void>;
  item?: InventoryItem | null;
  isLoading?: boolean;
}

const INVENTORY_CATEGORIES = [
  "Chemicals",
  "Parts",
  "Tools",
  "Safety Equipment",
  "Office Supplies",
  "Vehicle Supplies",
  "Other",
];

/**
 * Inventory item create/edit form modal
 */
export function InventoryForm({
  open,
  onClose,
  onSubmit,
  item,
  isLoading,
}: InventoryFormProps) {
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<InventoryFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(inventoryFormSchema) as any,
    defaultValues: item
      ? {
          name: item.name,
          sku: item.sku || "",
          category: item.category ?? "",
          quantity_on_hand: item.quantity_on_hand,
          reorder_level: item.reorder_level,
          unit_price: item.unit_price ?? 0,
          supplier_name: item.supplier_name || "",
          warehouse_location: item.warehouse_location || "",
        }
      : {
          name: "",
          sku: "",
          category: "",
          quantity_on_hand: 0,
          reorder_level: 0,
          unit_price: 0,
          supplier_name: "",
          warehouse_location: "",
        },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: InventoryFormData) => {
    const cleanedData: InventoryFormData = {
      ...data,
      sku: data.sku || undefined,
      supplier_name: data.supplier_name || undefined,
      warehouse_location: data.warehouse_location || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="md">
        <DialogHeader onClose={handleClose}>
          {isEdit ? "Edit Inventory Item" : "Add New Inventory Item"}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Basic Info Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name" required>
                  Item Name
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  error={!!errors.name}
                  placeholder="e.g., Septic Tank Cleaner"
                />
                {errors.name && (
                  <p className="text-sm text-danger">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...register("sku")} placeholder="SKU-001" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" required>
                  Category
                </Label>
                <Select
                  id="category"
                  {...register("category")}
                  error={!!errors.category}
                >
                  <option value="">Select category...</option>
                  {INVENTORY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
                {errors.category && (
                  <p className="text-sm text-danger">
                    {errors.category.message}
                  </p>
                )}
              </div>
            </div>

            {/* Quantity Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Stock Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity_on_hand" required>
                    Current Quantity
                  </Label>
                  <Input
                    id="quantity_on_hand"
                    type="number"
                    min="0"
                    {...register("quantity_on_hand")}
                    error={!!errors.quantity_on_hand}
                    placeholder="0"
                  />
                  {errors.quantity_on_hand && (
                    <p className="text-sm text-danger">
                      {errors.quantity_on_hand.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_level" required>
                    Reorder Level
                  </Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    min="0"
                    {...register("reorder_level")}
                    error={!!errors.reorder_level}
                    placeholder="10"
                  />
                  {errors.reorder_level && (
                    <p className="text-sm text-danger">
                      {errors.reorder_level.message}
                    </p>
                  )}
                  <p className="text-xs text-text-muted">
                    Alert when stock falls to this level
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price" required>
                    Unit Price ($)
                  </Label>
                  <Input
                    id="unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("unit_price")}
                    error={!!errors.unit_price}
                    placeholder="0.00"
                  />
                  {errors.unit_price && (
                    <p className="text-sm text-danger">
                      {errors.unit_price.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Supplier & Location Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Supplier & Location
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Supplier</Label>
                  <Input
                    id="supplier_name"
                    {...register("supplier_name")}
                    placeholder="ABC Supplies Inc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warehouse_location">Storage Location</Label>
                  <Input
                    id="warehouse_location"
                    {...register("warehouse_location")}
                    placeholder="Warehouse A - Shelf 3"
                  />
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
