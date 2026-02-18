import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Inventory item schema - validates API responses
 * Matches backend inventory_to_response() exactly
 */
export const inventoryItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  cost_price: z.number().nullable().optional(),
  markup_percent: z.number().nullable().optional(),
  quantity_on_hand: z.number().default(0),
  quantity_reserved: z.number().default(0),
  quantity_available: z.number().default(0),
  reorder_level: z.number().default(0),
  reorder_quantity: z.number().nullable().optional(),
  needs_reorder: z.boolean().default(false),
  unit: z.string().default("each"),
  supplier_name: z.string().nullable().optional(),
  supplier_sku: z.string().nullable().optional(),
  supplier_phone: z.string().nullable().optional(),
  warehouse_location: z.string().nullable().optional(),
  vehicle_id: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  is_taxable: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
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
 * Field names match backend InventoryItemCreate schema
 */
export const inventoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  quantity_on_hand: z.coerce.number().min(0, "Quantity must be 0 or greater"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be 0 or greater"),
  unit_price: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  cost_price: z.coerce.number().min(0).optional(),
  supplier_name: z.string().optional(),
  warehouse_location: z.string().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

export type InventoryFormData = z.infer<typeof inventoryFormSchema>;

/**
 * Inventory adjustment request
 * Backend expects: { adjustment: number, reason?: string }
 */
export const inventoryAdjustmentSchema = z.object({
  adjustment: z.coerce.number(),
  reason: z.string().optional(),
});

export type InventoryAdjustmentData = z.infer<typeof inventoryAdjustmentSchema>;

/**
 * Stock level helpers
 */
export function getStockLevel(item: InventoryItem): "out" | "low" | "ok" {
  if (item.quantity_on_hand === 0) return "out";
  if (item.quantity_on_hand <= item.reorder_level) return "low";
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
