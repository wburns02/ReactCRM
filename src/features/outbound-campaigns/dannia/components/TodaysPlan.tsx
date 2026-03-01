import { useMemo } from "react";
import { Phone, Clock, TrendingUp, Users, Shield } from "lucide-react";
import { useScheduleEngine } from "../useScheduleEngine";
import { usePerformanceLoop } from "../usePerformanceLoop";
import { useDanniaStore } from "../danniaStore";
import { useOutboundStore } from "../../store";
import { PerformanceMeter } from "./PerformanceMeter";
import { ScoreExplanation } from "./ScoreExplanation";
import { scoreContactV2 } from "../scoringV2";
import { formatHour } from "../constants";
import { ZONE_CONFIG } from "../../types";
import type { FailureCondition } from "../failureDetection";

function QuickStats({
  callsMade,
  maxCalls,
  currentBlockLabel,
  connectRate,
  interested,
}: {
  callsMade: number;
  maxCalls: number;
  currentBlockLabel: string;
  connectRate: number;
  interested: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
        <Phone className="w-4 h-4 mx-auto mb-1 text-primary" />
        <div className="text-lg font-bold text-text-primary tabular-nums">
          {callsMade}/{maxCalls}
        </div>
        <div className="text-[10px] text-text-tertiary">Calls Today</div>
      </div>
      <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
        <Clock className="w-4 h-4 mx-auto mb-1 text-blue-500" />
        <div className="text-sm font-bold text-text-primary truncate">
          {currentBlockLabel}
        </div>
        <div className="text-[10px] text-text-tertiary">Current Block</div>
      </div>
      <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
        <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
        <div className="text-lg font-bold text-text-primary tabular-nums">
          {connectRate.toFixed(0)}%
        </div>
        <div className="text-[10px] text-text-tertiary">Connect Rate</div>
      </div>
      <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
        <Users className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
        <div className="text-lg font-bold text-text-primary tabular-nums">
          {interested}
        </div>
        <div className="text-[10px] text-text-tertiary">Interested</div>
      </div>
    </div>
  );
}

function FailureAlerts({ failures }: { failures: FailureCondition[] }) {
  if (failures.length === 0) return null;

  return (
    <div className="space-y-2">
      {failures.map((f, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
            f.severity === "critical"
              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
          }`}
        >
          <div className="flex-1">
            <div className="font-medium text-xs">{f.message}</div>
            <div className="text-xs opacity-80 mt-0.5">{f.suggestion}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface TodaysPlanProps {
  onStartDialing: () => void;
  dialingActive: boolean;
}

export function TodaysPlan({ onStartDialing, dialingActive }: TodaysPlanProps) {
  const { todayPlan, currentBlock, getNextContacts } = useScheduleEngine();
  const { activeFailures, performanceMetrics } = usePerformanceLoop();
  const config = useDanniaStore((s) => s.config);
  const allContacts = useOutboundStore((s) => s.contacts);

  const nextContacts = useMemo(() => getNextContacts(5), [getNextContacts]);

  const scoredNext = useMemo(
    () =>
      nextContacts.map((c) => ({
        contact: c,
        score: scoreContactV2(c, { allContacts }),
      })),
    [nextContacts, allContacts],
  );

  const blockLabel = currentBlock
    ? `${currentBlock.label} (${formatHour(currentBlock.startHour)}-${formatHour(currentBlock.endHour)})`
    : todayPlan
      ? "Between blocks"
      : "No schedule";

  const blockProgress = currentBlock
    ? `${currentBlock.completedIds.length}/${currentBlock.contactIds.length}`
    : "";

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <QuickStats
        callsMade={performanceMetrics.todayCallsMade}
        maxCalls={config.maxCallsPerDay}
        currentBlockLabel={currentBlock?.label ?? "—"}
        connectRate={performanceMetrics.connectRate}
        interested={performanceMetrics.todayInterested}
      />

      {/* Performance meter */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <PerformanceMeter connectRate={performanceMetrics.connectRate} />
      </div>

      {/* Failure alerts */}
      <FailureAlerts failures={activeFailures} />

      {/* Current block + progress */}
      {todayPlan && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                {blockLabel}
              </div>
              {blockProgress && (
                <div className="text-xs text-text-tertiary">
                  {blockProgress} contacts
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
              <Shield className="w-3 h-3" />
              {config.maxCallsPerDay} calls max
            </div>
          </div>

          {/* Next up queue */}
          {scoredNext.length > 0 ? (
            <div>
              <div className="text-xs text-text-tertiary font-medium mb-2">
                Next Up
              </div>
              <div className="space-y-1.5">
                {scoredNext.map(({ contact, score }) => {
                  const zc = contact.service_zone
                    ? ZONE_CONFIG[contact.service_zone]
                    : null;
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-hover text-sm"
                    >
                      <ScoreExplanation
                        score={score.normalizedTotal}
                        explanation={score.explanation}
                      />
                      <span className="font-medium text-text-primary truncate flex-1">
                        {contact.account_name}
                      </span>
                      {zc && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold ${zc.color}`}
                        >
                          {zc.shortLabel}
                        </span>
                      )}
                      {contact.days_since_expiry != null &&
                        contact.days_since_expiry > 0 && (
                          <span className="text-[10px] text-amber-600 tabular-nums">
                            {contact.days_since_expiry}d exp
                          </span>
                        )}
                      {contact.call_status === "callback_scheduled" && (
                        <span className="text-[10px] text-indigo-600 font-medium">
                          Callback
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-text-tertiary">
              {performanceMetrics.todayCallsMade >= config.maxCallsPerDay
                ? "Daily limit reached! Great work today."
                : "No contacts scheduled for this block."}
            </div>
          )}
        </div>
      )}

      {/* START/PAUSE DIALING button */}
      <div className="text-center">
        <button
          onClick={onStartDialing}
          disabled={
            scoredNext.length === 0 &&
            !dialingActive &&
            performanceMetrics.todayCallsMade < config.maxCallsPerDay
          }
          className={`px-8 py-3 rounded-xl text-base font-bold shadow-sm transition-colors ${
            dialingActive
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-primary hover:bg-primary/90 text-white"
          } disabled:opacity-40`}
        >
          {dialingActive ? "PAUSE DIALING" : "START DIALING"}
        </button>
      </div>
    </div>
  );
}
