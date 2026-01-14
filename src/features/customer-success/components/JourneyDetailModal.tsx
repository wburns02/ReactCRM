/**
 * Journey Detail Modal Component
 *
 * World-class journey visualization with flow diagram, analytics, and management options.
 * Features: Visual flow diagram, step analytics, enrollment tracking, A/B test indicators.
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils.ts";
import type {
  Journey,
  JourneyStep,
  JourneyStatus,
} from "@/api/types/customerSuccess.ts";

interface JourneyDetailModalProps {
  journey: Journey;
  isOpen: boolean;
  onClose: () => void;
  onToggleActive?: (journey: Journey) => void;
  onEdit?: (journey: Journey) => void;
  onEnrollCustomer?: (journey: Journey) => void;
}

const STATUS_CONFIG: Record<
  JourneyStatus,
  { label: string; className: string; dotColor: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-500/10 text-gray-500",
    dotColor: "bg-gray-500",
  },
  active: {
    label: "Active",
    className: "bg-success/10 text-success",
    dotColor: "bg-success",
  },
  paused: {
    label: "Paused",
    className: "bg-warning/10 text-warning",
    dotColor: "bg-warning",
  },
  archived: {
    label: "Archived",
    className: "bg-text-muted/10 text-text-muted",
    dotColor: "bg-gray-400",
  },
};

const JOURNEY_TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; className: string; gradient: string }
> = {
  onboarding: {
    label: "Onboarding",
    icon: "🚀",
    className: "bg-blue-500/10 text-blue-500",
    gradient: "from-blue-500 to-cyan-500",
  },
  adoption: {
    label: "Adoption",
    icon: "📈",
    className: "bg-green-500/10 text-green-500",
    gradient: "from-green-500 to-emerald-500",
  },
  retention: {
    label: "Retention",
    icon: "🔄",
    className: "bg-cyan-500/10 text-cyan-500",
    gradient: "from-cyan-500 to-blue-500",
  },
  expansion: {
    label: "Expansion",
    icon: "💎",
    className: "bg-purple-500/10 text-purple-500",
    gradient: "from-purple-500 to-pink-500",
  },
  renewal: {
    label: "Renewal",
    icon: "📋",
    className: "bg-amber-500/10 text-amber-500",
    gradient: "from-amber-500 to-orange-500",
  },
  win_back: {
    label: "Win Back",
    icon: "🎯",
    className: "bg-red-500/10 text-red-500",
    gradient: "from-red-500 to-rose-500",
  },
  custom: {
    label: "Custom",
    icon: "⚙️",
    className: "bg-gray-500/10 text-gray-500",
    gradient: "from-gray-500 to-slate-500",
  },
};

const STEP_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  email: {
    label: "Email",
    icon: "📧",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  task: {
    label: "Task",
    icon: "✅",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
  },
  wait: {
    label: "Wait",
    icon: "⏳",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  condition: {
    label: "Condition",
    icon: "🔀",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/30",
    borderColor: "border-purple-300 dark:border-purple-700",
  },
  webhook: {
    label: "Webhook",
    icon: "🔗",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
    borderColor: "border-gray-300 dark:border-gray-700",
  },
  human_touchpoint: {
    label: "Human Touch",
    icon: "👤",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/30",
    borderColor: "border-cyan-300 dark:border-cyan-700",
  },
  in_app_message: {
    label: "In-App",
    icon: "💬",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/30",
    borderColor: "border-indigo-300 dark:border-indigo-700",
  },
  sms: {
    label: "SMS",
    icon: "📱",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-900/30",
    borderColor: "border-teal-300 dark:border-teal-700",
  },
  notification: {
    label: "Notification",
    icon: "🔔",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    borderColor: "border-orange-300 dark:border-orange-700",
  },
  update_field: {
    label: "Update Field",
    icon: "📝",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/30",
    borderColor: "border-slate-300 dark:border-slate-700",
  },
  add_tag: {
    label: "Add Tag",
    icon: "🏷️",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-900/30",
    borderColor: "border-pink-300 dark:border-pink-700",
  },
  enroll_journey: {
    label: "Enroll Journey",
    icon: "🗺️",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-900/30",
    borderColor: "border-violet-300 dark:border-violet-700",
  },
  trigger_playbook: {
    label: "Trigger Playbook",
    icon: "📘",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/30",
    borderColor: "border-rose-300 dark:border-rose-700",
  },
  health_check: {
    label: "Health Check",
    icon: "💓",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-700",
  },
  custom: {
    label: "Custom",
    icon: "⚙️",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
    borderColor: "border-gray-300 dark:border-gray-700",
  },
};

type ViewMode = "flow" | "list" | "analytics";

// Visual Flow Node Component
function FlowNode({
  step,
  index,
  isLast,
  isCondition,
}: {
  step: JourneyStep;
  index: number;
  isLast: boolean;
  isCondition?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const stepConfig =
    STEP_TYPE_CONFIG[step.step_type] || STEP_TYPE_CONFIG.custom;
  const hasWait = step.wait_duration_hours && step.wait_duration_hours > 0;

  return (
    <div className="relative flex flex-col items-center">
      {/* Wait indicator before step */}
      {hasWait && index > 0 && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-200 dark:border-amber-800">
          <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
            ⏱️ Wait {step.wait_duration_hours}h
          </span>
        </div>
      )}

      {/* Step Node */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          "relative group w-full max-w-[280px] p-4 rounded-xl border-2 transition-all duration-200",
          stepConfig.bgColor,
          stepConfig.borderColor,
          "hover:shadow-lg hover:scale-[1.02]",
          showDetails &&
            "ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900",
        )}
      >
        {/* Step number badge */}
        <div
          className={cn(
            "absolute -top-3 -left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md",
            "bg-gradient-to-br",
            stepConfig.color.includes("blue")
              ? "from-blue-500 to-blue-600"
              : stepConfig.color.includes("green")
                ? "from-green-500 to-green-600"
                : stepConfig.color.includes("amber")
                  ? "from-amber-500 to-amber-600"
                  : stepConfig.color.includes("purple")
                    ? "from-purple-500 to-purple-600"
                    : stepConfig.color.includes("cyan")
                      ? "from-cyan-500 to-cyan-600"
                      : stepConfig.color.includes("pink")
                        ? "from-pink-500 to-pink-600"
                        : stepConfig.color.includes("teal")
                          ? "from-teal-500 to-teal-600"
                          : stepConfig.color.includes("orange")
                            ? "from-orange-500 to-orange-600"
                            : stepConfig.color.includes("red")
                              ? "from-red-500 to-red-600"
                              : "from-gray-500 to-gray-600",
          )}
        >
          {index + 1}
        </div>

        {/* Step type icon and label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{stepConfig.icon}</span>
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              stepConfig.color,
            )}
          >
            {stepConfig.label}
          </span>
        </div>

        {/* Step name */}
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
          {step.name}
        </h4>

        {/* Step description preview */}
        {step.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {step.description}
          </p>
        )}

        {/* Expand indicator */}
        <div
          className={cn(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border-2 flex items-center justify-center transition-transform",
            stepConfig.borderColor,
            showDetails ? "rotate-180" : "",
          )}
        >
          <svg
            className="w-3 h-3 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {showDetails && (
        <div
          className={cn(
            "mt-4 p-4 rounded-lg border w-full max-w-[320px]",
            "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
            "shadow-lg animate-in fade-in slide-in-from-top-2 duration-200",
          )}
        >
          {step.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {step.description}
            </p>
          )}

          {step.condition_rules != null && (
            <div className="mb-3">
              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Conditions
              </h5>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                {String(JSON.stringify(step.condition_rules, null, 2))}
              </pre>
            </div>
          )}

          {step.action_config != null && (
            <div>
              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Configuration
              </h5>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto border-l-2 border-primary">
                {String(JSON.stringify(step.action_config, null, 2))}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            {step.wait_until_time && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Until: {step.wait_until_time}
              </span>
            )}
            {step.is_required && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Required
              </span>
            )}
            {!step.is_active && <span className="text-red-500">Inactive</span>}
          </div>
        </div>
      )}

      {/* Connector line to next step */}
      {!isLast && (
        <div className="flex flex-col items-center my-2">
          <div className="w-0.5 h-6 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500" />
          {isCondition ? (
            <div className="w-3 h-3 rotate-45 bg-purple-500 border-2 border-purple-400" />
          ) : (
            <svg
              className="w-4 h-4 text-gray-400 dark:text-gray-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 16l-6-6h12l-6 6z" />
            </svg>
          )}
          <div className="w-0.5 h-6 bg-gradient-to-b from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-600" />
        </div>
      )}
    </div>
  );
}

