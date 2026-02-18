import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { useIsMobileOrTablet } from "@/hooks/useMediaQuery";
import type { InventoryItem } from "@/api/types/inventory.ts";
import { getStockLevel, getStockLevelLabel } from "@/api/types/inventory.ts";

interface InventoryListProps {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (item: InventoryItem) => void;
  onAdjust?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
}

/**
 * Inventory data table with pagination
 */
export function InventoryList({
  items,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onAdjust,
  onDelete,
}: InventoryListProps) {
  const isMobile = useIsMobileOrTablet();
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No inventory items found
        </h3>
        <p className="text-text-secondary">
          Try adjusting your filters or add new items.
        </p>
      </div>
    );
  }

  const getStockBadge = (item: InventoryItem) => {
    const level = getStockLevel(item);
    const variantMap = {
      out: "danger",
      low: "warning",
      ok: "success",
    } as const;

    return (
      <Badge variant={variantMap[level]}>{getStockLevelLabel(level)}</Badge>
    );
  };

  return (
    <div>
      {isMobile ? (
        /* Mobile card view */
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="bg-bg-card border border-border rounded-xl p-4 touch-manipulation"
              aria-label={`Inventory: ${item.name}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-text-primary">{item.name}</h3>
                  <p className="text-sm text-text-secondary">{item.category}</p>
                  {item.sku && <p className="text-xs text-text-muted font-mono">SKU: {item.sku}</p>}
                </div>
                {getStockBadge(item)}
              </div>
              <div className="flex items-center gap-4 text-sm mb-3">
                <span>
                  <span className="text-text-secondary">Qty: </span>
                  <span className={`font-medium ${getStockLevel(item) === "out" ? "text-danger" : getStockLevel(item) === "low" ? "text-warning" : "text-text-primary"}`}>
                    {item.quantity_on_hand}
                  </span>
                </span>
                <span className="text-text-secondary">Reorder: {item.reorder_level}</span>
                <span className="text-text-secondary">${(item.unit_price ?? 0).toFixed(2)}/unit</span>
              </div>
              {item.warehouse_location && <p className="text-xs text-text-muted mb-3">{item.warehouse_location}</p>}
              <div className="flex gap-2">
                {onAdjust && (
                  <Button variant="primary" size="sm" onClick={() => onAdjust(item)}>Adjust</Button>
                )}
                {onEdit && (
                  <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>Edit</Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={() => onDelete(item)} className="text-danger hover:text-danger ml-auto">Delete</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
      /* Desktop Table */
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Inventory list">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Item Name
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                SKU
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Category
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Quantity
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Reorder Level
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Unit Price
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-bg-hover transition-colors"
                tabIndex={0}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-text-primary">{item.name}</p>
                    {item.warehouse_location && (
                      <p className="text-xs text-text-muted">{item.warehouse_location}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {item.sku || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {item.category}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-medium ${
                      getStockLevel(item) === "out"
                        ? "text-danger"
                        : getStockLevel(item) === "low"
                          ? "text-warning"
                          : "text-text-primary"
                    }`}
                  >
                    {item.quantity_on_hand}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary">
                  {item.reorder_level}
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary">
                  ${(item.unit_price ?? 0).toFixed(2)}
                </td>
                <td className="px-4 py-3">{getStockBadge(item)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {onAdjust && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdjust(item)}
                        aria-label={"Adjust quantity for " + item.name}
                      >
                        Adjust
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        aria-label={"Edit " + item.name}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item)}
                        aria-label={"Delete " + item.name}
                        className="text-danger hover:text-danger"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-text-secondary">
          Showing {startItem} to {endItem} of {total} items
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for table
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-bg-muted mb-2" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-bg-hover mb-1" />
      ))}
    </div>
  );
}
