import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  requestCode,
  verifyCode,
} from "./hooks/useCustomerPortal";

const CUSTOMER_TOKEN_KEY = "customerPortalToken";

/**
 * Customer Self-Service Portal Login
 *
 * Two-step OTP authentication:
 *   Step 1 — enter phone or email → POST /customer-portal/request-code
 *   Step 2 — enter 6-digit code   → POST /customer-portal/verify-code → store token
 */
export function CustomerPortalLogin() {
  const navigate = useNavigate();

  const [step, setStep] = useState<"contact" | "code">("contact");
  const [contact, setContact] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Step 1: Request OTP
  // -------------------------------------------------------------------------
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!contact.trim()) {
      setError("Please enter your phone number or email address.");
      return;
    }

    setLoading(true);
    try {
      const result = await requestCode(contact.trim());
      setCustomerId(result.customer_id);
      setSuccessMsg(
        result.message ||
          "A 6-digit code has been sent to you. Please enter it below.",
      );
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step 2: Verify OTP
  // -------------------------------------------------------------------------
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyCode(customerId, code);
      localStorage.setItem(CUSTOMER_TOKEN_KEY, result.access_token);
      navigate("/customer-portal/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 pt-8 pb-6 text-white text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-xl mb-3">
              <svg viewBox="0 0 56 47" className="w-8 h-8">
                <rect x="0" y="16" width="38" height="24" rx="3" fill="white" opacity="0.9" />
                <ellipse cx="19" cy="22" rx="16" ry="10" fill="white" opacity="0.7" />
                <rect x="3" y="22" width="32" height="14" rx="2" fill="white" opacity="0.9" />
                <path d="M38 24 L50 24 L54 32 L54 40 L38 40 Z" fill="white" opacity="0.9" />
                <circle cx="12" cy="42" r="5" fill="white" opacity="0.9" />
                <circle cx="12" cy="42" r="2.5" fill="#1d4ed8" />
                <circle cx="46" cy="42" r="5" fill="white" opacity="0.9" />
                <circle cx="46" cy="42" r="2.5" fill="#1d4ed8" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">MAC Septic Services</h1>
            <p className="text-blue-100 text-sm mt-1">Customer Portal</p>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {step === "contact" ? (
              <>
                <p className="text-gray-600 text-sm mb-5 text-center">
                  Enter your phone number or email to receive a sign-in code.
                </p>

                {error && (
                  <div
                    role="alert"
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div>
                    <label
                      htmlFor="contact"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Phone or Email
                    </label>
                    <input
                      id="contact"
                      type="text"
                      autoComplete="tel email"
                      placeholder="(512) 555-0123 or you@example.com"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      disabled={loading}
                      className="w-full h-11 px-4 rounded-xl border border-gray-300 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending Code...
                      </span>
                    ) : (
                      "Send Code"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                {successMsg && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
                    {successMsg}
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                  >
                    {error}
                  </div>
                )}

                <p className="text-gray-600 text-sm mb-5 text-center">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-medium text-gray-900">{contact}</span>
                </p>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label
                      htmlFor="code"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Verification Code
                    </label>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      disabled={loading}
                      className="w-full h-14 px-4 rounded-xl border border-gray-300 text-2xl text-center font-mono tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      "Verify & Sign In"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("contact");
                      setCode("");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 transition py-1"
                  >
                    Use a different phone or email
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-0 text-center">
            <p className="text-xs text-gray-400">
              Need help?{" "}
              <a
                href="tel:+15125550123"
                className="text-blue-600 hover:underline"
              >
                Call (512) 555-0123
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          MAC Septic Services &mdash; Secure Customer Access
        </p>
      </div>
    </div>
  );
}
