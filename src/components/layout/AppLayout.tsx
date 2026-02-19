import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth.ts";
import { RCStatusIndicator } from "@/features/phone/index.ts";
import { NotificationCenter } from "@/features/notifications/index.ts";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { EmailComposeProvider } from "@/context/EmailComposeContext";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { AdminMobileHeader } from "@/components/navigation/AdminMobileHeader";
import { AdminMobileDrawer } from "@/components/navigation/AdminMobileDrawer";
import { AdminMobileBottomNav } from "@/components/navigation/AdminMobileBottomNav";
import { useTheme } from "@/hooks/useTheme";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  CalendarCheck,
  Heart,
  Home,
  Wrench,
  Calendar,
  Clock,
  DollarSign,
  Map,
  MessageSquare,
  Settings,
  Clipboard,
  Phone,
  Wallet,
  Package,
  Megaphone,
  Sparkles,
  LifeBuoy,
  Target,
  MapPin,
  HardHat,
  Smartphone,
  RefreshCw,
  ShieldCheck,
  Timer,
  Inbox,
  MessageCircle,
  Mail,
  PhoneCall,
  Bell,
  Plug,
  Receipt,
  CreditCard,
  BarChart3,
  TrendingUp,
  Banknote,
  Calculator,
  Building2,
  Truck,
  Activity,
  Flame,
  Star,
  Search,
  Bot,
  LineChart,
  PieChart,
  CheckCircle,
  Zap,
  User,
  Download,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavGroup {
  name: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  items: NavItem[];
}

