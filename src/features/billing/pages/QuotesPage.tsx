import { useState, useMemo } from "react";
import { useQuotes, useCreateQuote } from "@/api/hooks/useQuotes";
import { useCustomers } from "@/api/hooks/useCustomers";
import { Link } from "react-router-dom";
import type { QuoteStatus } from "@/api/types/quote";
import { QUOTE_STATUS_META } from "@/api/types/quote";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-yellow-100 text-yellow-700",
  invoiced: "bg-purple-100 text-purple-700",
};

export function QuotesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuotes({ page, page_size: 20, status: statusFilter || undefined });

  const quotes = data?.items || [];
  const total = data?.total || 0;

  // Filter by search client-side
  const filteredQuotes = useMemo(() => {
    if (!search.trim()) return quotes;
    const q = search.toLowerCase();
    return quotes.filter(
      (quote) =>
        (quote.quote_number || "").toLowerCase().includes(q) ||
        (quote.customer_name || "").toLowerCase().includes(q)
    );
  }, [quotes, search]);

  // KPI calculations
  const kpis = useMemo(() => {
    const all = data?.items || [];
    const totalValue = all.reduce((sum, q) => sum + (q.total || 0), 0);
    const draftCount = all.filter((q) => q.status === "draft").length;
    const acceptedCount = all.filter((q) => q.status === "accepted").length;
    const sentCount = all.filter((q) => q.status === "sent").length;
    return { totalValue, draftCount, acceptedCount, sentCount };
  }, [data?.items]);

  return (
    <div className="p-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-500 mt-1">{total} total quotes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm flex items-center gap-2"
        >
          <span>+</span> New Quote
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-gray-900">
            ${kpis.totalValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Draft</p>
          <p className="text-2xl font-bold text-gray-600">{kpis.draftCount}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Sent</p>
          <p className="text-2xl font-bold text-blue-600">{kpis.sentCount}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Accepted</p>
          <p className="text-2xl font-bold text-green-600">{kpis.acceptedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by quote # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Statuses</option>
          {(Object.keys(QUOTE_STATUS_META) as QuoteStatus[]).map((s) => (
            <option key={s} value={s}>{QUOTE_STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {search || statusFilter ? "No matching quotes" : "No Quotes Yet"}
          </h3>
          <p className="text-gray-500">
            {search || statusFilter
              ? "Try adjusting your filters."
              : "Click \"+ New Quote\" to create your first quote."}
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Quote #</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    <Link to={`/quotes/${quote.id}`}>{quote.quote_number || quote.id.slice(0, 8)}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{quote.customer_name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    ${(quote.total || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[quote.status] || "bg-gray-100"}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > 20 && (
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= total}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Quote Modal */}
      {showCreate && (
        <CreateQuoteModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

/* ─── Create Quote Modal ─── */

function CreateQuoteModal({ onClose }: { onClose: () => void }) {
  const createQuote = useCreateQuote();
  const { data: customerData } = useCustomers({ page_size: 200 });
  const customers = customerData?.items || customerData?.customers || [];

  const [customerId, setCustomerId] = useState("");
  const [lineItems, setLineItems] = useState([
    { service: "", description: "", quantity: 1, rate: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(8.25);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.rate, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  function addLineItem() {
    setLineItems((prev) => [...prev, { service: "", description: "", quantity: 1, rate: 0 }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: string, value: string | number) {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, [field]: value } : li))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return;
    if (lineItems.some((li) => !li.service || li.rate <= 0)) return;

    try {
      await createQuote.mutateAsync({
        customer_id: customerId,
        status: "draft",
        line_items: lineItems,
        tax_rate: taxRate,
        notes: notes || undefined,
        valid_until: validUntil || undefined,
      });
      onClose();
    } catch {
      // error handled by mutation onError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">New Quote</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select a customer...</option>
              {(customers as Array<{ id: string; first_name: string; last_name: string }>).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Line Items *</label>
            <div className="space-y-3">
              {lineItems.map((li, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Service"
                    value={li.service}
                    onChange={(e) => updateLineItem(i, "service", e.target.value)}
                    required
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={li.quantity}
                    onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))}
                    min={0.01}
                    step="any"
                    required
                    className="w-20 border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={li.rate || ""}
                    onChange={(e) => updateLineItem(i, "rate", Number(e.target.value))}
                    min={0}
                    step="0.01"
                    required
                    className="w-28 border rounded-lg px-3 py-2 text-sm"
                  />
                  <span className="w-20 py-2 text-sm text-right text-gray-600">
                    ${(li.quantity * li.rate).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLineItem(i)}
                    disabled={lineItems.length === 1}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              + Add Line Item
            </button>
          </div>

          {/* Tax & Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                min={0}
                max={100}
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Optional notes for this quote..."
            />
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Tax ({taxRate}%)</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createQuote.isPending || !customerId}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {createQuote.isPending ? "Creating..." : "Create Quote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
