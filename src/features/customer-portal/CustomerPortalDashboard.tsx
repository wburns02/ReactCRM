import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useCustomerPortalAuth,
  fetchMyAccount,
  fetchMyNextService,
  type CustomerAccount,
  type NextService,
} from "./hooks/useCustomerPortal";

/**
 * Customer Portal Dashboard
 *
 * Greeting + next service card + quick action buttons.
 */
export function CustomerPortalDashboard() {
  const { token, logout } = useCustomerPortalAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [nextService, setNextService] = useState<NextService | null>(null);
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
        const [acc, svc] = await Promise.all([
          fetchMyAccount(token),
          fetchMyNextService(token),
        ]);
        if (!cancelled) {
          setAccount(acc);
          setNextService(svc);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load account.",
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
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={logout}
          className="text-blue-600 hover:underline text-sm"
        >
          Sign Out
        </button>
      </div>
    );
  }

  const firstName = account?.first_name || "Customer";

  /** Format a date string for display */
  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "TBD";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {firstName}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome to your MAC Septic customer portal.
        </p>
      </div>

      {/* Next Service Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">
              Next Service
              {nextService?.estimated && " (Estimated)"}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatDate(nextService?.next_service_date)}
            </p>
            {nextService?.service_type && (
              <p className="text-sm text-gray-500 mt-0.5">
                {nextService.service_type}
              </p>
            )}
            {nextService?.notes && (
              <p className="text-sm text-gray-400 mt-1 italic">
                {nextService.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/customer-portal/services"
          className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow group"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
            <svg
              className="w-6 h-6 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">View Services</p>
            <p className="text-xs text-gray-500">Service history</p>
          </div>
        </Link>

        <Link
          to="/customer-portal/invoices"
          className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow group"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
            <svg
              className="w-6 h-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">View Invoices</p>
            <p className="text-xs text-gray-500">Billing history</p>
          </div>
        </Link>

        <Link
          to="/customer-portal/request-service"
          className="bg-blue-600 border border-blue-600 shadow-sm rounded-2xl p-5 flex items-center gap-4 hover:bg-blue-700 transition-colors group"
        >
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Request Service</p>
            <p className="text-xs text-blue-100">Schedule appointment</p>
          </div>
        </Link>
      </div>

      {/* Account Summary */}
      {account && (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Account Information
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="text-gray-900 font-medium">
                {account.first_name} {account.last_name}
              </dd>
            </div>
            {account.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-gray-900">{account.phone}</dd>
              </div>
            )}
            {account.email && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900 truncate max-w-[180px]">
                  {account.email}
                </dd>
              </div>
            )}
            {account.city && (
              <div className="flex justify-between">
                <dt className="text-gray-500">City</dt>
                <dd className="text-gray-900">
                  {account.city}
                  {account.state ? `, ${account.state}` : ""}
                </dd>
              </div>
            )}
            {account.system_type && (
              <div className="flex justify-between">
                <dt className="text-gray-500">System Type</dt>
                <dd className="text-gray-900 capitalize">
                  {account.system_type}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Sign out link */}
      <div className="text-center pt-2">
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
