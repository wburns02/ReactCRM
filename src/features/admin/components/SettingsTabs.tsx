import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils.ts";

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: "general", label: "General", icon: "⚙️" },
  { id: "notifications", label: "Notifications", icon: "📧" },
  { id: "integrations", label: "Integrations", icon: "🔌" },
  { id: "security", label: "Security", icon: "🔒" },
  { id: "api", label: "API", icon: "🔑" },
];

export function SettingsTabs() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeTab = params.get("tab") || "general";
  const basePath = location.pathname;

  return (
    <div className="border-b border-border">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={`${basePath}?tab=${tab.id}`}
              className={cn(
                "flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-border",
              )}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
