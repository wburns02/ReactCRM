import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useCustomerPortalAuth } from "./hooks/useCustomerPortal";

/**
 * Customer Self-Service Portal Layout
 *
 * Standalone layout — no sidebar, no staff nav. Mobile-first design.
 * Used for all /customer-portal/* routes except /customer-portal/login.
 */
export function CustomerPortalLayout() {
  const { logout } = useCustomerPortalAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const navLinks = [
    { to: "/customer-portal/dashboard", label: "Dashboard" },
    { to: "/customer-portal/services", label: "Services" },
    { to: "/customer-portal/invoices", label: "Invoices" },
    { to: "/customer-portal/request-service", label: "Request" },
  ];

  const isActive = (to: string) => location.pathname === to;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + Brand */}
          <Link
            to="/customer-portal/dashboard"
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 56 47" className="w-5 h-5">
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
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">MAC Septic</p>
              <p className="text-xs text-blue-600 font-medium">Customer Portal</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="grid grid-cols-4 h-16">
          {navLinks.map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                isActive(link.to)
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <NavIcon label={link.label} active={isActive(link.to)} />
              {link.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer padding for mobile bottom nav */}
      <div className="sm:hidden h-16" />

      {/* Footer */}
      <footer className="hidden sm:block bg-white border-t border-gray-200 py-4 mt-auto">
        <p className="text-center text-gray-400 text-xs">
          MAC Septic Services &mdash; Customer Portal &mdash; Need help? Call{" "}
          <a href="tel:+15125550123" className="text-blue-600 hover:underline">
            (512) 555-0123
          </a>
        </p>
      </footer>
    </div>
  );
}

/** Simple icon switcher for mobile bottom nav */
function NavIcon({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  const cls = `w-5 h-5 ${active ? "text-blue-600" : "text-gray-400"}`;

  if (label === "Dashboard") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (label === "Services") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
  }
  if (label === "Invoices") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  // Request
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
