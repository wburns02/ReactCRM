/**
 * Role Dashboard Component
 *
 * Shows role-specific dashboard content for demo users.
 * Each role gets a customized view focused on their responsibilities.
 */

import { Link } from "react-router-dom";
import { useOptionalRole, type RoleKey } from "@/providers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// ============================================
// Quick Action Types
// ============================================

interface QuickAction {
  key: string;
  label: string;
  icon: string;
  route: string;
  description: string;
}

const QUICK_ACTIONS: Record<string, QuickAction> = {
  create_work_order: {
    key: "create_work_order",
    label: "New Work Order",
    icon: "🔧",
    route: "/work-orders/new",
    description: "Create a new work order",
  },
  add_customer: {
    key: "add_customer",
    label: "Add Customer",
    icon: "👤",
    route: "/customers/new",
    description: "Add a new customer",
  },
  view_reports: {
    key: "view_reports",
    label: "View Reports",
    icon: "📊",
    route: "/reports",
    description: "Access analytics and reports",
  },
  manage_users: {
    key: "manage_users",
    label: "Manage Users",
    icon: "👥",
    route: "/users",
    description: "User administration",
  },
  view_schedule: {
    key: "view_schedule",
    label: "View Schedule",
    icon: "📅",
    route: "/schedule",
    description: "View and manage schedule",
  },
  assign_technician: {
    key: "assign_technician",
    label: "Assign Work",
    icon: "🎯",
    route: "/schedule",
    description: "Assign work to technicians",
  },
  contact_customer: {
    key: "contact_customer",
    label: "Contact Customer",
    icon: "📞",
    route: "/customers",
    description: "Contact a customer",
  },
  start_job: {
    key: "start_job",
    label: "Start Job",
    icon: "▶️",
    route: "/my-schedule",
    description: "Start your next job",
  },
  complete_job: {
    key: "complete_job",
    label: "Complete Job",
    icon: "✅",
    route: "/work-orders",
    description: "Mark a job complete",
  },
  add_notes: {
    key: "add_notes",
    label: "Add Notes",
    icon: "📝",
    route: "/work-orders",
    description: "Add notes to a job",
  },
  call_customer: {
    key: "call_customer",
    label: "Call Customer",
    icon: "📱",
    route: "/customers",
    description: "Call a customer",
  },
  search_customer: {
    key: "search_customer",
    label: "Search Customer",
    icon: "🔍",
    route: "/customers",
    description: "Find a customer",
  },
  schedule_appointment: {
    key: "schedule_appointment",
    label: "Schedule Appt",
    icon: "📆",
    route: "/schedule",
    description: "Schedule an appointment",
  },
  send_sms: {
    key: "send_sms",
    label: "Send SMS",
    icon: "💬",
    route: "/communications",
    description: "Send a text message",
  },
  assign_job: {
    key: "assign_job",
    label: "Assign Job",
    icon: "🎯",
    route: "/schedule",
    description: "Assign a job to a tech",
  },
  optimize_routes: {
    key: "optimize_routes",
    label: "Optimize Routes",
    icon: "🗺️",
    route: "/schedule-map",
    description: "Optimize technician routes",
  },
  contact_technician: {
    key: "contact_technician",
    label: "Contact Tech",
    icon: "📡",
    route: "/technicians",
    description: "Contact a technician",
  },
  reschedule: {
    key: "reschedule",
    label: "Reschedule",
    icon: "🔄",
    route: "/schedule",
    description: "Reschedule a job",
  },
  create_invoice: {
    key: "create_invoice",
    label: "Create Invoice",
    icon: "📄",
    route: "/invoices/new",
    description: "Create a new invoice",
  },
  record_payment: {
    key: "record_payment",
    label: "Record Payment",
    icon: "💳",
    route: "/payments",
    description: "Record a payment",
  },
  send_reminder: {
    key: "send_reminder",
    label: "Send Reminder",
    icon: "⏰",
    route: "/invoices",
    description: "Send payment reminder",
  },
  generate_statement: {
    key: "generate_statement",
    label: "Generate Statement",
    icon: "📋",
    route: "/reports/statements",
    description: "Generate a statement",
  },
  export_data: {
    key: "export_data",
    label: "Export Data",
    icon: "📤",
    route: "/reports",
    description: "Export data to CSV",
  },
  schedule_review: {
    key: "schedule_review",
    label: "Schedule Review",
    icon: "📅",
    route: "/reports",
    description: "Schedule a review meeting",
  },
};

// ============================================
// Role Header Configs
// ============================================

const ROLE_CONFIGS: Record<
  RoleKey,
  {
    title: string;
    subtitle: string;
    gradient: string;
    modules: { name: string; route: string; icon: string }[];
  }
