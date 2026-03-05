import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuote, useDeleteQuote, useConvertQuoteToInvoice, useSendQuote } from "@/api/hooks/useQuotes";
import { QUOTE_STATUS_META } from "@/api/types/quote";
import { toastSuccess, toastError } from "@/components/ui/Toast";

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading, error } = useQuote(id);
  const deleteQuote = useDeleteQuote();
  const convertToInvoice = useConvertQuoteToInvoice();
  const sendQuote = useSendQuote();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-100 rounded w-48" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-6">
        <Link to="/quotes" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Quotes</Link>
        <div className="bg-white border rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Quote Not Found</h3>
          <p className="text-gray-500">The requested quote could not be loaded.</p>
        </div>
      </div>
    );
  }

  const statusMeta = QUOTE_STATUS_META[quote.status as keyof typeof QUOTE_STATUS_META] || {
    label: quote.status,
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
  };

  const customerName = quote.customer
    ? `${quote.customer.first_name} ${quote.customer.last_name}`
    : quote.customer_name || "Unknown Customer";

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this quote?")) return;
    try {
      await deleteQuote.mutateAsync(quote.id);
      toastSuccess("Quote deleted");
      navigate("/quotes");
    } catch {
      toastError("Failed to delete quote");
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const result = await convertToInvoice.mutateAsync(quote.id);
      toastSuccess("Quote converted to invoice");
      navigate(`/invoices/${result.invoice_id}`);
    } catch {
      toastError("Failed to convert to invoice");
    }
  };

  const handleSend = async () => {
    try {
      await sendQuote.mutateAsync(quote.id);
      toastSuccess("Quote sent to customer");
    } catch {
      toastError("Failed to send quote");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/quotes" className="text-blue-600 hover:underline text-sm">&larr; Back</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-gray-900">Quote {quote.quote_number}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.bgClass} ${statusMeta.textClass}`}>
              {statusMeta.label}
            </span>
          </div>
          <p className="text-gray-500 mt-1">For {customerName}</p>
        </div>
        <div className="flex gap-2">
          {quote.status === "draft" && (
            <button onClick={handleSend} disabled={sendQuote.isPending} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Send Quote
            </button>
          )}
          {quote.status === "accepted" && (
            <button onClick={handleConvertToInvoice} disabled={convertToInvoice.isPending} className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              Convert to Invoice
            </button>
          )}
          <button onClick={handleDelete} disabled={deleteQuote.isPending} className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <div className="bg-white border rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
            <p className="text-gray-900 font-medium">{customerName}</p>
            {quote.customer?.email && <p className="text-gray-500 text-sm">{quote.customer.email}</p>}
            {quote.customer?.phone && <p className="text-gray-500 text-sm">{quote.customer.phone}</p>}
            <Link to={`/customers/${quote.customer_id}`} className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              View Customer
            </Link>
          </div>

          {/* Line Items */}
          <div className="bg-white border rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
            {quote.line_items && quote.line_items.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-sm font-medium text-gray-500">Service</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-gray-500">Description</th>
                    <th className="text-right px-3 py-2 text-sm font-medium text-gray-500">Qty</th>
                    <th className="text-right px-3 py-2 text-sm font-medium text-gray-500">Rate</th>
                    <th className="text-right px-3 py-2 text-sm font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quote.line_items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-sm">{item.service || item.description || "—"}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{item.description || "—"}</td>
                      <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-sm text-right">${(item.rate || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">${(item.amount || item.quantity * (item.rate || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-sm">No line items</p>
            )}

            {/* Totals */}
            <div className="border-t mt-4 pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span>${(quote.subtotal || 0).toFixed(2)}</span>
              </div>
              {(quote.tax_rate || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({quote.tax_rate}%):</span>
                  <span>${(quote.tax || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total:</span>
                <span>${(quote.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="bg-white border rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Quote Number</dt>
                <dd className="font-medium">{quote.quote_number}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.bgClass} ${statusMeta.textClass}`}>{statusMeta.label}</span></dd>
              </div>
              {quote.valid_until && (
                <div>
                  <dt className="text-gray-500">Valid Until</dt>
                  <dd>{new Date(quote.valid_until).toLocaleDateString()}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd>{quote.created_at ? new Date(quote.created_at).toLocaleDateString() : "—"}</dd>
              </div>
              {quote.updated_at && (
                <div>
                  <dt className="text-gray-500">Last Updated</dt>
                  <dd>{new Date(quote.updated_at).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white border rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Record Info</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Quote ID</dt>
                <dd className="font-mono text-xs break-all">{quote.id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