// Flow View Component
function FlowView({ steps }: { steps: JourneyStep[] }) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <svg
          className="w-16 h-16 mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="text-lg font-medium">No steps defined</p>
        <p className="text-sm mt-1">Add steps to build this journey</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-6 px-4">
      {/* Start Node */}
      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full border-2 border-green-400 dark:border-green-600 mb-4">
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
          START
        </span>
      </div>

      <div className="w-0.5 h-8 bg-gradient-to-b from-green-400 to-gray-400 dark:from-green-600 dark:to-gray-500" />
      <svg
        className="w-4 h-4 text-gray-400 -my-1"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 16l-6-6h12l-6 6z" />
      </svg>
      <div className="w-0.5 h-4 bg-gray-400 dark:bg-gray-500" />

      {/* Steps */}
      {steps.map((step, index) => (
        <FlowNode
          key={step.id || index}
          step={step}
          index={index}
          isLast={index === steps.length - 1}
          isCondition={step.step_type === "condition"}
        />
      ))}

      {/* End Node */}
      <div className="w-0.5 h-4 bg-gray-400 dark:bg-gray-500" />
      <svg
        className="w-4 h-4 text-gray-400 -my-1"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 16l-6-6h12l-6 6z" />
      </svg>
      <div className="w-0.5 h-8 bg-gradient-to-b from-gray-400 to-red-400 dark:from-gray-500 dark:to-red-600" />

      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-full border-2 border-red-400 dark:border-red-600 mt-4">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span className="text-sm font-semibold text-red-700 dark:text-red-400">
          END
        </span>
      </div>
    </div>
  );
}

