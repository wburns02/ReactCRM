import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  useCustomerPortalAuth,
  submitServiceRequest,
} from "./hooks/useCustomerPortal";

const SERVICE_TYPES = [
  { value: "Pumping", label: "Septic Tank Pumping" },
  { value: "Inspection", label: "Septic Inspection" },
  { value: "Repair", label: "Septic System Repair" },
  { value: "Other", label: "Other Service" },
];

/**
 * Customer Portal Request Service Page
 *
 * Submits a new service request via POST /customer-portal/request-service.
 */
export function CustomerPortalRequestService() {
  const { token } = useCustomerPortalAuth();
  const navigate = useNavigate();

  // Form state
  const [serviceType, setServiceType] = useState("Pumping");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [workOrderNumber, setWorkOrderNumber] = useState<string | null>(null);

  // Min date = today
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!token) {
      navigate("/customer-portal/login", { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serviceType) {
      setError("Please select a service type.");
      return;
    }
    if (!preferredDate) {
      setError("Please select a preferred date.");
      return;
    }

    if (!token) {
      navigate("/customer-portal/login", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const result = await submitServiceRequest(token, {
        service_type: serviceType,
        preferred_date: preferredDate,
        notes: notes.trim(),
      });
      setWorkOrderNumber(result.work_order_number);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit request.",
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Success state
  // -------------------------------------------------------------------------
  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Request Submitted!
          </h2>
          <p className="text-gray-500 text-sm mb-1">
            We've received your service request.
          </p>
          {workOrderNumber && (
            <p className="text-gray-400 text-sm mb-6">
              Work Order #{workOrderNumber}
            </p>
          )}
          <p className="text-gray-500 text-sm mb-6">
            We'll contact you within 1 business day to confirm your appointment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/customer-portal/dashboard"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => {
                setSubmitted(false);
                setWorkOrderNumber(null);
                setPreferredDate("");
                setNotes("");
              }}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Form
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Service</h1>
        <p className="text-gray-500 text-sm mt-1">
          Schedule a new septic service appointment.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {error && (
          <div
            role="alert"
            className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Service Type */}
          <div>
            <label
              htmlFor="serviceType"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              id="serviceType"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              {SERVICE_TYPES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Date */}
          <div>
            <label
              htmlFor="preferredDate"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Preferred Date <span className="text-red-500">*</span>
            </label>
            <input
              id="preferredDate"
              type="date"
              value={preferredDate}
              min={today}
              onChange={(e) => setPreferredDate(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              We'll do our best to accommodate your preferred date.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Additional Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder="Describe any issues you've noticed, access instructions, or special requests..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Request"
              )}
            </button>
            <Link
              to="/customer-portal/dashboard"
              className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition flex items-center justify-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Emergency contact */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">
            Emergency? Call us directly.
          </p>
          <a
            href="tel:+15125550123"
            className="text-red-700 font-bold hover:underline"
          >
            (512) 555-0123
          </a>
        </div>
      </div>
    </div>
  );
}
