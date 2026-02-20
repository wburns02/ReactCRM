import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCustomerPortalAuth,
  fetchMyInvoices,
  type CustomerInvoice,
} from "./hooks/useCustomerPortal";

function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower === "paid") return "bg-green-100 text-green-700";
  if (lower === "overdue") return "bg-red-100 text-red-700";
  if (lower === "pending" || lower === "sent") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/**
 * Customer Portal Invoices Page
 *
 * Shows all invoices from GET /customer-portal/my-invoices.
 */
export function CustomerPortalInvoices() {
  const { token } = useCustomerPortalAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/customer-portal/login", { replace: true });
      return;
    }

    let cancelled = false;

    async function load() {
      if (!token) return;
      try {
        const data = await fetchMyInvoices(token);
        if (!cancelled) setInvoices(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load invoices.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  // Compute totals
  const totalDue = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + Math.max(0, inv.amount_due - inv.amount_paid), 0);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your billing history with MAC Septic Services
        </p>
      </div>

      {/* Summary card */}
      {invoices.length > 0 && totalDue > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-yellow-700 font-medium">
              Outstanding Balance
            </p>
            <p className="text-2xl font-bold text-yellow-800">
              {formatMoney(totalDue)}
            </p>
          </div>
          <a
            href="tel:+15125550123"
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Call to Pay
          </a>
        </div>
      )}

      {/* Empty state */}
      {invoices.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500">No invoices found.</p>
          <p className="text-gray-400 text-sm mt-1">
            Invoices will appear here after your service is completed.
          </p>
        </div>
      )}

      {/* Invoice cards */}
      {invoices.map((inv) => {
        const balance = Math.max(0, inv.amount_due - inv.amount_paid);

        return (
          <div
            key={inv.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-gray-900">
                  Invoice #{inv.invoice_number}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Created {formatDate(inv.created_at)}
                </p>
              </div>
              <span
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge(inv.status)}`}
              >
                {inv.status}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Amount Due</dt>
                <dd className="font-semibold text-gray-900">
                  {formatMoney(inv.amount_due)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Amount Paid</dt>
                <dd className="font-semibold text-green-700">
                  {formatMoney(inv.amount_paid)}
                </dd>
              </div>
              {balance > 0 && (
                <div>
                  <dt className="text-xs text-gray-400">Balance</dt>
                  <dd className="font-semibold text-red-600">
                    {formatMoney(balance)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400">Due Date</dt>
                <dd className="text-gray-700">{formatDate(inv.due_date)}</dd>
              </div>
            </dl>
          </div>
        );
      })}

      {/* Contact for payment */}
      {invoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-blue-800 text-sm font-medium">
            Questions about your bill?
          </p>
          <a
            href="tel:+15125550123"
            className="text-blue-600 hover:underline text-sm font-semibold"
          >
            Call (512) 555-0123
          </a>
        </div>
      )}
    </div>
  );
}
