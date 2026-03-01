import { useEffect, useCallback, useRef, useState } from "react";
import { useDanniaStore } from "./danniaStore";
import { checkFailureConditions } from "./failureDetection";
import type { FailureCondition } from "./failureDetection";
import type { ContactCallStatus } from "../types";

const CONNECTED_STATUSES: ContactCallStatus[] = [
  "connected",
  "interested",
  "not_interested",
  "completed",
];

const HOURLY_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

/**
 * Hook that monitors performance and auto-adjusts.
 * - `onDisposition()` callback should be called after each call disposition
 * - Runs hourly failure checks via setInterval
 */
export function usePerformanceLoop() {
  const config = useDanniaStore((s) => s.config);
  const performanceMetrics = useDanniaStore((s) => s.performanceMetrics);
  const recordCall = useDanniaStore((s) => s.recordCall);
  const addAuditEntry = useDanniaStore((s) => s.addAuditEntry);
  const [activeFailures, setActiveFailures] = useState<FailureCondition[]>([]);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Process a call disposition
  const onDisposition = useCallback(
    (status: ContactCallStatus, durationSec: number = 0) => {
      const connected = CONNECTED_STATUSES.includes(status);
      const interested = status === "interested";
      const voicemail = status === "voicemail";
      const noAnswer = status === "no_answer" || status === "busy";

      recordCall({
        connected,
        interested,
        voicemail,
        noAnswer,
        durationSec,
      });

      addAuditEntry({
        action: "contact_called",
        reason: `Call completed: ${status}`,
        details: { status, durationSec, connected, interested },
      });
    },
    [recordCall, addAuditEntry],
  );

  // Hourly failure check
  const runFailureCheck = useCallback(() => {
    const state = useDanniaStore.getState();
    const failures = checkFailureConditions(
      state.performanceMetrics.hourlyData,
      state.config,
    );

    setActiveFailures(failures);

    for (const failure of failures) {
      if (failure.type === "low_connect_rate") {
        addAuditEntry({
          action: "failure_detected",
          reason: failure.message,
          details: { type: failure.type, severity: failure.severity },
        });
      } else if (failure.type === "low_interest_rate") {
        addAuditEntry({
          action: "urgency_boost",
          reason: failure.message,
          details: { type: failure.type },
        });
      } else if (failure.type === "low_velocity") {
        addAuditEntry({
          action: "break_suggested",
          reason: failure.message,
          details: { type: failure.type },
        });
      }
    }
  }, [addAuditEntry]);

  // Start hourly check interval
  useEffect(() => {
    checkIntervalRef.current = setInterval(runFailureCheck, HOURLY_CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [runFailureCheck]);

  // Reset daily metrics at day change
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const lastHourDate = performanceMetrics.hourlyData.length > 0
      ? performanceMetrics.hourlyData[performanceMetrics.hourlyData.length - 1].date
      : todayStr;

    if (lastHourDate !== todayStr && performanceMetrics.todayCallsMade > 0) {
      useDanniaStore.getState().resetDailyMetrics();
    }
  }, []);

  return {
    onDisposition,
    activeFailures,
    performanceMetrics,
    runFailureCheck,
  };
}
