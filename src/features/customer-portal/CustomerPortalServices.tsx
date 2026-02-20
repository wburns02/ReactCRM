import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCustomerPortalAuth,
  fetchMyServices,
  type CustomerService,
} from "./hooks/useCustomerPortal";

/** Status badge colors */
function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower === "completed" || lower === "complete") {
    return "bg-green-100 text-green-700";
  }
  if (lower === "in_progress" || lower === "in progress") {
    return "bg-yellow-100 text-yellow-700";
  }
  if (lower === "scheduled") {
    return "bg-blue-100 text-blue-700";
  }
  if (lower === "cancelled" || lower === "canceled") {
    return "bg-red-100 text-red-700";
  }
  return "bg-gray-100 text-gray-700";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBD";
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

/**
 * Customer Portal Services Page
 *
 * Shows service/work order history from GET /customer-portal/my-services.
 * Mobile card layout with status badges.
 */
export function CustomerPortalServices() {
  const { token } = useCustomerPortalAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState<CustomerService[]>([]);
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
        const data = await fetchMyServices(token);
        if (!cancelled) setServices(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load services.",
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

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your past and upcoming service appointments
        </p>
      </div>

      {/* Empty state */}
      {services.length === 0 && (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">No service history found.</p>
          <button
            onClick={() => navigate("/customer-portal/request-service")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Request Your First Service
          </button>
        </div>
      )}

      {/* Service cards */}
      {services.map((svc) => (
        <div
          key={svc.id}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          {/* Top row: service type + status badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold text-gray-900">
                {svc.service_type || "Service"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                WO #{svc.work_order_number}
              </p>
            </div>
            <span
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(svc.status)}`}
            >
              {svc.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Details */}
          <dl className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(svc.scheduled_date)}</span>
            </div>

            {svc.technician_name && (
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{svc.technician_name}</span>
              </div>
            )}

            {svc.service_address && (
              <div className="flex items-start gap-2 text-gray-600">
                <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="line-clamp-2">{svc.service_address}</span>
              </div>
            )}

            {svc.notes && (
              <p className="mt-2 text-xs text-gray-400 italic bg-gray-50 rounded-lg px-3 py-2">
                {svc.notes}
              </p>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}
