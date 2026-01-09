/**
 * PriceCalculator Component
 *
 * Line items editor with running totals, tax calculation, and discount support.
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { cn } from '@/lib/utils.ts';
import {
  type PricingLineItem,
  type Discount,
  SERVICE_PRICES,
  calculateInvoiceTotals,
  formatCurrency,
  generateLineItemId,
  getTaxRate,
} from './utils/pricingEngine.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface PriceCalculatorProps {
  /** Initial line items */
  initialItems?: PricingLineItem[];
  /** State code for tax calculation */
  stateCode?: string;
  /** Custom tax rate (overrides state lookup) */
  taxRate?: number;
  /** Applied discount */
  discount?: Discount | null;
  /** Callback when items change */
  onItemsChange?: (items: PricingLineItem[]) => void;
  /** Callback when totals change */
  onTotalsChange?: (totals: {
    subtotal: number;
    tax: number;
    discountAmount: number;
    total: number;
  }) => void;
  /** Whether the calculator is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PriceCalculator({
  initialItems = [],
  stateCode = 'TX',
  taxRate: customTaxRate,
  discount,
  onItemsChange,
  onTotalsChange,
  readOnly = false,
  className,
}: PriceCalculatorProps) {
  const [items, setItems] = useState<PricingLineItem[]>(() => {
    if (initialItems.length > 0) return initialItems;
    // Start with one empty line item
    return [
      {
        id: generateLineItemId(),
        service: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxable: true,
      },
    ];
  });

  // Calculate tax rate
  const taxRate = customTaxRate ?? getTaxRate(stateCode);

  // Calculate totals whenever items or discount changes
  const totals = useMemo(() => {
    const result = calculateInvoiceTotals(items.filter((i) => i.service), taxRate, discount ?? undefined);
    return result;
  }, [items, taxRate, discount]);

  // Notify parent of changes
  const notifyChanges = useCallback(
    (newItems: PricingLineItem[]) => {
      onItemsChange?.(newItems.filter((i) => i.service));
      const newTotals = calculateInvoiceTotals(newItems.filter((i) => i.service), taxRate, discount ?? undefined);
      onTotalsChange?.({
        subtotal: newTotals.subtotal,
        tax: newTotals.tax,
        discountAmount: newTotals.discountAmount,
        total: newTotals.total,
      });
    },
    [onItemsChange, onTotalsChange, taxRate, discount]
  );

  // Update a specific item
  const updateItem = (id: string, updates: Partial<PricingLineItem>) => {
    const newItems = items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };

        // Auto-populate price when service is selected
        if (updates.service && SERVICE_PRICES[updates.service]) {
          updatedItem.unitPrice = SERVICE_PRICES[updates.service].basePrice;
          updatedItem.description = SERVICE_PRICES[updates.service].name;
        }

        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
    notifyChanges(newItems);
  };

  // Add new line item
  const addItem = () => {
    const newItems = [
      ...items,
      {
        id: generateLineItemId(),
        service: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxable: true,
      },
    ];
    setItems(newItems);
  };

  // Remove line item
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    notifyChanges(newItems);
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <line x1="2" y1="9" x2="22" y2="9" />
            <line x1="6" y1="6" x2="6" y2="6.01" />
            <line x1="10" y1="6" x2="10" y2="6.01" />
            <line x1="14" y1="6" x2="14" y2="6.01" />
          </svg>
          Price Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Line Items */}
        <div className="space-y-4">
          {/* Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-2 text-sm font-medium text-text-secondary px-2">
            <div className="col-span-3">Service</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items */}
          {items.map((item, _index) => (
            <div
              key={item.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 bg-bg-hover/30 rounded-lg"
            >
              {/* Service Select */}
              <div className="md:col-span-3">
                <Label className="md:hidden text-xs text-text-muted">Service</Label>
                <Select
                  value={item.service}
                  onChange={(e) => updateItem(item.id, { service: e.target.value })}
                  disabled={readOnly}
                  className="w-full"
                >
                  <option value="">Select service...</option>
                  {Object.entries(SERVICE_PRICES).map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.name}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </Select>
              </div>

              {/* Description */}
              <div className="md:col-span-4">
                <Label className="md:hidden text-xs text-text-muted">Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  placeholder="Service description"
                  disabled={readOnly}
                  className="w-full"
                />
              </div>

              {/* Quantity */}
              <div className="md:col-span-1">
                <Label className="md:hidden text-xs text-text-muted">Quantity</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                  disabled={readOnly}
                  className="w-full text-center"
                />
              </div>

              {/* Unit Price */}
              <div className="md:col-span-2">
                <Label className="md:hidden text-xs text-text-muted">Unit Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                    disabled={readOnly}
                    className="w-full pl-7 text-right"
                  />
                </div>
              </div>

              {/* Line Total */}
              <div className="md:col-span-1 text-right font-medium">
                <Label className="md:hidden text-xs text-text-muted">Total</Label>
                {formatCurrency(item.quantity * item.unitPrice)}
              </div>

              {/* Remove Button */}
              <div className="md:col-span-1 flex justify-end">
                {!readOnly && items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-text-muted hover:text-danger"
                    aria-label="Remove line item"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </Button>
                )}
              </div>

              {/* Taxable Toggle */}
              <div className="md:col-span-12 flex items-center gap-2 px-2 pb-1">
                <input
                  type="checkbox"
                  id={`taxable-${item.id}`}
                  checked={item.taxable}
                  onChange={(e) => updateItem(item.id, { taxable: e.target.checked })}
                  disabled={readOnly}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor={`taxable-${item.id}`} className="text-sm text-text-secondary">
                  Taxable
                </label>
              </div>
            </div>
          ))}

          {/* Add Item Button */}
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addItem} className="w-full md:w-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Line Item
            </Button>
          )}
        </div>

        {/* Totals Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="max-w-xs ml-auto space-y-2">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>

            {/* Discount (if applied) */}
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Discount ({discount?.description})</span>
                <span>-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}

            {/* Tax */}
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                Tax ({(taxRate * 100).toFixed(2)}%)
              </span>
              <span className="font-medium">{formatCurrency(totals.tax)}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PriceCalculator;
