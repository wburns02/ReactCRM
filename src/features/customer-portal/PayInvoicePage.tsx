import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://react-crm-api-production.up.railway.app/api/v2";

interface InvoicePayData {
  id: string;
  invoice_number: string;
  customer_name: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  line_items: Array<{ description: string; quantity: number; amount: number }>;
}

export function PayInvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<InvoicePayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const token = localStorage.getItem("customerPortalToken");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/customer-portal/pay/${invoiceId}`, { headers });
        if (!res.ok) throw new Error("Invoice not found");
        const data = await res.json();
        setInvoice(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-500">{error || "This invoice could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const balance = invoice.amount_due - invoice.amount_paid;
  const isPaid = invoice.status === "paid" || balance <= 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">MAC Septic Services</h1>
          <p className="text-gray-500 mt-1">Invoice Payment</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">Invoice</p>
              <p className="text-lg font-semibold">{invoice.invoice_number}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
            }`}>
              {isPaid ? "Paid" : "Due"}
            </span>
          </div>

          {invoice.customer_name && (
            <p className="text-gray-600 mb-4">Bill to: {invoice.customer_name}</p>
          )}

          {/* Line Items */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <div className="border-t pt-4 mb-4">
              {invoice.line_items.map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">
                    {item.description} {item.quantity > 1 ? `x${item.quantity}` : ""}
                  </span>
                  <span className="font-medium">${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Balance Due</span>
              <span className={isPaid ? "text-green-600" : "text-gray-900"}>
                ${balance.toFixed(2)}
              </span>
            </div>
            {invoice.due_date && (
              <p className="text-sm text-gray-500 mt-1">
                Due: {new Date(invoice.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Payment Button */}
        {!isPaid && (
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold text-lg transition-colors"
            onClick={() => {
              // Clover payment integration - opens Clover hosted checkout
              window.open(
                `https://www.clover.com/pay/${invoiceId}`,
                "_blank"
              );
            }}
          >
            Pay with Card — ${balance.toFixed(2)}
          </button>
        )}

        {isPaid && (
          <div className="text-center text-green-600 font-medium">
            This invoice has been paid. Thank you!
          </div>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          Questions? Call (512) 353-0555
        </p>
      </div>
    </div>
  );
}
