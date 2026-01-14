import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Inventory item schema - validates API responses
 */
export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  category: z.string(),
  quantity: z.number(),
  reorder_level: z.number(),
  unit_cost: z.number(),
  supplier: z.string().nullable(),
  location: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

/**
 * Paginated inventory list response
 */
export const inventoryListResponseSchema =
  paginatedResponseSchema(inventoryItemSchema);
export type InventoryListResponse = z.infer<typeof inventoryListResponseSchema>;

/**
 * Inventory filters for list queries
 */
export interface InventoryFilters {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  low_stock?: boolean;
}

/**
 * Create/update inventory item request
 */
export const inventoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(0, "Quantity must be 0 or greater"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be 0 or greater"),
  unit_cost: z.coerce.number().min(0, "Unit cost must be 0 or greater"),
  supplier: z.string().optional(),
  location: z.string().optional(),
});

export type InventoryFormData = z.infer<typeof inventoryFormSchema>;

/**
 * Inventory adjustment request
 */
export const inventoryAdjustmentSchema = z.object({
  quantity_change: z.coerce.number(),
  reason: z.string().optional(),
});

export type InventoryAdjustmentData = z.infer<typeof inventoryAdjustmentSchema>;

/**
 * Stock level helpers
 */
export function getStockLevel(item: InventoryItem): "out" | "low" | "ok" {
  if (item.quantity === 0) return "out";
  if (item.quantity <= item.reorder_level) return "low";
  return "ok";
}

export function getStockLevelLabel(level: "out" | "low" | "ok"): string {
  const labels = {
    out: "Out of Stock",
    low: "Low Stock",
    ok: "In Stock",
  };
  return labels[level];
}
