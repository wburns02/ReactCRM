import { useState } from "react";
import { ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useDanniaStore } from "../danniaStore";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  schedule_generated: { label: "Schedule", color: "text-blue-600" },
  day_regenerated: { label: "Regen", color: "text-blue-500" },
  block_completed: { label: "Block", color: "text-emerald-600" },
  contact_called: { label: "Call", color: "text-text-secondary" },
  callback_scheduled: { label: "Callback", color: "text-indigo-600" },
  callback_placed: { label: "CB Place", color: "text-indigo-500" },
  callback_no_show: { label: "No-Show", color: "text-amber-600" },
  failure_detected: { label: "Failure", color: "text-red-600" },
  zone_shift: { label: "Zone Shift", color: "text-purple-600" },
  urgency_boost: { label: "Boost", color: "text-amber-600" },
  break_suggested: { label: "Break", color: "text-amber-500" },
  config_changed: { label: "Config", color: "text-zinc-500" },
  daily_limit_reached: { label: "Limit", color: "text-red-500" },
};

export function AuditLogPanel() {
  const { isAdmin } = useAuth();
  const auditLog = useDanniaStore((s) => s.auditLog);
  const [expanded, setExpanded] = useState(false);
  const [showCount, setShowCount] = useState(20);

  if (!isAdmin) return null;

  const visibleEntries = expanded ? auditLog.slice(0, showCount) : auditLog.slice(0, 5);

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-primary hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-text-tertiary" />
          Audit Log
          <span className="text-[10px] text-text-tertiary bg-bg-hover px-1.5 py-0.5 rounded-full">
            {auditLog.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border max-h-96 overflow-y-auto">
          {visibleEntries.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-tertiary">
              No audit entries yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleEntries.map((entry) => {
                const actionConfig = ACTION_LABELS[entry.action] ?? {
                  label: entry.action,
                  color: "text-text-secondary",
                };
                const time = new Date(entry.timestamp);
                return (
                  <div key={entry.id} className="px-4 py-2 text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-medium ${actionConfig.color}`}>
                        {actionConfig.label}
                      </span>
                      <span className="text-text-tertiary">
                        {time.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      <span className="text-text-tertiary">
                        {time.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="text-text-secondary">{entry.reason}</div>
                  </div>
                );
              })}
            </div>
          )}

          {auditLog.length > showCount && (
            <div className="px-4 py-2 border-t border-border">
              <button
                onClick={() => setShowCount((c) => c + 50)}
                className="text-xs text-primary hover:underline"
              >
                Load more ({auditLog.length - showCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
