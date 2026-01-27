import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomerSelect } from "@/features/workorders/components/CustomerSelect";
import { useCreateQuote } from "@/api/hooks/useQuotes";
import { toastSuccess, toastError } from "@/components/ui/Toast";

interface LineItemInput {
  service: string;
  description: string;
  quantity: number;
  rate: number;
}

interface CreateEstimateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal for creating new estimates/quotes
 */
export function CreateEstimateModal({
  open,
  onClose,
  onSuccess,
}: CreateEstimateModalProps) {
  const [customerId, setCustomerId] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { service: "", description: "", quantity: 1, rate: 0 },
  ]);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");

  const createQuote = useCreateQuote();

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { service: "", description: "", quantity: 1, rate: 0 },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemInput,
    value: string | number
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const resetForm = () => {
    setCustomerId("");
    setLineItems([{ service: "", description: "", quantity: 1, rate: 0 }]);
    setTaxRate(0);
    setNotes("");
    setValidUntil("");
  };

  const handleSubmit = async () => {
    // Validate customer
    if (!customerId) {
      toastError("Validation Error", "Please select a customer");
      return;
    }

    // Validate line items
    const validLineItems = lineItems.filter((item) => item.service.trim());
    if (validLineItems.length === 0) {
      toastError("Validation Error", "Please add at least one line item");
      return;
    }

    try {
      await createQuote.mutateAsync({
        customer_id: parseInt(customerId, 10),
        status: "draft",
        line_items: validLineItems.map((item) => ({
          service: item.service,
          description: item.description || undefined,
          quantity: item.quantity,
          rate: item.rate,
        })),
        tax_rate: taxRate,
        valid_until: validUntil || undefined,
        notes: notes || undefined,
      });

      toastSuccess("Estimate Created", "The estimate has been created successfully");
      resetForm();
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error("Failed to create estimate:", error);

      // Extract error message from 422 response
      let errorMessage = "Failed to create estimate. Please try again.";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { detail?: string | Array<{ msg: string }> } } };
        const detail = axiosError.response?.data?.detail;
        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          errorMessage = detail.map((d) => d.msg).join(", ");
        }
      }

      toastError("Error", errorMessage);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="lg">
        <DialogHeader onClose={onClose}>Create New Estimate</DialogHeader>
        <DialogBody className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Customer *
            </label>
            <CustomerSelect
              value={customerId}
              onChange={setCustomerId}
              disabled={createQuote.isPending}
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-secondary">
                Line Items *
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddLineItem}
                disabled={createQuote.isPending}
              >
                + Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start p-3 bg-bg-muted rounded-lg"
                >
                  <div className="col-span-4">
                    <Input
                      placeholder="Service"
                      value={item.service}
                      onChange={(e) =>
                        handleLineItemChange(index, "service", e.target.value)
                      }
                      disabled={createQuote.isPending}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        handleLineItemChange(index, "description", e.target.value)
                      }
                      disabled={createQuote.isPending}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      min={0.01}
                      step={0.01}
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(
                          index,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={createQuote.isPending}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Rate"
                      min={0}
                      step={0.01}
                      value={item.rate}
                      onChange={(e) =>
                        handleLineItemChange(
                          index,
                          "rate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={createQuote.isPending}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        className="text-danger hover:text-danger/80 p-1"
                        disabled={createQuote.isPending}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="col-span-12 text-right text-sm text-text-muted">
                    Line total: ${(item.quantity * item.rate).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Tax Rate (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                disabled={createQuote.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Valid Until
              </label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={createQuote.isPending}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Notes
            </label>
            <textarea
              className="w-full px-3 py-2 bg-bg-muted border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={createQuote.isPending}
            />
          </div>

          {/* Totals */}
          <div className="bg-bg-hover p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Subtotal:</span>
              <span className="text-text-primary font-medium">
                ${calculateSubtotal().toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Tax ({taxRate}%):</span>
              <span className="text-text-primary font-medium">
                ${calculateTax().toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
              <span className="text-text-primary">Total:</span>
              <span className="text-primary">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={createQuote.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={createQuote.isPending}
          >
            {createQuote.isPending ? "Creating..." : "Create Estimate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateEstimateModal;
