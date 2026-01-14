import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import {
  useExecutiveMode,
  type ExecutiveModeSettings,
} from "@/api/hooks/useAIDispatch";
import { cn } from "@/lib/utils";

/**
 * Executive Mode Toggle & Settings Panel
 *
 * Executive Mode enables autonomous execution of high-confidence AI suggestions.
 * This is the "2026 differentiator" - AI that *executes*, not just *suggests*.
 */
export function ExecutiveModeToggle() {
  const {
    settings,
    setSettings,
    toggleEnabled,
    autoExecutionCount,
    remainingAutoExecutions,
  } = useExecutiveMode();

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="space-y-3">
      {/* Main Toggle */}
      <div
        className={cn(
          "p-3 rounded-lg border-2 transition-all duration-200",
          settings.enabled
            ? "bg-gradient-to-r from-purple-500/10 to-primary/10 border-purple-500/50"
            : "bg-bg-muted/50 border-border",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all",
                settings.enabled
                  ? "bg-gradient-to-r from-purple-500 to-primary text-white animate-pulse"
                  : "bg-bg-muted text-text-muted",
              )}
            >
              {settings.enabled ? "AI" : "AI"}
            </div>
            <div>
              <h4 className="font-semibold text-text-primary flex items-center gap-2">
                Executive Mode
                {settings.enabled && (
                  <Badge className="bg-purple-500 text-white text-xs">
                    ACTIVE
                  </Badge>
                )}
              </h4>
              <p className="text-xs text-text-secondary">
                {settings.enabled
                  ? `Auto-executing ${Math.round(settings.confidenceThreshold * 100)}%+ confidence suggestions`
                  : "AI will suggest actions for your approval"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.enabled}
              onCheckedChange={toggleEnabled}
              aria-label="Toggle Executive Mode"
            />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 hover:bg-bg-hover rounded transition-colors"
              aria-label="Settings"
            >
              <svg
                className="w-5 h-5 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Status Bar when enabled */}
        {settings.enabled && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-text-muted">
                Auto-executed:{" "}
                <strong className="text-text-primary">
                  {autoExecutionCount}
                </strong>
              </span>
              <span className="text-text-muted">
                Remaining:{" "}
                <strong className="text-text-primary">
                  {remainingAutoExecutions}
                </strong>
                /hr
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-success">Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="p-4 space-y-4 animate-in slide-in-from-top-2">
          <h4 className="font-medium text-text-primary">
            Executive Mode Settings
          </h4>

          {/* Confidence Threshold */}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              Confidence Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.7"
                max="1.0"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) =>
                  setSettings({
                    confidenceThreshold: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-2 bg-bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-lg font-bold text-primary w-16 text-right">
                {Math.round(settings.confidenceThreshold * 100)}%
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Only suggestions with confidence above this threshold will
              auto-execute
            </p>
          </div>

          {/* Allowed Action Types */}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              Allowed Action Types
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "assign",
                  "reschedule",
                  "route_optimize",
                  "parts_order",
                  "follow_up",
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    const newTypes = settings.allowedTypes.includes(type)
                      ? settings.allowedTypes.filter((t) => t !== type)
                      : [...settings.allowedTypes, type];
                    setSettings({
                      allowedTypes:
                        newTypes as ExecutiveModeSettings["allowedTypes"],
                    });
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    settings.allowedTypes.includes(type)
                      ? "bg-primary text-white"
                      : "bg-bg-muted text-text-secondary hover:bg-bg-hover",
                  )}
                >
                  {type === "assign" && "Assign Jobs"}
                  {type === "reschedule" && "Reschedule"}
                  {type === "route_optimize" && "Route Optimize"}
                  {type === "parts_order" && "Parts Orders"}
                  {type === "follow_up" && "Follow-ups"}
                </button>
              ))}
            </div>
          </div>

          {/* Max Auto-Executions */}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              Max Auto-Executions per Hour
            </label>
            <div className="flex items-center gap-2">
              {[5, 10, 20, 50].map((val) => (
                <button
                  key={val}
                  onClick={() => setSettings({ maxAutoExecutionsPerHour: val })}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    settings.maxAutoExecutionsPerHour === val
                      ? "bg-primary text-white"
                      : "bg-bg-muted text-text-secondary hover:bg-bg-hover",
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Safety limit to prevent runaway automation
            </p>
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Show Notifications</p>
              <p className="text-xs text-text-muted">
                Get notified when actions are auto-executed
              </p>
            </div>
            <Switch
              checked={settings.showNotifications}
              onCheckedChange={(checked: boolean) =>
                setSettings({ showNotifications: checked })
              }
            />
          </div>

          {/* Warning */}
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-xs text-warning font-medium">
              Executive Mode will automatically execute AI suggestions without
              confirmation. Review settings carefully before enabling.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function ExecutiveModeIndicator() {
  const { settings, toggleEnabled } = useExecutiveMode();

  return (
    <button
      onClick={toggleEnabled}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        settings.enabled
          ? "bg-gradient-to-r from-purple-500 to-primary text-white"
          : "bg-bg-muted text-text-secondary hover:bg-bg-hover",
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          settings.enabled ? "bg-white animate-pulse" : "bg-text-muted",
        )}
      />
      Executive Mode {settings.enabled ? "ON" : "OFF"}
    </button>
  );
}

export default ExecutiveModeToggle;