> = {
  admin: {
    title: "Administrator Dashboard",
    subtitle: "Full system access and management",
    gradient: "from-purple-600 to-purple-800",
    modules: [
      { name: "Users", route: "/users", icon: "👥" },
      { name: "Settings", route: "/settings", icon: "⚙️" },
      { name: "Reports", route: "/reports", icon: "📊" },
      { name: "System", route: "/admin", icon: "🔧" },
    ],
  },
  executive: {
    title: "Executive Dashboard",
    subtitle: "High-level KPIs and business intelligence",
    gradient: "from-blue-600 to-blue-800",
    modules: [
      { name: "Revenue", route: "/reports/revenue", icon: "💰" },
      { name: "Analytics", route: "/analytics", icon: "📈" },
      { name: "Forecasts", route: "/predictions", icon: "🔮" },
      { name: "Customer Success", route: "/customer-success", icon: "🎯" },
    ],
  },
  manager: {
    title: "Operations Dashboard",
    subtitle: "Team management and scheduling oversight",
    gradient: "from-green-600 to-green-800",
    modules: [
      { name: "Schedule", route: "/schedule", icon: "📅" },
      { name: "Team", route: "/technicians", icon: "👷" },
      { name: "Work Orders", route: "/work-orders", icon: "🔧" },
      { name: "Customers", route: "/customers", icon: "👤" },
    ],
  },
  technician: {
    title: "Field Technician Dashboard",
    subtitle: "Your jobs and assignments",
    gradient: "from-orange-600 to-orange-800",
    modules: [
      { name: "My Jobs", route: "/my-schedule", icon: "📋" },
      { name: "Equipment", route: "/equipment", icon: "🔩" },
      { name: "Route", route: "/schedule-map", icon: "🗺️" },
      { name: "Time", route: "/time-tracking", icon: "⏱️" },
    ],
  },
  phone_agent: {
    title: "Phone Agent Dashboard",
    subtitle: "Customer service and scheduling",
    gradient: "from-cyan-600 to-cyan-800",
    modules: [
      { name: "Customers", route: "/customers", icon: "👤" },
      { name: "Calls", route: "/calls", icon: "📞" },
      { name: "Schedule", route: "/schedule", icon: "📅" },
      { name: "Messages", route: "/communications", icon: "💬" },
    ],
  },
  dispatcher: {
    title: "Dispatch Dashboard",
    subtitle: "Route management and live tracking",
    gradient: "from-indigo-600 to-indigo-800",
    modules: [
      { name: "Live Map", route: "/schedule-map", icon: "🗺️" },
      { name: "Schedule", route: "/schedule", icon: "📅" },
      { name: "Fleet", route: "/fleet", icon: "🚛" },
      { name: "Techs", route: "/technicians", icon: "👷" },
    ],
  },
  billing: {
    title: "Billing Dashboard",
    subtitle: "Invoicing and payment management",
    gradient: "from-emerald-600 to-emerald-800",
    modules: [
      { name: "Invoices", route: "/invoices", icon: "📄" },
      { name: "Payments", route: "/payments", icon: "💳" },
      { name: "Aging", route: "/reports/aging", icon: "📊" },
      { name: "Customers", route: "/customers", icon: "👤" },
    ],
  },
};

// ============================================
// Main Component
// ============================================

export function RoleDashboard() {
  const roleContext = useOptionalRole();

  // If not a demo user or no role, don't render role-specific content
  if (!roleContext?.isDemoUser || !roleContext.currentRole) {
    return null;
  }

  const { currentRole, currentRoleKey, quickActions } = roleContext;
  const roleConfig = currentRoleKey ? ROLE_CONFIGS[currentRoleKey] : null;

  if (!roleConfig) return null;

  return (
    <div className="mb-6">
      {/* Role Banner */}
      <div
        className={cn(
          "rounded-xl p-6 mb-6 text-white",
          `bg-gradient-to-r ${roleConfig.gradient}`,
        )}
      >
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">{currentRole.icon}</span>
          <div>
            <h2 className="text-2xl font-bold">{roleConfig.title}</h2>
            <p className="text-white/80">{roleConfig.subtitle}</p>
          </div>
        </div>

        {/* Quick Module Access */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {roleConfig.modules.map((module) => (
            <Link
              key={module.route}
              to={module.route}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-colors"
            >
              <span className="text-xl">{module.icon}</span>
              <span className="font-medium">{module.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions for Role */}
      {quickActions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Quick Actions</span>
              <span className="text-sm font-normal text-text-secondary">
                for {currentRole.display_name}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((actionKey) => {
                const action = QUICK_ACTIONS[actionKey];
                if (!action) return null;

                return (
                  <Link
                    key={action.key}
                    to={action.route}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <div>
                      <div className="font-medium text-text-primary">
                        {action.label}
                      </div>
                      <div className="text-xs text-text-muted">
                        {action.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Description */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>💡</span>
            <span>
              You're viewing the CRM as a{" "}
              <strong>{currentRole.display_name}</strong>.
              {currentRole.description && ` ${currentRole.description}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RoleDashboard;
