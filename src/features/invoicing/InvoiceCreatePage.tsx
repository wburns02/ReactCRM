import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface LineItem {
  description: string;
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
    customer_id: '',
    customer_name: '',
    due_date: '',
    notes: '',
    line_items: [{ description: '', quantity: 1, rate: 0 }] as LineItem[],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/invoices', invoice);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate(`/invoices/${data.id}`);
    },
  });

  const addLineItem = () => {
    setInvoice({
      ...invoice,
      line_items: [...invoice.line_items, { description: '', quantity: 1, rate: 0 }],
    });
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const items = [...invoice.line_items];
    items[index] = { ...items[index], [field]: value };
    setInvoice({ ...invoice, line_items: items });
  };

  const removeLineItem = (index: number) => {
    const items = invoice.line_items.filter((_, i) => i !== index);
    setInvoice({ ...invoice, line_items: items.length ? items : [{ description: '', quantity: 1, rate: 0 }] });
  };

  const subtotal = invoice.line_items.reduce(
    (sum, item) => sum + (item.quantity * item.rate),
    0
  );
  const tax = subtotal * 0.0825; // 8.25% tax
  const total = subtotal + tax;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/invoices" className="text-text-muted hover:text-text-primary mb-2 inline-block">
          &larr; Back to Invoices
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary">Create Invoice</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <h2 className="font-medium text-text-primary mb-4">Customer</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">Customer Name</label>
                <input
                  type="text"
                  value={invoice.customer_name}
                  onChange={(e) => setInvoice({ ...invoice, customer_name: e.target.value })}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Due Date</label>
                <input
                  type="date"
                  value={invoice.due_date}
                  onChange={(e) => setInvoice({ ...invoice, due_date: e.target.value })}
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

            <div className="space-y-3">
              {invoice.line_items.map((item, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-sm"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      min="1"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      placeholder="Rate"
                      step="0.01"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-body text-text-primary text-sm"
                    />
                  </div>
                  <div className="w-24 py-2 text-right text-text-primary">
                    ${(item.quantity * item.rate).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeLineItem(index)}
                    className="text-danger hover:bg-danger/10 p-2 rounded"
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
              onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
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
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !invoice.customer_name}
                className="w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </button>
              <button className="w-full py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover">
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
