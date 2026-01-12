import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  inventoryAdjustmentSchema,
  type InventoryAdjustmentData,
  type InventoryItem,
} from "@/api/types/inventory.ts";

export interface InventoryAdjustmentProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryAdjustmentData) => Promise<void>;
  item: InventoryItem | null;
  isLoading?: boolean;
}

/**
 * Inventory adjustment modal - add or remove quantity
 */
export function InventoryAdjustment({
  open,
  onClose,
  onSubmit,
  item,
  isLoading,
}: InventoryAdjustmentProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<InventoryAdjustmentData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(inventoryAdjustmentSchema) as any,
    defaultValues: {
      quantity_change: 0,
      reason: "",
    },
  });

  const quantityChange = watch("quantity_change");
  const newQuantity = item ? item.quantity + (Number(quantityChange) || 0) : 0;

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: InventoryAdjustmentData) => {
    await onSubmit(data);
    handleClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="sm">
        <DialogHeader onClose={handleClose}>
          Adjust Inventory: {item.name}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-4">
            <div className="bg-bg-muted rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">
                  Current Quantity
                </span>
                <span className="text-lg font-semibold text-text-primary">
                  {item.quantity}
                </span>
              </div>
              {quantityChange !== 0 && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-text-secondary">
                      Adjustment
                    </span>
                    <span
                      className={`text-lg font-semibold ${
                        quantityChange > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {quantityChange > 0 ? "+" : ""}
                      {quantityChange}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm font-medium text-text-secondary">
                      New Quantity
                    </span>
                    <span className="text-lg font-semibold text-text-primary">
                      {newQuantity}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_change" required>
                Quantity Change
              </Label>
              <Input
                id="quantity_change"
                type="number"
                {...register("quantity_change")}
                error={!!errors.quantity_change}
                placeholder="Enter positive to add, negative to remove"
              />
              {errors.quantity_change && (
                <p className="text-sm text-danger">
                  {errors.quantity_change.message}
                </p>
              )}
              <p className="text-xs text-text-muted">
                Use positive numbers to add inventory, negative to remove
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                {...register("reason")}
                placeholder="e.g., Received shipment, Damaged goods, etc."
                rows={3}
              />
            </div>

            {newQuantity < 0 && (
              <div className="bg-danger-light border border-danger rounded-lg p-3">
                <p className="text-sm text-danger font-medium">
                  Warning: New quantity cannot be negative
                </p>
              </div>
            )}
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
            <Button
              type="submit"
              disabled={isLoading || newQuantity < 0 || quantityChange === 0}
            >
              {isLoading ? "Adjusting..." : "Adjust Inventory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
