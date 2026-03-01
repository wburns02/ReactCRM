import { useEffect, useCallback, useMemo } from "react";
import { useOutboundStore } from "../store";
import { useDanniaStore } from "./danniaStore";
import { generateWeeklyPlan, regenerateDayPlan, getWeekStart } from "./scheduleAlgorithm";
import type { CampaignContact } from "../types";

/**
 * Hook that manages schedule generation and loading.
 * Generates/loads the weekly plan on mount. Provides actions to interact with the schedule.
 */
export function useScheduleEngine() {
  const campaigns = useOutboundStore((s) => s.campaigns);
  const allContacts = useOutboundStore((s) => s.contacts);
  const currentSchedule = useDanniaStore((s) => s.currentSchedule);
  const config = useDanniaStore((s) => s.config);
  const performanceMetrics = useDanniaStore((s) => s.performanceMetrics);
  const setSchedule = useDanniaStore((s) => s.setSchedule);
  const addAuditEntry = useDanniaStore((s) => s.addAuditEntry);

  // Get all callable contacts across all active campaigns
  const callableContacts = useMemo(() => {
    const activeCampaignIds = campaigns
      .filter((c) => c.status === "active")
      .map((c) => c.id);

    return allContacts.filter(
      (c) =>
        activeCampaignIds.includes(c.campaign_id) &&
        ["pending", "queued", "no_answer", "busy", "callback_scheduled"].includes(
          c.call_status,
        ) &&
        c.call_status !== "do_not_call",
    );
  }, [campaigns, allContacts]);

  // Build context for v2 scoring
  const scoringContext = useMemo(() => {
    const calledIds = new Set(
      allContacts
        .filter((c) => c.call_attempts > 0)
        .map((c) => c.id),
    );
    return {
      hourlyData: performanceMetrics.hourlyData,
      calledContactIds: calledIds,
      allContacts,
    };
  }, [allContacts, performanceMetrics.hourlyData]);

  // Check if we need to generate a new schedule
  useEffect(() => {
    const currentWeekStart = getWeekStart();

    const needsGeneration =
      !currentSchedule || currentSchedule.weekStart !== currentWeekStart;

    if (needsGeneration && callableContacts.length > 0) {
      const schedule = generateWeeklyPlan(
        callableContacts,
        config,
        scoringContext,
      );
      setSchedule(schedule);
      addAuditEntry({
        action: "schedule_generated",
        reason: `Weekly schedule generated for week of ${currentWeekStart}`,
        details: {
          totalContacts: callableContacts.length,
          daysPlanned: schedule.days.length,
          callbackReserve: schedule.callbackReserve,
        },
      });
    }
  }, [callableContacts.length]); // Only re-run when callable count changes significantly

  // Regenerate a specific day
  const regenerateDay = useCallback(
    (date: string) => {
      if (!currentSchedule) return;

      const newSchedule = regenerateDayPlan(
        currentSchedule,
        date,
        callableContacts,
        config,
      );
      setSchedule(newSchedule);
      addAuditEntry({
        action: "day_regenerated",
        reason: `Day plan regenerated for ${date}`,
        details: { date, contactsAvailable: callableContacts.length },
      });
    },
    [currentSchedule, callableContacts, config, setSchedule, addAuditEntry],
  );

  // Mark a contact as handled in a block
  const markBlockContact = useCallback(
    (blockId: string, contactId: string) => {
      const today = new Date().toISOString().split("T")[0];
      const success = useDanniaStore
        .getState()
        .markBlockContact(blockId, contactId, today);

      if (!success) {
        addAuditEntry({
          action: "daily_limit_reached",
          reason: `Daily limit of ${config.maxCallsPerDay} calls reached`,
        });
      }

      return success;
    },
    [config.maxCallsPerDay, addAuditEntry],
  );

  // Get contacts for a specific block (resolved from IDs)
  const getBlockContacts = useCallback(
    (contactIds: string[]): CampaignContact[] => {
      const contactMap = new Map(allContacts.map((c) => [c.id, c]));
      return contactIds
        .map((id) => contactMap.get(id))
        .filter((c): c is CampaignContact => c !== undefined);
    },
    [allContacts],
  );

  // Get today's plan
  const todayPlan = useDanniaStore((s) => s.getTodayPlan());
  const currentBlock = useDanniaStore((s) => s.getCurrentBlock());

  // Get next N contacts from current block
  const getNextContacts = useCallback(
    (count: number = 5): CampaignContact[] => {
      if (!currentBlock) {
        // Find the next active block
        if (!todayPlan) return [];
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        const nextBlock = todayPlan.blocks.find(
          (b) => b.capacity > 0 && b.endHour > currentHour && b.contactIds.length > 0,
        );
        if (!nextBlock) return [];
        const remaining = nextBlock.contactIds.filter(
          (id) => !nextBlock.completedIds.includes(id),
        );
        return getBlockContacts(remaining.slice(0, count));
      }

      const remaining = currentBlock.contactIds.filter(
        (id) => !currentBlock.completedIds.includes(id),
      );
      return getBlockContacts(remaining.slice(0, count));
    },
    [currentBlock, todayPlan, getBlockContacts],
  );

  return {
    schedule: currentSchedule,
    todayPlan,
    currentBlock,
    callableContacts,
    regenerateDay,
    markBlockContact,
    getBlockContacts,
    getNextContacts,
  };
}
