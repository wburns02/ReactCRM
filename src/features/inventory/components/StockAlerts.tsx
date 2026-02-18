import { Badge } from "@/components/ui/Badge.tsx";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import type { InventoryItem } from "@/api/types/inventory.ts";
import { getStockLevel } from "@/api/types/inventory.ts";

interface StockAlertsProps {
  items: InventoryItem[];
}

/**
 * Stock alerts component - shows low and out of stock warnings
 */
export function StockAlerts({ items }: StockAlertsProps) {
  const outOfStock = items.filter((item) => getStockLevel(item) === "out");
  const lowStock = items.filter((item) => getStockLevel(item) === "low");

  if (outOfStock.length === 0 && lowStock.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Out of Stock */}
      {outOfStock.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Badge variant="danger">Out of Stock</Badge>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-text-primary mb-2">
                  {outOfStock.length} item{outOfStock.length !== 1 ? "s" : ""}{" "}
                  out of stock
                </h4>
                <ul className="space-y-1">
                  {outOfStock.slice(0, 5).map((item) => (
                    <li key={item.id} className="text-sm text-text-secondary">
                      {item.name} ({item.category})
                    </li>
                  ))}
                  {outOfStock.length > 5 && (
                    <li className="text-sm text-text-muted">
                      +{outOfStock.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Badge variant="warning">Low Stock</Badge>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-text-primary mb-2">
                  {lowStock.length} item{lowStock.length !== 1 ? "s" : ""} below
                  reorder level
                </h4>
                <ul className="space-y-1">
                  {lowStock.slice(0, 5).map((item) => (
                    <li key={item.id} className="text-sm text-text-secondary">
                      {item.name}: {item.quantity_on_hand} left (reorder at{" "}
                      {item.reorder_level})
                    </li>
                  ))}
                  {lowStock.length > 5 && (
                    <li className="text-sm text-text-muted">
                      +{lowStock.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
