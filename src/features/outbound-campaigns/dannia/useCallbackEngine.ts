import { useCallback } from "react";
import { useDanniaStore } from "./danniaStore";
import { parseCallbackTime } from "./callbackParser";
import type { CallbackEntry } from "./types";

/**
 * Hook for managing callback scheduling.
 * - Parses callback time expressions into scheduled dates
 * - Places callbacks into the schedule
 * - Handles no-shows (1 retry within 24hrs, then demote)
 */
export function useCallbackEngine() {
  const callbacks = useDanniaStore((s) => s.callbacks);
  const performanceMetrics = useDanniaStore((s) => s.performanceMetrics);
  const addCallback = useDanniaStore((s) => s.addCallback);
  const updateCallback = useDanniaStore((s) => s.updateCallback);
  const addAuditEntry = useDanniaStore((s) => s.addAuditEntry);

  // Schedule a new callback
  const scheduleCallback = useCallback(
    (params: {
      contactId: string;
      contactName: string;
      phone: string;
      campaignId: string;
      rawInput: string;
    }) => {
      const parsed = parseCallbackTime(
        params.rawInput,
        performanceMetrics.hourlyData,
      );

      const entry: Omit<CallbackEntry, "id"> = {
        contactId: params.contactId,
        contactName: params.contactName,
        phone: params.phone,
        campaignId: params.campaignId,
        requestedAt: new Date().toISOString(),
        scheduledFor: parsed.scheduledFor.toISOString(),
        scheduledBlockId: null,
        rawInput: params.rawInput,
        parsedLabel: parsed.label,
        status: "pending",
        retryCount: 0,
        priority: "high",
      };

      addCallback(entry);
      addAuditEntry({
        action: "callback_scheduled",
        reason: `Callback scheduled for ${params.contactName}: ${parsed.label}`,
        details: {
          contactId: params.contactId,
          rawInput: params.rawInput,
          scheduledFor: parsed.scheduledFor.toISOString(),
          confidence: parsed.confidence,
        },
      });

      return { parsed, entry };
    },
    [performanceMetrics.hourlyData, addCallback, addAuditEntry],
  );

  // Mark a callback as completed
  const completeCallback = useCallback(
    (callbackId: string) => {
      updateCallback(callbackId, { status: "completed" });
    },
    [updateCallback],
  );

  // Handle a no-show: retry once within 24hrs, then demote
  const handleNoShow = useCallback(
    (callbackId: string) => {
      const cb = callbacks.find((c) => c.id === callbackId);
      if (!cb) return;

      if (cb.retryCount < 1) {
        // Retry: reschedule within 24hrs
        const retryTime = new Date();
        retryTime.setHours(retryTime.getHours() + 4); // retry 4 hours later

        updateCallback(callbackId, {
          status: "retried",
          retryCount: cb.retryCount + 1,
          scheduledFor: retryTime.toISOString(),
          parsedLabel: `Retry (no-show)`,
        });

        addAuditEntry({
          action: "callback_no_show",
          reason: `Callback no-show for ${cb.contactName}, scheduling retry`,
          details: { callbackId, retryCount: cb.retryCount + 1 },
        });
      } else {
        // Already retried — demote to standard
        updateCallback(callbackId, {
          status: "no_show",
          priority: "standard",
        });

        addAuditEntry({
          action: "callback_no_show",
          reason: `Callback no-show for ${cb.contactName} after retry, demoting to standard`,
          details: { callbackId, finalStatus: "demoted" },
        });
      }
    },
    [callbacks, updateCallback, addAuditEntry],
  );

  // Get callbacks due now or soon
  const getDueCallbacks = useCallback((): CallbackEntry[] => {
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 30 * 60 * 1000); // 30 min window

    return callbacks
      .filter(
        (c) =>
          (c.status === "pending" || c.status === "retried") &&
          new Date(c.scheduledFor) <= soonThreshold,
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
      );
  }, [callbacks]);

  const pendingCallbacks = callbacks.filter(
    (c) => c.status === "pending" || c.status === "placed" || c.status === "retried",
  );

  return {
    callbacks,
    pendingCallbacks,
    scheduleCallback,
    completeCallback,
    handleNoShow,
    getDueCallbacks,
  };
}
