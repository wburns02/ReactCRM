import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth.ts";
import { useTheme } from "@/hooks/useTheme";

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

interface NavGroup {
  name: string;
  label: string;
  icon: string;
  badge?: string;
  items: NavItem[];
}

interface AdminMobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const topNavItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/customers", label: "Customers", icon: "👥" },
  { path: "/prospects", label: "Prospects", icon: "📋" },
  { path: "/contracts", label: "Contracts", icon: "🤝" },
  { path: "/bookings", label: "Bookings", icon: "📅" },
  { path: "/customer-success", label: "Customer Success", icon: "💚" },
];

const navGroups: NavGroup[] = [
  {
    name: "operations",
    label: "Operations",
    icon: "📝",
    items: [
      { path: "/command-center", label: "Command Center", icon: "🎯" },
      { path: "/work-orders", label: "Work Orders", icon: "🔧" },
      { path: "/schedule", label: "Schedule", icon: "📅" },
      { path: "/technicians", label: "Technicians", icon: "👷" },
      { path: "/employee", label: "Employee Portal", icon: "📱" },
      { path: "/service-intervals", label: "Service Intervals", icon: "🔄" },
      { path: "/compliance", label: "Compliance", icon: "✅" },
      { path: "/timesheets", label: "Timesheets", icon: "⏱️" },
    ],
  },
  {
    name: "communications",
    label: "Communications",
    icon: "📞",
    items: [
      { path: "/communications", label: "Inbox & Messages", icon: "💬" },
      { path: "/communications/sms", label: "SMS Inbox", icon: "📱" },
      { path: "/communications/email-inbox", label: "Email Inbox", icon: "📧" },
      { path: "/calls", label: "Call Center", icon: "📞" },
      { path: "/phone", label: "Phone Dashboard", icon: "☎️" },
      { path: "/communications/templates", label: "Templates", icon: "📝" },
      { path: "/communications/reminders", label: "Auto-Reminders", icon: "🔔" },
      { path: "/integrations", label: "Integrations", icon: "🔌" },
    ],
  },
  {
    name: "financial",
    label: "Financial",
    icon: "💰",
    items: [
      { path: "/invoices", label: "Invoices", icon: "🧾" },
      { path: "/payments", label: "Payments", icon: "💳" },
      { path: "/estimates", label: "Estimates", icon: "📊" },
      { path: "/billing/payment-plans", label: "Payment Plans", icon: "📈" },
      { path: "/payroll", label: "Payroll", icon: "💵" },
      { path: "/job-costing", label: "Job Costing", icon: "💹" },
    ],
  },
  {
    name: "assets",
    label: "Assets",
    icon: "📦",
    items: [
      { path: "/inventory", label: "Inventory", icon: "📦" },
      { path: "/equipment", label: "Equipment", icon: "🛠️" },
      { path: "/fleet", label: "Fleet Map", icon: "🚛" },
    ],
  },
  {
    name: "marketing",
    label: "Marketing",
    icon: "📧",
    badge: "AI",
    items: [
      { path: "/marketing", label: "Marketing Hub", icon: "📊" },
      { path: "/marketing/ads", label: "Google Ads", icon: "📈" },
      { path: "/marketing/reviews", label: "Reviews", icon: "⭐" },
      { path: "/marketing/ai-content", label: "AI Content", icon: "🤖" },
      { path: "/reports", label: "Reports", icon: "📈" },
    ],
  },
  {
    name: "ai-analytics",
    label: "AI & Analytics",
    icon: "🤖",
    badge: "GPU",
    items: [
      { path: "/ai-assistant", label: "AI Assistant", icon: "✨" },
      { path: "/call-intelligence", label: "Call Intelligence", icon: "📞" },
      { path: "/analytics/bi", label: "BI Dashboard", icon: "📊" },
      { path: "/analytics/ftfr", label: "First-Time Fix Rate", icon: "✔" },
      { path: "/predictive-maintenance", label: "AI Predictions", icon: "🔮" },
    ],
  },
  {
    name: "system",
    label: "System",
    icon: "⚙️",
    items: [
      { path: "/users", label: "Users", icon: "👤" },
      { path: "/admin", label: "Settings", icon: "⚙️" },
      { path: "/admin/import", label: "Data Import", icon: "📥" },
      { path: "/admin/dump-sites", label: "Dump Sites", icon: "🚛" },
    ],
  },
];

/**
 * Full-screen slide-out navigation drawer for admin mobile.
 * Contains all nav groups with expandable sections.
 */
export function AdminMobileDrawer({ open, onClose }: AdminMobileDrawerProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isDark, toggle: toggleTheme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("mobileDrawerExpandedGroups");
    return saved ? new Set(JSON.parse(saved)) : new Set(["operations"]);
  });

  // Close on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (open && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [open]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.path));

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      localStorage.setItem(
        "mobileDrawerExpandedGroups",
        JSON.stringify([...next])
      );
      return next;
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className={`fixed top-0 left-0 bottom-0 z-[70] w-[85vw] max-w-[320px] bg-bg-card flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-mac-dark-blue font-semibold"
          >
            <span className="text-xl">🚽</span>
            <span className="text-sm font-bold">Mac Service Platform</span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-text-secondary hover:bg-bg-hover transition-colors touch-manipulation"
            aria-label="Close menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto overscroll-contain">
          {/* Top-level items */}
          <div className="p-3">
            {topNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-text-primary active:bg-bg-hover"
                }`}
              >
                <span className="text-lg w-7 text-center">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Collapsible groups */}
          <div className="px-3 pb-3">
            {navGroups.map((group) => (
              <div
                key={group.name}
                className="border-t border-border/50 pt-2 mt-1"
              >
                <button
                  onClick={() => toggleGroup(group.name)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                    isGroupActive(group)
                      ? "text-primary"
                      : "text-text-secondary active:bg-bg-hover"
                  }`}
                >
                  <span className="text-lg w-7 text-center">{group.icon}</span>
                  <span className="flex-1 text-left">{group.label}</span>
                  {group.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-success/20 text-success rounded font-semibold">
                      {group.badge}
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      expandedGroups.has(group.name) ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Expanded items */}
                {expandedGroups.has(group.name) && (
                  <div className="ml-4 pb-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors touch-manipulation ${
                          isActive(item.path)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-text-secondary active:bg-bg-hover"
                        }`}
                      >
                        <span className="text-sm w-6 text-center">
                          {item.icon}
                        </span>
                        {item.label}
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-warning/20 text-warning rounded font-semibold ml-auto">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer: user info + theme + sign out */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-mac-dark-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.first_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-text-secondary rounded-xl border border-border hover:bg-bg-hover transition-colors touch-manipulation"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-danger rounded-xl border border-danger/30 hover:bg-danger/5 transition-colors touch-manipulation"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
