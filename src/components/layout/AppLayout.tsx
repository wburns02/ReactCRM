import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth.ts";
import { RCStatusIndicator } from "@/features/phone/index.ts";
import { NotificationCenter } from "@/features/notifications/index.ts";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { OnboardingAssistant } from "@/features/onboarding/components/OnboardingAssistant";
import { EmailComposeProvider } from "@/context/EmailComposeContext";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { MobileHeader } from "@/components/navigation/MobileHeader";

/**
 * Navigation item type
 */
interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

/**
 * Navigation group with collapsible items
 */
interface NavGroup {
  name: string;
  label: string;
  icon: string;
  badge?: string;
  items: NavItem[];
}

/**
 * Main app layout with collapsible sidebar navigation
 * Matches legacy sidebar structure
 */
export function AppLayout() {
  const { user, logout, isTechnician } = useAuth();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand group containing current page
    const saved = localStorage.getItem("sidebarExpandedGroups");
    return saved ? new Set(JSON.parse(saved)) : new Set(["operations"]);
  });

  // Top-level navigation items (always visible)
  const topNavItems: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/customers", label: "Customers", icon: "👥" },
    { path: "/prospects", label: "Prospects", icon: "📋" },
    { path: "/customer-success", label: "Customer Success", icon: "💚" },
  ];

  // Full nav for technicians — expanded portal with all features
  const techNavItems: NavItem[] = [
    { path: "/my-dashboard", label: "My Dashboard", icon: "🏠" },
    { path: "/portal/jobs", label: "My Jobs", icon: "🔧" },
    { path: "/portal/schedule", label: "My Schedule", icon: "📅" },
    { path: "/portal/time-clock", label: "Time Clock", icon: "⏰" },
    { path: "/portal/pay", label: "Pay & Performance", icon: "💰" },
    { path: "/field", label: "Field View", icon: "🗺️" },
    { path: "/portal/messages", label: "Messages", icon: "💬" },
    { path: "/portal/settings", label: "Settings", icon: "⚙️" },
  ];

  // Collapsible navigation groups - matching legacy structure
  const navGroups: NavGroup[] = [
    {
      name: "operations",
      label: "Operations",
      icon: "📝",
      items: [
        { path: "/command-center", label: "Command Center", icon: "🎯" },
        { path: "/work-orders", label: "Work Orders", icon: "🔧" },
        { path: "/tracking", label: "Tracking", icon: "🗺️", badge: "LIVE" },
        { path: "/schedule", label: "Schedule", icon: "📅" },
        { path: "/technicians", label: "Technicians", icon: "👷" },
        { path: "/employee", label: "Employee Portal", icon: "📱" },
        { path: "/service-intervals", label: "Service Intervals", icon: "🔄" },
        { path: "/compliance", label: "Compliance", icon: "✅" },
        { path: "/contracts", label: "Contracts", icon: "📄" },
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
        {
          path: "/communications/email-inbox",
          label: "Email Inbox",
          icon: "📧",
        },
        { path: "/calls", label: "Call Center", icon: "📞" },
        { path: "/phone", label: "Phone Dashboard", icon: "☎️" },
        {
          path: "/communications/templates",
          label: "Message Templates",
          icon: "📝",
        },
        {
          path: "/communications/reminders",
          label: "Auto-Reminders",
          icon: "🔔",
        },
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
        { path: "/marketing/email-marketing", label: "Email Marketing", icon: "📧" },
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
        {
          path: "/call-intelligence",
          label: "Call Intelligence",
          icon: "📞",
          badge: "NEW",
        },
        { path: "/analytics/bi", label: "BI Dashboard", icon: "📊" },
        { path: "/analytics/ftfr", label: "First-Time Fix Rate", icon: "✔" },
        {
          path: "/predictive-maintenance",
          label: "AI Predictions",
          icon: "🔮",
        },
      ],
    },
    {
      name: "support",
      label: "Support",
      icon: "🎫",
      items: [{ path: "/tickets", label: "Tickets", icon: "🎫" }],
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

  // Check if path is active (includes sub-paths)
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      localStorage.setItem("sidebarExpandedGroups", JSON.stringify([...next]));
      return next;
    });
  };

  // Check if any item in group is active
  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.path));

  return (
    <EmailComposeProvider>
    <div className="flex h-screen bg-bg-body">
      {/* Skip to main content link - visible only on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Sidebar — hidden on mobile for technicians, always visible on desktop */}
      <aside className={`w-64 bg-bg-sidebar border-r border-border flex-col overflow-hidden ${
        isTechnician ? "hidden md:flex" : "hidden md:flex"
      }`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-mac-dark-blue font-semibold"
          >
            <span className="text-xl">🚽</span>
            <span>Mac Service Platform</span>
          </Link>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4">
          {isTechnician ? (
            /* Simplified nav for technicians — big items */
            <ul className="space-y-2">
              {techNavItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      isActive(item.path)
                        ? "bg-primary-light text-primary"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {/* Top-level items */}
              <ul className="space-y-1 mb-4">
                {topNavItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-primary-light text-primary"
                          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Collapsible Groups */}
              <div className="space-y-2">
                {navGroups.map((group) => (
                  <div key={group.name} className="border-t border-border/50 pt-2">
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isGroupActive(group)
                          ? "text-primary"
                          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                      }`}
                    >
                      <span>{group.icon}</span>
                      <span className="flex-1 text-left">{group.label}</span>
                      {group.badge && (
                        <span className="px-1.5 py-0.5 text-xs bg-success/20 text-success rounded">
                          {group.badge}
                        </span>
                      )}
                      <span
                        className={`transition-transform ${expandedGroups.has(group.name) ? "rotate-180" : ""}`}
                      >
                        ▼
                      </span>
                    </button>

                    {/* Group Items */}
                    {expandedGroups.has(group.name) && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {group.items.map((item) => (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                                isActive(item.path)
                                  ? "bg-primary-light text-primary font-medium"
                                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                              }`}
                            >
                              <span className="text-xs">{item.icon}</span>
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-mac-dark-blue text-white flex items-center justify-center text-sm font-semibold">
              {user?.first_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full text-sm text-text-secondary hover:text-danger transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header — visible only on mobile for technicians */}
      {isTechnician && (
        <div className="md:hidden contents">
          {/* contents so it participates in parent flex without adding a wrapper */}
        </div>
      )}

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 overflow-auto flex flex-col min-w-0"
        tabIndex={-1}
      >
        {/* Mobile header for technicians (replaces desktop top bar on small screens) */}
        {isTechnician && (
          <div className="md:hidden">
            <MobileHeader />
          </div>
        )}

        {/* Desktop top bar — hidden on mobile for technicians */}
        <div className={`h-12 border-b border-border bg-bg-card px-6 flex items-center justify-end gap-4 ${
          isTechnician ? "hidden md:flex" : ""
        }`}>
          <ConnectionStatus showTooltip size="sm" />
          <NotificationCenter />
          <RCStatusIndicator />
        </div>

        {/* Page content — extra bottom padding on mobile for technicians to clear bottom nav */}
        <div className={`flex-1 overflow-auto ${isTechnician ? "pb-20 md:pb-0" : ""}`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav — only for technicians, only on mobile */}
      {isTechnician && (
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      )}

      {/* AI Onboarding Assistant — hidden for field technicians */}
      {!isTechnician && <OnboardingAssistant />}
    </div>
    </EmailComposeProvider>
  );
}
