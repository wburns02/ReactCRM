import { type QuoteStatus, QUOTE_STATUS_META, QUOTE_STAGE_ORDER } from "@/api/types/quote";
import { Tooltip } from "@/components/ui/Tooltip";

interface EstimateStatusBarProps {
  status: QuoteStatus;
  invoiceId?: string;
}

/**
 * Visual progress bar showing estimate lifecycle stages:
 * Draft -> Sent -> Accepted -> Invoiced
 *
 * Declined/Expired are shown as alternate states branching from Sent
 */
export function EstimateStatusBar({ status, invoiceId }: EstimateStatusBarProps) {
  const isDeclined = status === "declined";
  const isExpired = status === "expired";
  const isTerminal = isDeclined || isExpired;

  // Get the index of the current status in the main flow
  const getCurrentStageIndex = (): number => {
    if (isTerminal) return 1; // Declined/Expired branch off after "sent"
    const index = QUOTE_STAGE_ORDER.indexOf(status as typeof QUOTE_STAGE_ORDER[number]);
    return index >= 0 ? index : 0;
  };

  const currentIndex = getCurrentStageIndex();

  // Determine if a stage is complete, current, or upcoming
  const getStageState = (stageIndex: number): "complete" | "current" | "upcoming" => {
    if (isTerminal && stageIndex > 1) return "upcoming";
    if (stageIndex < currentIndex) return "complete";
    if (stageIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 mb-6" data-testid="status-bar">
      {/* Status Progress Bar */}
      <div className="flex items-center justify-between mb-3">
        {QUOTE_STAGE_ORDER.map((stage, index) => {
          const meta = QUOTE_STATUS_META[stage];
          const state = getStageState(index);
          const isLast = index === QUOTE_STAGE_ORDER.length - 1;

          return (
            <div key={stage} className="flex items-center flex-1">
              {/* Stage Circle */}
              <Tooltip content={meta.description}>
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                    ${state === "complete" ? "bg-green-500 border-green-500 text-white" : ""}
                    ${state === "current" ? `${meta.bgClass} border-current ring-4 ring-opacity-30` : ""}
                    ${state === "upcoming" ? "bg-bg-primary border-border text-text-muted" : ""}
                  `}
                  style={state === "current" ? { borderColor: meta.color, "--tw-ring-color": meta.color } as React.CSSProperties : undefined}
                  data-testid={`status-${stage}`}
                >
                  {state === "complete" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-lg">{meta.icon}</span>
                  )}
                </div>
              </Tooltip>

              {/* Stage Label (below circle on desktop, hidden on mobile) */}
              <div className="hidden sm:block ml-2 mr-4">
                <p className={`text-sm font-medium ${state === "current" ? meta.textClass : state === "complete" ? "text-green-600" : "text-text-muted"}`}>
                  {meta.label}
                </p>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-1 mx-2">
                  <div
                    className={`h-full rounded transition-all duration-300 ${
                      state === "complete" || (state === "current" && index < currentIndex)
                        ? "bg-green-500"
                        : "bg-border"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stage Labels */}
      <div className="sm:hidden flex justify-between text-xs text-text-muted mt-2">
        {QUOTE_STAGE_ORDER.map((stage) => {
          const meta = QUOTE_STATUS_META[stage];
          const state = getStageState(QUOTE_STAGE_ORDER.indexOf(stage));
          return (
            <span
              key={stage}
              className={state === "current" ? meta.textClass + " font-medium" : ""}
            >
              {meta.label}
            </span>
          );
        })}
      </div>

      {/* Current Status Description */}
      <div className="mt-4 pt-3 border-t border-border">
        {isTerminal ? (
          <div className={`flex items-center gap-2 ${QUOTE_STATUS_META[status].textClass}`}>
            <span className="text-xl">{QUOTE_STATUS_META[status].icon}</span>
            <div>
              <p className="font-medium">{QUOTE_STATUS_META[status].label}</p>
              <p className="text-sm opacity-80">{QUOTE_STATUS_META[status].description}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xl">{QUOTE_STATUS_META[status].icon}</span>
            <div>
              <p className={`font-medium ${QUOTE_STATUS_META[status].textClass}`}>
                {QUOTE_STATUS_META[status].label}
              </p>
              <p className="text-sm text-text-muted">{QUOTE_STATUS_META[status].description}</p>
            </div>
            {status === "invoiced" && invoiceId && (
              <a
                href={`/invoices/${invoiceId}`}
                className="ml-auto text-sm text-primary hover:underline"
              >
                View Invoice &rarr;
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