export function AppLayout() {
  const { user, logout, isTechnician } = useAuth();
  const location = useLocation();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("sidebarExpandedGroups");
    return saved ? new Set(JSON.parse(saved)) : new Set(["operations"]);
  });

  // Top-level navigation items (always visible)
  const topNavItems: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/customers", label: "Customers", icon: Users },
    { path: "/prospects", label: "Prospects", icon: ClipboardList },
    { path: "/contracts", label: "Contracts & Maintenance", icon: FileText },
    { path: "/bookings", label: "Bookings", icon: CalendarCheck },
    { path: "/customer-success", label: "Customer Success", icon: Heart },
  ];

  // Technician nav items
  const techNavItems: NavItem[] = [
    { path: "/my-dashboard", label: "My Dashboard", icon: Home },
    { path: "/portal/jobs", label: "My Jobs", icon: Wrench },
    { path: "/portal/schedule", label: "My Schedule", icon: Calendar },
    { path: "/portal/time-clock", label: "Time Clock", icon: Clock },
    { path: "/portal/pay", label: "Pay & Performance", icon: DollarSign },
    { path: "/field", label: "Field View", icon: Map },
    { path: "/portal/messages", label: "Messages", icon: MessageSquare },
    { path: "/portal/settings", label: "Settings", icon: Settings },
  ];

  // Collapsible navigation groups
  const navGroups: NavGroup[] = [
    {
      name: "operations",
      label: "Operations",
      icon: Clipboard,
      items: [
        { path: "/command-center", label: "Command Center", icon: Target },
        { path: "/work-orders", label: "Work Orders", icon: Wrench },
        { path: "/tracking", label: "Tracking", icon: MapPin, badge: "LIVE" },
        { path: "/schedule", label: "Schedule", icon: Calendar },
        { path: "/technicians", label: "Technicians", icon: HardHat },
        { path: "/employee", label: "Employee Portal", icon: Smartphone },
        { path: "/service-intervals", label: "Service Intervals", icon: RefreshCw },
        { path: "/compliance", label: "Compliance", icon: ShieldCheck },
        { path: "/timesheets", label: "Timesheets", icon: Timer },
      ],
    },
    {
      name: "communications",
      label: "Communications",
      icon: Phone,
      items: [
        { path: "/communications", label: "Inbox & Messages", icon: Inbox },
        { path: "/communications/sms", label: "SMS Inbox", icon: MessageCircle },
        { path: "/communications/email-inbox", label: "Email Inbox", icon: Mail },
        { path: "/calls", label: "Call Center", icon: PhoneCall },
        { path: "/phone", label: "Phone Dashboard", icon: Phone },
        { path: "/communications/templates", label: "Message Templates", icon: FileText },
        { path: "/communications/reminders", label: "Auto-Reminders", icon: Bell },
        { path: "/integrations", label: "Integrations", icon: Plug },
      ],
    },
    {
      name: "financial",
      label: "Financial",
      icon: Wallet,
      items: [
        { path: "/invoices", label: "Invoices", icon: Receipt },
        { path: "/payments", label: "Payments", icon: CreditCard },
        { path: "/estimates", label: "Estimates", icon: BarChart3 },
        { path: "/billing/payment-plans", label: "Payment Plans", icon: TrendingUp },
        { path: "/payroll", label: "Payroll", icon: Banknote },
        { path: "/job-costing", label: "Job Costing", icon: Calculator },
      ],
    },
    {
      name: "assets",
      label: "Assets",
      icon: Package,
      items: [
        { path: "/equipment", label: "Asset Management", icon: Building2 },
        { path: "/inventory", label: "Inventory", icon: Package },
        { path: "/fleet", label: "Fleet Map", icon: Truck },
        { path: "/equipment/health", label: "Equipment Health", icon: Activity },
      ],
    },
    {
      name: "marketing",
      label: "Marketing",
      icon: Megaphone,
      badge: "AI",
      items: [
        { path: "/marketing", label: "Marketing Hub", icon: BarChart3 },
        { path: "/marketing/leads", label: "Lead Pipeline", icon: Flame },
        { path: "/marketing/ads", label: "Google Ads", icon: TrendingUp },
        { path: "/marketing/reviews", label: "Reviews", icon: Star },
        { path: "/marketing/seo", label: "SEO Dashboard", icon: Search },
        { path: "/marketing/ai-content", label: "AI Content", icon: Bot },
        { path: "/marketing/email-marketing", label: "Email Marketing", icon: Mail },
        { path: "/marketing/analytics", label: "Analytics & ROI", icon: LineChart },
      ],
    },
    {
      name: "ai-analytics",
      label: "AI & Analytics",
      icon: Sparkles,
      badge: "GPU",
      items: [
        { path: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
        { path: "/call-intelligence", label: "Call Intelligence", icon: PhoneCall, badge: "NEW" },
        { path: "/analytics/bi", label: "BI Dashboard", icon: PieChart },
        { path: "/analytics/ftfr", label: "First-Time Fix Rate", icon: CheckCircle },
        { path: "/predictive-maintenance", label: "AI Predictions", icon: Zap },
      ],
    },
    {
      name: "support",
      label: "Support",
      icon: LifeBuoy,
      items: [
        { path: "/tickets", label: "Tickets", icon: LifeBuoy },
      ],
    },
    {
      name: "system",
      label: "System",
      icon: Settings,
      items: [
        { path: "/users", label: "Users", icon: User },
        { path: "/admin", label: "Settings", icon: Settings },
        { path: "/admin/import", label: "Data Import", icon: Download },
        { path: "/admin/dump-sites", label: "Dump Sites", icon: Truck },
      ],
    },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

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

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.path));

  return (
    <EmailComposeProvider>
    <div className="flex h-screen bg-bg-body">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* ========== Premium Dark Sidebar ========== */}
      <aside className={`w-64 flex-col overflow-hidden ${
        isTechnician ? "hidden md:flex" : "hidden md:flex"
      } bg-gradient-to-b from-[#0c1929] via-[#0f2035] to-[#0c1929]`}>

        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.08] flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2aabe1] to-[#104b95] flex items-center justify-center shadow-lg shadow-[#2aabe1]/20 group-hover:shadow-[#2aabe1]/40 transition-all duration-300">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-white font-semibold text-sm block tracking-wide">Mac Service</span>
              <span className="text-white/40 text-[11px] block">Platform</span>
            </div>
          </Link>
        </div>

        {/* Navigation — Scrollable */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 sidebar-scroll">
          {isTechnician ? (
            /* ---- Technician Nav ---- */
            <ul className="space-y-1">
              {techNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-white/[0.08] text-white shadow-sm shadow-black/10"
                          : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? "text-[#2aabe1]" : ""}`} />
                      {item.label}
                      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2aabe1]" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            /* ---- Admin Nav ---- */
            <>
              {/* Top-level items */}
              <ul className="space-y-0.5 mb-5">
                {topNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          active
                            ? "bg-white/[0.08] text-white"
                            : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? "text-[#2aabe1]" : ""}`} />
                        <span className="truncate">{item.label}</span>
                        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2aabe1] shrink-0" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Collapsible Groups */}
              <div className="space-y-2">
                {navGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const expanded = expandedGroups.has(group.name);
                  const groupActive = isGroupActive(group);

                  return (
                    <div key={group.name}>
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all duration-150 ${
                          groupActive
                            ? "text-white/70"
                            : "text-white/30 hover:text-white/50"
                        }`}
                      >
                        <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 text-left">{group.label}</span>
                        {group.badge && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-white/[0.08] text-white/50 rounded font-medium tracking-normal">
                            {group.badge}
                          </span>
                        )}
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                      </button>

                      {/* Group Items */}
                      {expanded && (
                        <ul className="mt-1 space-y-0.5 ml-1.5 border-l border-white/[0.06] pl-2">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                              <li key={item.path}>
                                <Link
                                  to={item.path}
                                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                                    active
                                      ? "bg-white/[0.08] text-white font-medium"
                                      : "text-white/45 hover:text-white/75 hover:bg-white/[0.03]"
                                  }`}
                                >
                                  <Icon className={`w-[15px] h-[15px] shrink-0 transition-colors ${active ? "text-[#2aabe1]" : ""}`} />
                                  <span className="truncate">{item.label}</span>
                                  {item.badge && (
                                    <span className={`ml-auto px-1.5 py-0.5 text-[9px] rounded font-semibold shrink-0 ${
                                      item.badge === "LIVE"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : item.badge === "NEW"
                                          ? "bg-amber-500/20 text-amber-400"
                                          : "bg-white/[0.08] text-white/50"
                                    }`}>
                                      {item.badge}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="px-4 py-3 border-t border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#2aabe1] to-[#104b95] text-white flex items-center justify-center text-sm font-semibold shadow-lg shadow-[#2aabe1]/10">
              {user?.first_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[11px] text-white/35 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white/70 transition-colors"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isDark ? "Light" : "Dark"}
            </button>
            <span className="text-white/10">|</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[12px] text-white/35 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Admin mobile drawer */}
      {!isTechnician && (
        <AdminMobileDrawer
          open={adminDrawerOpen}
          onClose={() => setAdminDrawerOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 overflow-auto flex flex-col min-w-0"
        tabIndex={-1}
      >
        {/* Mobile header for technicians */}
        {isTechnician && (
          <div className="md:hidden">
            <MobileHeader />
          </div>
        )}

        {/* Mobile header for admins */}
        {!isTechnician && (
          <div className="md:hidden">
            <AdminMobileHeader onMenuOpen={() => setAdminDrawerOpen(true)} />
          </div>
        )}

        {/* Desktop top bar */}
        <div className="h-12 border-b border-border bg-bg-card px-6 hidden md:flex items-center justify-end gap-4">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <ConnectionStatus showTooltip size="sm" />
          <NotificationCenter />
          <RCStatusIndicator />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav — technicians */}
      {isTechnician && (
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      )}

      {/* Mobile bottom nav — admins */}
      {!isTechnician && (
        <div className="md:hidden">
          <AdminMobileBottomNav />
        </div>
      )}

    </div>
    </EmailComposeProvider>
  );
}