// List View Component (Original enhanced)
function ListView({ steps }: { steps: JourneyStep[] }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No steps defined for this journey</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const stepConfig =
          STEP_TYPE_CONFIG[step.step_type] || STEP_TYPE_CONFIG.custom;
        const isExpanded = expandedStep === index;

        return (
          <div
            key={step.id || index}
            className={cn(
              "border rounded-lg overflow-hidden transition-all",
              stepConfig.borderColor,
              stepConfig.bgColor,
            )}
          >
            <button
              onClick={() => setExpandedStep(isExpanded ? null : index)}
              className="w-full p-4 flex items-start gap-4 text-left hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm shadow-sm">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <span className="text-lg">{stepConfig.icon}</span>
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full bg-white/80 dark:bg-black/20 font-medium",
                      stepConfig.color,
                    )}
                  >
                    {stepConfig.label}
                  </span>
                  {step.wait_duration_hours && step.wait_duration_hours > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Wait {step.wait_duration_hours}h
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                  {step.name}
                </h4>
                {step.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 line-clamp-2">
                    {step.description}
                  </p>
                )}
              </div>

              <svg
                className={cn(
                  "w-5 h-5 text-gray-400 transition-transform flex-shrink-0",
                  isExpanded && "rotate-180",
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
                <div className="pl-12 space-y-4">
                  {step.condition_rules != null && (
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                        Condition Rules
                      </h5>
                      <pre className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 overflow-x-auto">
                        {String(JSON.stringify(step.condition_rules, null, 2))}
                      </pre>
                    </div>
                  )}

                  {step.action_config != null && (
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                        Action Configuration
                      </h5>
                      <pre className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 border-l-4 border-l-primary overflow-x-auto">
                        {String(JSON.stringify(step.action_config, null, 2))}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300 flex-wrap">
                    {step.wait_until_time && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Wait until: {step.wait_until_time}
                      </span>
                    )}
                    {step.is_required && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        Required
                      </span>
                    )}
                    {!step.is_active && (
                      <span className="text-gray-500 dark:text-gray-400">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Analytics View Component
function AnalyticsView({
  journey,
  steps,
}: {
  journey: Journey;
  steps: JourneyStep[];
}) {
  // Calculate step type distribution
  const stepTypeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    steps.forEach((step) => {
      distribution[step.step_type] = (distribution[step.step_type] || 0) + 1;
    });
    return Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  }, [steps]);

  // Calculate total wait time
  const totalWaitHours = useMemo(() => {
    return steps.reduce(
      (total, step) => total + (step.wait_duration_hours || 0),
      0,
    );
  }, [steps]);

  const totalWaitDays = Math.round((totalWaitHours / 24) * 10) / 10;

  return (
    <div className="space-y-6 py-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
            Total Steps
          </p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
            {steps.length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide">
            Journey Duration
          </p>
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {totalWaitDays}d
          </p>
          <p className="text-xs text-amber-500 mt-1">
            {totalWaitHours} hours total
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">
            Enrolled
          </p>
          <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
            {journey.active_enrollments || journey.active_enrolled || 0}
          </p>
          <p className="text-xs text-green-500 mt-1">
            {journey.total_enrolled || 0} total
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide">
            Conversion
          </p>
          <p
            className={cn(
              "text-3xl font-bold mt-1",
              (journey.conversion_rate || 0) >= 50
                ? "text-green-600 dark:text-green-400"
                : (journey.conversion_rate || 0) >= 25
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400",
            )}
          >
            {(journey.conversion_rate || 0).toFixed(1)}%
          </p>
          <p className="text-xs text-purple-500 mt-1">
            {journey.completed_count || 0} completed
          </p>
        </div>
      </div>

      {/* Step Type Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Step Type Distribution
        </h4>
        <div className="space-y-3">
          {stepTypeDistribution.map(([type, count]) => {
            const config = STEP_TYPE_CONFIG[type] || STEP_TYPE_CONFIG.custom;
            const percentage = Math.round((count / steps.length) * 100);

            return (
              <div key={type} className="flex items-center gap-3">
                <span className="text-xl w-8">{config.icon}</span>
                <span className={cn("text-sm font-medium w-28", config.color)}>
                  {config.label}
                </span>
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      config.bgColor,
                      "bg-opacity-100 dark:bg-opacity-100",
                    )}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: config.color.includes("blue")
                        ? "#3b82f6"
                        : config.color.includes("green")
                          ? "#22c55e"
                          : config.color.includes("amber")
                            ? "#f59e0b"
                            : config.color.includes("purple")
                              ? "#a855f7"
                              : config.color.includes("cyan")
                                ? "#06b6d4"
                                : config.color.includes("pink")
                                  ? "#ec4899"
                                  : config.color.includes("teal")
                                    ? "#14b8a6"
                                    : config.color.includes("orange")
                                      ? "#f97316"
                                      : config.color.includes("red")
                                        ? "#ef4444"
                                        : "#6b7280",
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-right">
                  {count} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Journey Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Journey Timeline
        </h4>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-4 pl-6">
            {steps.map((step, index) => {
              const config =
                STEP_TYPE_CONFIG[step.step_type] || STEP_TYPE_CONFIG.custom;
              const cumulativeHours = steps
                .slice(0, index + 1)
                .reduce((sum, s) => sum + (s.wait_duration_hours || 0), 0);

              return (
                <div key={step.id || index} className="relative">
                  <div
                    className={cn(
                      "absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800",
                      step.step_type === "condition"
                        ? "bg-purple-500"
                        : step.step_type === "wait"
                          ? "bg-amber-500"
                          : "bg-blue-500",
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
                      {cumulativeHours > 0 ? `+${cumulativeHours}h` : "0h"}
                    </span>
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {step.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function JourneyDetailModal({
  journey,
  isOpen,
  onClose,
  onToggleActive,
  onEdit,
  onEnrollCustomer,
}: JourneyDetailModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("flow");

  if (!isOpen) return null;

  const journeyType =
    JOURNEY_TYPE_CONFIG[journey.journey_type] || JOURNEY_TYPE_CONFIG.custom;
  const statusConfig = STATUS_CONFIG[journey.status];
  const steps = journey.steps || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 sm:pt-12 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header with gradient */}
        <div
          className={cn(
            "flex-shrink-0 relative overflow-hidden",
            "bg-gradient-to-r",
            journeyType.gradient,
          )}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/20 text-white backdrop-blur-sm">
                    {journeyType.icon} {journeyType.label}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-sm flex items-center gap-1.5",
                      "bg-white/20 text-white",
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        statusConfig.dotColor,
                        journey.status === "active" && "animate-pulse",
                      )}
                    />
                    {statusConfig.label}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {journey.name}
                </h2>
                {journey.description && (
                  <p className="text-sm text-white/80 mt-1 max-w-xl">
                    {journey.description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-white/90">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span className="font-semibold">{steps.length}</span> steps
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/90">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-semibold">
                  {journey.active_enrollments || journey.active_enrolled || 0}
                </span>{" "}
                enrolled
              </div>
              {journey.conversion_rate !== null &&
                journey.conversion_rate !== undefined && (
                  <div className="flex items-center gap-1.5 text-sm text-white/90">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span className="font-semibold">
                      {journey.conversion_rate.toFixed(1)}%
                    </span>{" "}
                    conversion
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6">
          <div className="flex gap-1">
            {(
              [
                { id: "flow", label: "Flow View", icon: "🔀" },
                { id: "list", label: "List View", icon: "📋" },
                { id: "analytics", label: "Analytics", icon: "📊" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  viewMode === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                )}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/50">
          {viewMode === "flow" && <FlowView steps={steps} />}
          {viewMode === "list" && <ListView steps={steps} />}
          {viewMode === "analytics" && (
            <AnalyticsView journey={journey} steps={steps} />
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {journey.trigger_type && journey.trigger_type !== "manual" && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Trigger: {journey.trigger_type.replace("_", " ")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                onClick={() => onEdit(journey)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Edit Journey
              </button>
            )}
            {onEnrollCustomer && journey.status === "active" && (
              <button
                onClick={() => onEnrollCustomer(journey)}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Enroll Customer
              </button>
            )}
            {onToggleActive && journey.status !== "archived" && (
              <button
                onClick={() => onToggleActive(journey)}
                className={cn(
                  "px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2",
                  journey.status === "active"
                    ? "bg-warning/10 text-warning hover:bg-warning/20"
                    : "bg-success/10 text-success hover:bg-success/20",
                )}
              >
                {journey.status === "active" ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Activate
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
