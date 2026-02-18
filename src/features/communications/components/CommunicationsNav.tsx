import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** Match exactly or as prefix */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/communications", label: "Unified Inbox", icon: "📥", exact: true },
  { to: "/communications/sms", label: "SMS", icon: "💬" },
  { to: "/communications/email-inbox", label: "Email", icon: "📧" },
  { to: "/calls", label: "Calls", icon: "📞", exact: true },
  { to: "/communications/templates", label: "Templates", icon: "📝" },
  { to: "/communications/reminders", label: "Reminders", icon: "🔔" },
];

export function CommunicationsNav() {
  const { pathname } = useLocation();

  return (
    <div className="flex-shrink-0 border-t border-border bg-bg-card px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.to
          : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors",
              isActive
                ? "bg-primary text-white font-medium shadow-sm"
                : "border border-border hover:bg-bg-hover text-text-secondary",
            )}
          >
            <span className="text-xs">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
