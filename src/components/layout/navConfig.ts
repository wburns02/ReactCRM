import {
  LayoutDashboard, Users, ClipboardList, FileText, CalendarCheck, Heart,
  Home, Wrench, Calendar, Clock, DollarSign, Map, MessageSquare, Settings,
  Clipboard, Phone, Wallet, Package, Megaphone, Sparkles, LifeBuoy,
  Target, MapPin, HardHat, Smartphone, RefreshCw, ShieldCheck, Timer,
  Inbox, MessageCircle, Mail, PhoneCall, Bell, Plug, Receipt, CreditCard,
  BarChart3, TrendingUp, Banknote, Calculator, Building2, Truck, Activity,
  Flame, Star, Search, Bot, LineChart, PieChart, CheckCircle, Zap, User,
  Download, Globe, Eye, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  name: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  items: NavItem[];
}

export const topNavItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/prospects", label: "Prospects", icon: ClipboardList },
  { path: "/contracts", label: "Contracts & Maintenance", icon: FileText },
  { path: "/bookings", label: "Bookings", icon: CalendarCheck },
  { path: "/customer-success", label: "Customer Success", icon: Heart },
];

export const techNavItems: NavItem[] = [
  { path: "/my-dashboard", label: "My Dashboard", icon: Home },
  { path: "/portal/jobs", label: "My Jobs", icon: Wrench },
  { path: "/portal/schedule", label: "My Schedule", icon: Calendar },
  { path: "/portal/time-clock", label: "Time Clock", icon: Clock },
  { path: "/portal/pay", label: "Pay & Performance", icon: DollarSign },
  { path: "/field", label: "Field View", icon: Map },
  { path: "/portal/messages", label: "Messages", icon: MessageSquare },
  { path: "/portal/settings", label: "Settings", icon: Settings },
];

export const navGroups: NavGroup[] = [
  {
    name: "operations",
    label: "Operations",
    icon: Clipboard,
    items: [
      { path: "/god-mode", label: "God Mode", icon: Eye, badge: "LIVE" },
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
      { path: "/quotes", label: "Quotes", icon: FileText },
      { path: "/grease-trap-pricing", label: "Grease Trap Pricing", icon: Flame },
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
      { path: "/coaching", label: "AI Coaching", icon: Sparkles, badge: "NEW" },
      { path: "/predictive-service", label: "Service Predictions", icon: TrendingUp, badge: "NEW" },
    ],
  },
  {
    name: "property-intel",
    label: "Property Intel",
    icon: Globe,
    badge: "5M+",
    items: [
      { path: "/property-intelligence", label: "Dashboard", icon: LayoutDashboard },
      { path: "/property-intelligence/search", label: "Property Search", icon: Search },
      { path: "/permits", label: "Septic Permits", icon: FileText },
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
      { path: "/admin/entities", label: "Entities (LLCs)", icon: Building2 },
      { path: "/admin", label: "Settings", icon: Settings },
      { path: "/admin/import", label: "Data Import", icon: Download },
      { path: "/admin/dump-sites", label: "Dump Sites", icon: Truck },
      { path: "/admin/activity", label: "Activity Log", icon: Activity },
    ],
  },
];
