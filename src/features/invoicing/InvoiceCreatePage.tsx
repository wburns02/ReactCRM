import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";

interface LineItem {
  service: string;
  description?: string;
  quantity: number;
  rate: number;
}

/**
 * Invoice Create Page
 */
export function InvoiceCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [invoice, setInvoice] = useState({
    customer_id: "",
    due_date: "",
    notes: "",
    line_items: [
      { service: "", description: "", quantity: 1, rate: 0 },
    ] as LineItem[],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Prepare line items with calculated amount
      const preparedLineItems = invoice.line_items
        .filter((item) => item.service.trim() !== "") // Filter out empty items
        .map((item) => ({
          service: item.service,
          description: item.description || "",
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        }));

      // Validate we have at least one line item
      if (preparedLineItems.length === 0) {
        throw new Error(
          "At least one line item with a service name is required",
        );
      }

      // Prepare payload - convert empty strings to undefined
      const payload = {
        customer_id: String(invoice.customer_id),
        line_items: preparedLineItems,
        due_date: invoice.due_date || undefined,
        notes: invoice.notes || undefined,
        status: "draft",
      };

      const response = await apiClient.post("/invoices/", payload);
      return response.data;
    },
    onSuccess: (data) => {
      toastSuccess(
        "Invoice created",
        `Invoice #${data.invoice_number || data.id} created successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate(`/invoices/${data.id}`);
    },
    onError: (error: unknown) => {
      console.error("Invoice creation failed:", error);

      // Extract error details
      const err = error as {
        response?: { data?: { detail?: unknown } };
        message?: string;
      };

      if (err.response?.data?.detail) {
        const details = err.response.data.detail;
        if (Array.isArray(details)) {
          const messages = details
            .map((d: { msg?: string }) => d.msg || "Unknown error")
            .join(", ");
          toastError("Validation Error", messages);
        } else if (typeof details === "string") {
          toastError("Error", details);
        } else {
          toastError("Error", "Failed to create invoice");
        }
      } else if (err.message) {
        toastError("Error", err.message);
      } else {
        toastError("Error", "Failed to create invoice");
      }
    },
  });

  const addLineItem = () => {
    setInvoice({
      ...invoice,
      line_items: [
        ...invoice.line_items,
        { service: "", description: "", quantity: 1, rate: 0 },
      ],
    });
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    const items = [...invoice.line_items];
    items[index] = { ...items[index], [field]: value };
    setInvoice({ ...invoice, line_items: items });
  };

  const removeLineItem = (index: number) => {
    const items = invoice.line_items.filter((_, i) => i !== index);
    setInvoice({
      ...invoice,
      line_items: items.length
        ? items
        : [{ service: "", description: "", quantity: 1, rate: 0 }],
    });
  };

  const validateAndSubmit = () => {
    // Validate customer
    if (!invoice.customer_id) {
      toastError("Validation Error", "Please select a customer");
      return;
    }

    // Validate line items
    const validItems = invoice.line_items.filter(
      (item) => item.service.trim() !== "",
    );
    if (validItems.length === 0) {
      toastError(
        "Validation Error",
        "Add at least one line item with a service name",
      );
      return;
    }

    // Check for invalid quantities
    const invalidQty = validItems.some((item) => item.quantity <= 0);
    if (invalidQty) {
      toastError("Validation Error", "All quantities must be greater than 0");
      return;
    }

    createMutation.mutate();
  };

  const subtotal = invoice.line_items.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0,
  );
  const tax = subtotal * 0.0825; // 8.25% tax
  const total = subtotal + tax;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/invoices"
          className="text-text-muted hover:text-text-primary mb-2 inline-block"
        >
          &larr; Back to Invoices
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary">
          Create Invoice
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <h2 className="font-medium text-text-primary mb-4">Customer</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <CustomerCombobox
                  value={invoice.customer_id}
                  onChange={(customerId) =>
                    setInvoice({ ...invoice, customer_id: customerId })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoice.due_date}
                  onChange={(e) =>
                    setInvoice({ ...invoice, due_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-text-primary">Line Items</h2>
              <button
                onClick={addLineItem}
                className="text-sm text-primary hover:underline"
              >
                + Add Item
              </button>
            </div>

            {/* Line Items Header */}
            <div className="hidden md:flex gap-3 items-center mb-2 text-sm text-text-muted font-medium">
              <div className="flex-1">Service *</div>
              <div className="w-24 text-center">Qty *</div>
              <div className="w-32 text-center">Rate ($)</div>
              <div className="w-28 text-right">Amount</div>
              <div className="w-10"></div>
            </div>

            <div className="space-y-3">
              {invoice.line_items.map((item, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.service}
                      onChange={(e) =>
                        updateLineItem(index, "service", e.target.value)
                      }
                      placeholder="Service name"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-base"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Qty"
                      min="1"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-base text-center"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "rate",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="Rate"
                      step="0.01"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-base text-right"
                    />
                  </div>
                  <div className="w-28 py-2 text-right text-text-primary font-medium">
                    ${(item.quantity * item.rate).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeLineItem(index)}
                    className="text-danger hover:bg-danger/10 p-2 rounded text-xl leading-none"
                    title="Remove item"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <h2 className="font-medium text-text-primary mb-4">Notes</h2>
            <textarea
              value={invoice.notes}
              onChange={(e) =>
                setInvoice({ ...invoice, notes: e.target.value })
              }
              placeholder="Add any notes or terms..."
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-bg-card border border-border rounded-lg p-4 sticky top-6">
            <h2 className="font-medium text-text-primary mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Tax (8.25%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-text-primary border-t border-border pt-3">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={validateAndSubmit}
                disabled={createMutation.isPending}
                className="w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors"
              >
                {createMutation.isPending ? "Creating..." : "Create Invoice"}
              </button>
              <Link to="/invoices">
                <button className="w-full py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover transition-colors">
                  Cancel
                </button>
              </Link>
            </div>

            {/* Validation hints */}
            <div className="mt-4 text-xs text-text-muted">
              <p>* Required fields</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Select a customer</li>
                <li>Add at least one line item</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
