import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage, hasAuthToken } from "@/api/client.ts";
import {
  markSessionValidated,
  sanitizeRedirectUrl,
  cleanupLegacyAuth,
  storeSessionToken,
} from "@/lib/security";
import { useMicrosoft365AuthUrl, useMicrosoft365Callback } from "@/api/hooks/useMicrosoft365";

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

/** Rotating feature highlights for the hero panel */
const FEATURES = [
  {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    title: "Smart Dispatch",
    desc: "AI-powered job routing and real-time technician tracking",
  },
  {
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    title: "Integrated Payments",
    desc: "Clover POS, QuickBooks sync, and automated invoicing",
  },
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Real-Time Analytics",
    desc: "Revenue dashboards, technician performance, and customer insights",
  },
];

/**
 * Premium Login Page
 *
 * Split-screen enterprise design with animated hero panel.
 * All authentication logic preserved — only the visual layer is upgraded.
 *
 * SECURITY:
 * - Supports both cookie auth (preferred) and token auth (mobile fallback)
 * - Sanitizes redirect URLs to prevent open redirect attacks
 * - Cleans up legacy tokens on successful cookie auth
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const msAuthUrl = useMicrosoft365AuthUrl();
  const msCallback = useMicrosoft365Callback();

  // Animate mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // SECURITY: Sanitize return URL to prevent open redirect
  const rawReturnUrl = searchParams.get("return") || "/";
  const returnUrl = sanitizeRedirectUrl(rawReturnUrl);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check if already logged in
  useEffect(() => {
    if (hasAuthToken()) {
      const checkAuth = async () => {
        try {
          const { data } = await apiClient.get("/auth/me");
          if (data?.user) {
            markSessionValidated(data.user.id);
            navigate(returnUrl, { replace: true });
          }
        } catch {
          // Session is invalid, stay on login
        }
      };
      checkAuth();
    }
  }, [navigate, returnUrl]);

  // Handle Microsoft SSO callback
  useEffect(() => {
    const code = searchParams.get("code");
    const msState = searchParams.get("state");
    if (code && msState === "sso") {
      setMsLoading(true);
      msCallback.mutate(code, {
        onSuccess: (data) => {
          if (data?.access_token) storeSessionToken(data.access_token);
          cleanupLegacyAuth();
          if (data?.user) markSessionValidated(data.user.id);
          else markSessionValidated();
          queryClient.clear();
          // Clean URL and navigate
          window.history.replaceState({}, "", "/login");
          navigate(returnUrl, { replace: true });
        },
        onError: () => {
          setError("Microsoft sign-in failed. Your account may not be linked.");
          setMsLoading(false);
          window.history.replaceState({}, "", "/login");
        },
      });
    }
  }, [searchParams]);

  const handleMicrosoftLogin = async () => {
    try {
      setMsLoading(true);
      const result = await msAuthUrl.mutateAsync();
      window.location.href = result.authorization_url;
    } catch {
      setError("Could not connect to Microsoft. Try again.");
      setMsLoading(false);
    }
  };

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post("/auth/login", {
          email: data.email,
          password: data.password,
        });

        const token = response.data?.access_token || response.data?.token;
        if (token) {
          storeSessionToken(token);
        }
        cleanupLegacyAuth();

        if (response.data?.user) {
          markSessionValidated(response.data.user.id);
        } else {
          markSessionValidated();
        }

        queryClient.clear();
        navigate(returnUrl, { replace: true });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, returnUrl, queryClient],
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Hero Panel (left side on desktop, top strip on mobile) ── */}
      <div className="relative lg:w-[48%] overflow-hidden bg-gradient-to-br from-[#0b1a30] via-[#112744] to-[#183660]">
        {/* Subtle animated gradient */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 20% 80%, rgba(42,171,225,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 60%)",
            animation: "meshShift 20s ease-in-out infinite alternate",
          }}
        />

        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12 xl:p-14">
          {/* Logo */}
          <div>
            <img
              src="/logo-white.png"
              alt="MAC Septic"
              className="h-12 lg:h-14 w-auto"
            />
          </div>

          {/* Hero text — hidden on mobile, visible on lg+ */}
          <div className="hidden lg:flex flex-1 flex-col justify-center my-8">
            <p className="text-[#2aabe1] font-semibold text-sm tracking-widest uppercase mb-3">
              Mac Service Platform
            </p>
            <h2 className="text-white text-3xl xl:text-4xl font-bold leading-snug mb-5">
              Your business,{" "}
              <span className="bg-gradient-to-r from-[#2aabe1] to-[#60c5ee] bg-clip-text text-transparent">
                running smoother.
              </span>
            </h2>
            <p className="text-white/50 text-base max-w-sm leading-relaxed">
              Scheduling, dispatch, payments, and customer management
              in one platform.
            </p>

            {/* Feature list — all visible, no carousel */}
            <div className="mt-10 space-y-4">
              {FEATURES.map((feat) => (
                <div key={feat.title} className="flex items-center gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-white/[0.07] flex items-center justify-center">
                    <svg
                      className="w-[18px] h-[18px] text-[#2aabe1]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={feat.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">{feat.title}</p>
                    <p className="text-white/40 text-xs">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-center">
              <p className="text-white font-bold text-xl">4.9</p>
              <p className="text-white/30 text-[11px] uppercase tracking-wider">Rating</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-white font-bold text-xl">28+</p>
              <p className="text-white/30 text-[11px] uppercase tracking-wider">Years</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-white font-bold text-xl">500+</p>
              <p className="text-white/30 text-[11px] uppercase tracking-wider">Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Login Form Panel (right side) ── */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0f172a] p-6 sm:p-8 lg:p-12">
        <div
          className={`w-full max-w-[400px] transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* Mobile logo (hidden on lg+) */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <img src="/logo.png" alt="MAC Septic" className="h-10 w-auto" />
          </div>

          {/* Welcome heading */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Welcome back
            </h1>
            <p className="text-text-secondary mt-2">
              Sign in to Mac Service Platform
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/5 border border-danger/15 animate-[shake_0.5s_ease-in-out]">
                <svg className="w-5 h-5 text-danger shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-danger">Sign in failed</p>
                  <p className="text-sm text-danger/80 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-primary"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    className="w-4.5 h-4.5 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  {...register("email")}
                  disabled={isLoading}
                  className={`w-full h-12 pl-11 pr-4 rounded-xl border text-base bg-bg-body dark:bg-white/5 text-text-primary placeholder:text-text-muted transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                    errors.email
                      ? "border-danger focus:ring-danger/30 focus:border-danger"
                      : "border-border hover:border-text-muted"
                  } disabled:opacity-50`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-danger flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-primary"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    className="w-4.5 h-4.5 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register("password")}
                  disabled={isLoading}
                  className={`w-full h-12 pl-11 pr-12 rounded-xl border text-base bg-bg-body dark:bg-white/5 text-text-primary placeholder:text-text-muted transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                    errors.password
                      ? "border-danger focus:ring-danger/30 focus:border-danger"
                      : "border-border hover:border-text-muted"
                  } disabled:opacity-50`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-danger flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full h-12 rounded-xl font-semibold text-white text-base overflow-hidden transition-all duration-300 bg-gradient-to-r from-[#104b95] to-[#1a6bc4] hover:from-[#0d3f7f] hover:to-[#1560b5] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#104b95]/25 hover:shadow-xl hover:shadow-[#104b95]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Microsoft SSO Button */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msLoading || isLoading}
            className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-border text-sm font-semibold text-text-primary bg-bg-body hover:bg-bg-hover hover:border-text-muted transition-all duration-200 disabled:opacity-50"
          >
            {msLoading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
                <rect width="11" height="11" fill="#f25022" />
                <rect x="12" width="11" height="11" fill="#7fba00" />
                <rect y="12" width="11" height="11" fill="#00a4ef" />
                <rect x="12" y="12" width="11" height="11" fill="#ffb900" />
              </svg>
            )}
            {msLoading ? "Signing in with Microsoft..." : "Sign in with Microsoft"}
          </button>

          <div className="mt-3">
            <a
              href="/home"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-hover hover:border-text-muted transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Visit Public Site
            </a>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-text-muted text-xs text-center leading-relaxed">
              Having trouble signing in?{" "}
              <span className="text-text-link cursor-pointer hover:underline">
                Contact your administrator
              </span>
            </p>
            <p className="text-text-muted/50 text-[11px] text-center mt-3">
              Mac Service Platform v2.10 &middot; {new Date().getFullYear()} MAC Septic
            </p>
          </div>
        </div>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes meshShift {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 100%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
