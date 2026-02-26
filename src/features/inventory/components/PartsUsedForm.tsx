import { useState, useEffect } from "react";
import { apiClient } from "@/api/client";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  quantity_available: number;
  unit_price: number;
}

interface PartUsed {
  item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface Props {
  workOrderId: string;
  onPartsChanged?: (parts: PartUsed[]) => void;
}

export function PartsUsedForm({ workOrderId, onPartsChanged }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [parts, setParts] = useState<PartUsed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get("/inventory", { params: { page_size: 100, is_active: true } });
        setInventory(res.data.items || []);
      } catch {
        // Inventory not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addPart = (item: InventoryItem) => {
    const existing = parts.find((p) => p.item_id === item.id);
    if (existing) {
      const updated = parts.map((p) =>
        p.item_id === item.id ? { ...p, quantity: p.quantity + 1 } : p
      );
      setParts(updated);
      onPartsChanged?.(updated);
    } else {
      const updated = [...parts, { item_id: item.id, name: item.name, quantity: 1, unit_price: item.unit_price }];
      setParts(updated);
      onPartsChanged?.(updated);
    }
  };

  const removePart = (itemId: string) => {
    const updated = parts.filter((p) => p.item_id !== itemId);
    setParts(updated);
    onPartsChanged?.(updated);
  };

  const updateQty = (itemId: string, qty: number) => {
    if (qty <= 0) return removePart(itemId);
    const updated = parts.map((p) => (p.item_id === itemId ? { ...p, quantity: qty } : p));
    setParts(updated);
    onPartsChanged?.(updated);
  };

  const deductParts = async () => {
    for (const part of parts) {
      try {
        await apiClient.post(`/inventory/${part.item_id}/adjust`, {
          quantity_change: -part.quantity,
          reason: `Used on work order`,
          reference_type: "work_order",
          reference_id: workOrderId,
        });
      } catch (e) {
        console.error(`Failed to deduct ${part.name}:`, e);
      }
    }
  };

  const total = parts.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);

  if (loading) return <div className="animate-pulse h-16 bg-gray-100 rounded" />;

  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">Parts Used</h4>

      {/* Selected Parts */}
      {parts.length > 0 && (
        <div className="space-y-2 mb-3">
          {parts.map((part) => (
            <div key={part.item_id} className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm">
              <span className="font-medium">{part.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(part.item_id, part.quantity - 1)} className="px-2 py-0.5 bg-gray-200 rounded">-</button>
                <span className="w-8 text-center">{part.quantity}</span>
                <button onClick={() => updateQty(part.item_id, part.quantity + 1)} className="px-2 py-0.5 bg-gray-200 rounded">+</button>
                <span className="text-gray-500 w-16 text-right">${(part.quantity * part.unit_price).toFixed(2)}</span>
                <button onClick={() => removePart(part.item_id)} className="text-red-500 ml-1">&times;</button>
              </div>
            </div>
          ))}
          <div className="flex justify-between font-medium pt-2 border-t">
            <span>Total Parts</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Add Part Dropdown */}
      <select
        className="w-full border rounded p-2 text-sm"
        value=""
        onChange={(e) => {
          const item = inventory.find((i) => i.id === e.target.value);
          if (item) addPart(item);
        }}
      >
        <option value="">+ Add part from inventory...</option>
        {inventory
          .filter((i) => i.quantity_available > 0)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.quantity_available} avail) — ${item.unit_price}
            </option>
          ))}
      </select>

      {parts.length > 0 && (
        <button
          onClick={deductParts}
          className="mt-3 w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          Deduct Parts from Inventory
        </button>
      )}
    </div>
  );
}
