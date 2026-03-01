import { useEffect, useCallback, useRef, useState } from "react";
import { useDanniaStore } from "./danniaStore";
import { checkFailureConditions } from "./failureDetection";
import { checkNewBadges } from "./gamification";
import { showToast } from "@/components/ui/Toast";
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

      // Update lifetime stats & check for new badges
      const state = useDanniaStore.getState();
      const lt = { ...state.lifetimeStats };
      lt.totalCalls += 1;
      if (connected) lt.totalConnected += 1;
      if (interested) lt.totalInterested += 1;
      if (voicemail) lt.totalVoicemails += 1;
      if (state.performanceMetrics.currentStreak > lt.longestStreak) {
        lt.longestStreak = state.performanceMetrics.currentStreak;
      }
      if (state.performanceMetrics.todayCallsMade > lt.bestDayCalls) {
        lt.bestDayCalls = state.performanceMetrics.todayCallsMade;
      }
      if (state.performanceMetrics.connectRate > lt.bestDayConnectRate) {
        lt.bestDayConnectRate = state.performanceMetrics.connectRate;
      }
      state.updateLifetimeStats(lt);

      // Check for new badges
      const newBadges = checkNewBadges(
        state.performanceMetrics,
        lt,
        state.earnedBadges,
      );
      for (const badge of newBadges) {
        state.earnBadge(badge.id);
        showToast({
          title: `${badge.icon} Badge Earned: ${badge.name}!`,
          description: badge.description,
          variant: "success",
          duration: 4000,
        });
      }
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
