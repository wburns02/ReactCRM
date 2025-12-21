import { useState } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Textarea } from '@/components/ui/Textarea.tsx';
import { formatCurrency } from '@/lib/utils.ts';
import type { LineItemFormData } from '@/api/types/invoice.ts';

interface LineItemsTableProps {
  lineItems: LineItemFormData[];
  onChange: (lineItems: LineItemFormData[]) => void;
  readOnly?: boolean;
}

/**
 * Editable line items table component
 */
export function LineItemsTable({ lineItems, onChange, readOnly = false }: LineItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddItem = () => {
    const newItem: LineItemFormData = {
      service: '',
      description: '',
      quantity: 1,
      rate: 0,
    };
    onChange([...lineItems, newItem]);
    setEditingIndex(lineItems.length);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index);
    onChange(newItems);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleUpdateItem = (index: number, field: keyof LineItemFormData, value: string | number) => {
    const newItems = [...lineItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    onChange(newItems);
  };

  const calculateAmount = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + calculateAmount(item.quantity, item.rate),
    0
  );

  if (readOnly && lineItems.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        No line items
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider w-24">
                Qty
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider w-32">
                Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider w-32">
                Amount
              </th>
              {!readOnly && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider w-20">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {lineItems.map((item, index) => (
              <tr key={index} className="hover:bg-bg-hover">
                <td className="px-4 py-3">
                  {readOnly ? (
                    <span className="text-text-primary font-medium">{item.service}</span>
                  ) : (
                    <Input
                      value={item.service}
                      onChange={(e) => handleUpdateItem(index, 'service', e.target.value)}
                      placeholder="Service name"
                      className="min-w-[150px]"
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  {readOnly ? (
                    <span className="text-text-secondary text-sm">{item.description || '-'}</span>
                  ) : (
                    <Textarea
                      value={item.description || ''}
                      onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                      placeholder="Optional description"
                      rows={1}
                      className="min-w-[200px]"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {readOnly ? (
                    <span className="text-text-primary">{item.quantity}</span>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {readOnly ? (
                    <span className="text-text-primary">{formatCurrency(item.rate)}</span>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => handleUpdateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium text-text-primary">
                    {formatCurrency(calculateAmount(item.quantity, item.rate))}
                  </span>
                </td>
                {!readOnly && (
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="text-danger hover:text-danger"
                    >
                      Remove
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td colSpan={readOnly ? 4 : 5} className="px-4 py-3 text-right font-semibold text-text-primary">
                Subtotal
              </td>
              <td className="px-4 py-3 text-right font-semibold text-text-primary">
                {formatCurrency(subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={handleAddItem}>
            + Add Line Item
          </Button>
        </div>
      )}
    </div>
  );
}
