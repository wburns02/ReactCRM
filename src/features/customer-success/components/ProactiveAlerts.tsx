/**
 * Proactive Alerts Component
 *
 * Shows urgent alerts that require immediate action:
 * - SLA about to breach
 * - Critical escalations unassigned
 * - No response for 2+ hours
 *
 * Designed to grab attention and drive immediate action
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { cn } from "@/lib/utils";

interface Alert {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  escalation_id: number;
  title: string;
  message: string;
  action: string;
}

interface AlertsResponse {
  alerts: Alert[];
  total: number;
}

interface ProactiveAlertsProps {
  onSelectEscalation: (id: number) => void;
}

function AlertCard({
  alert,
  onAction,
}: {
  alert: Alert;
  onAction: () => void;
}) {
  const severityConfig = {
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500",
      text: "text-red-600",
      icon: "🚨",
    },
    high: {
      bg: "bg-orange-500/10",
      border: "border-orange-500",
      text: "text-orange-600",
      icon: "⚠️",
    },
    medium: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500",
      text: "text-yellow-600",
      icon: "📢",
    },
    low: {
      bg: "bg-blue-500/10",
      border: "border-blue-500",
      text: "text-blue-600",
      icon: "ℹ️",
    },
  };

  const config = severityConfig[alert.severity];

  const actionLabels: Record<string, string> = {
    call: "📞 Call Now",
    assign: "👤 Assign",
    respond: "💬 Respond",
    escalate: "⬆️ Escalate",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:shadow-md",
        config.bg,
        config.border,
      )}
      onClick={onAction}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className={cn("font-bold", config.text)}>{alert.message}</p>
            <p className="text-sm text-text-muted line-clamp-1">
              {alert.title}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-white transition-colors",
            alert.severity === "critical"
              ? "bg-red-600 hover:bg-red-700"
              : alert.severity === "high"
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-primary hover:bg-primary-dark",
          )}
        >
          {actionLabels[alert.action] || "Take Action"}
        </button>
      </div>
    </div>
  );
}

export function ProactiveAlerts({ onSelectEscalation }: ProactiveAlertsProps) {
  const { data, isLoading } = useQuery<AlertsResponse>({
    queryKey: ["proactive-alerts"],
    queryFn: async () => {
      const response = await apiClient.get("/cs/escalations/ai/alerts");
      return response.data;
    },
    refetchInterval: 15000, // Refresh every 15 seconds for urgent alerts
  });

  if (isLoading || !data || data.alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <h3 className="font-bold text-text-primary">
          {data.total} Alert{data.total !== 1 ? "s" : ""} Need Attention
        </h3>
      </div>

      <div className="space-y-3">
        {data.alerts.map((alert, index) => (
          <AlertCard
            key={`${alert.escalation_id}-${index}`}
            alert={alert}
            onAction={() => onSelectEscalation(alert.escalation_id)}
          />
        ))}
      </div>
    </div>
  );
}

export default ProactiveAlerts;
