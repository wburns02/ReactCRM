import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type {
  DanniaStoreState,
  PerformanceMetrics,
  CallbackEntry,
  AuditLogEntry,
  WeeklySchedule,
  DailyPlan,
  WeeklyReport,
  DanniaModeConfig,
  SmsStep,
  CallRecordingEntry,
} from "./types";
import {
  EMPTY_LIFETIME_STATS,
  DEFAULT_VM_DROP_CONFIG,
} from "./gamification";
import type { LifetimeStats, VoicemailDropConfig } from "./gamification";
import { DEFAULT_DANNIA_CONFIG, AUDIT_LOG_MAX } from "./constants";

const idbStorage = createJSONStorage(() => ({
  getItem: async (name: string): Promise<string | null> => {
    const val = await idbGet(name);
    if (val === undefined) {
      const lsVal = localStorage.getItem(name);
      if (lsVal) {
        await idbSet(name, lsVal);
        localStorage.removeItem(name);
        return lsVal;
      }
      return null;
    }
    return val ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name);
  },
}));

const EMPTY_PERFORMANCE: PerformanceMetrics = {
  todayCallsMade: 0,
  todayConnected: 0,
  todayInterested: 0,
  todayVoicemails: 0,
  connectRate: 0,
  interestRate: 0,
  callsPerHour: 0,
  currentStreak: 0,
  bestStreak: 0,
  hourlyData: [],
};

export const useDanniaStore = create<DanniaStoreState>()(
  persist(
    (set, get) => ({
      currentSchedule: null,
      performanceMetrics: { ...EMPTY_PERFORMANCE },
      callbacks: [],
      auditLog: [],
      config: { ...DEFAULT_DANNIA_CONFIG },
      weeklyReports: [],
      activeBlockId: null,
      dialingActive: false,
      earnedBadges: [],
      lifetimeStats: { ...EMPTY_LIFETIME_STATS },
      voicemailDropConfig: { ...DEFAULT_VM_DROP_CONFIG },
      pendingSmsSteps: [],
      recentCallRecords: [],

      // Schedule actions
      setSchedule: (schedule: WeeklySchedule) => {
        set({ currentSchedule: schedule });
      },

      updateDayPlan: (date: string, plan: DailyPlan) => {
        set((s) => {
          if (!s.currentSchedule) return s;
          return {
            currentSchedule: {
              ...s.currentSchedule,
              days: s.currentSchedule.days.map((d) =>
                d.date === date ? plan : d,
              ),
            },
          };
        });
      },

      markBlockContact: (
        blockId: string,
        contactId: string,
        date: string,
      ): boolean => {
        const state = get();
        // Enforce daily limit
        const todayPlan = state.currentSchedule?.days.find(
          (d) => d.date === date,
        );
        if (todayPlan) {
          const todayCompleted = todayPlan.blocks.reduce(
            (sum, b) => sum + b.completedIds.length,
            0,
          );
          if (todayCompleted >= state.config.maxCallsPerDay) {
            return false;
          }
        }

        set((s) => {
          if (!s.currentSchedule) return s;
          return {
            currentSchedule: {
              ...s.currentSchedule,
              days: s.currentSchedule.days.map((d) => {
                if (d.date !== date) return d;
                return {
                  ...d,
                  blocks: d.blocks.map((b) => {
                    if (b.id !== blockId) return b;
                    if (b.completedIds.includes(contactId)) return b;
                    return {
                      ...b,
                      completedIds: [...b.completedIds, contactId],
                    };
                  }),
                  completedCount:
                    d.completedCount +
                    (d.blocks.find((b) => b.id === blockId)?.completedIds.includes(contactId) ? 0 : 1),
                };
              }),
            },
          };
        });
        return true;
      },

      completeBlock: (blockId: string, date: string) => {
        get().addAuditEntry({
          action: "block_completed",
          reason: `Block ${blockId} completed`,
          details: { blockId, date },
        });
      },

      setActiveBlock: (blockId: string | null) => {
        set({ activeBlockId: blockId });
      },

      setDialingActive: (active: boolean) => {
        set({ dialingActive: active });
      },

      // Performance actions
      recordCall: (metrics) => {
        set((s) => {
          const pm = { ...s.performanceMetrics };
          pm.todayCallsMade += 1;
          if (metrics.connected) {
            pm.todayConnected += 1;
            pm.currentStreak += 1;
            if (pm.currentStreak > pm.bestStreak) {
              pm.bestStreak = pm.currentStreak;
            }
          } else {
            pm.currentStreak = 0;
          }
          if (metrics.interested) pm.todayInterested += 1;
          if (metrics.voicemail) pm.todayVoicemails += 1;

          pm.connectRate =
            pm.todayCallsMade > 0
              ? (pm.todayConnected / pm.todayCallsMade) * 100
              : 0;
          pm.interestRate =
            pm.todayConnected > 0
              ? (pm.todayInterested / pm.todayConnected) * 100
              : 0;

          // Update hourly data
          const now = new Date();
          const hour = now.getHours();
          const dateStr = now.toISOString().split("T")[0];
          const existing = pm.hourlyData.find(
            (h) => h.hour === hour && h.date === dateStr,
          );
          if (existing) {
            existing.callsMade += 1;
            if (metrics.connected) existing.connected += 1;
            if (metrics.interested) existing.interested += 1;
            if (metrics.voicemail) existing.voicemails += 1;
            if (metrics.noAnswer) existing.noAnswers += 1;
            // Running average duration
            existing.avgDurationSec =
              (existing.avgDurationSec * (existing.callsMade - 1) +
                metrics.durationSec) /
              existing.callsMade;
          } else {
            pm.hourlyData = [
              ...pm.hourlyData,
              {
                hour,
                date: dateStr,
                callsMade: 1,
                connected: metrics.connected ? 1 : 0,
                interested: metrics.interested ? 1 : 0,
                voicemails: metrics.voicemail ? 1 : 0,
                noAnswers: metrics.noAnswer ? 1 : 0,
                avgDurationSec: metrics.durationSec,
              },
            ];
          }

          // Calls per hour (since first call today)
          const todayHours = pm.hourlyData.filter((h) => h.date === dateStr);
          if (todayHours.length > 0) {
            const minHour = Math.min(...todayHours.map((h) => h.hour));
            const hoursWorked = Math.max(1, hour - minHour + 1);
            pm.callsPerHour = pm.todayCallsMade / hoursWorked;
          }

          return { performanceMetrics: pm };
        });
      },

      resetDailyMetrics: () => {
        set((s) => ({
          performanceMetrics: {
            ...EMPTY_PERFORMANCE,
            bestStreak: s.performanceMetrics.bestStreak,
          },
        }));
      },

      // Callback actions
      addCallback: (entry) => {
        const id = crypto.randomUUID();
        set((s) => ({
          callbacks: [...s.callbacks, { ...entry, id }],
        }));
      },

      updateCallback: (id, updates) => {
        set((s) => ({
          callbacks: s.callbacks.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        }));
      },

      removeCallback: (id) => {
        set((s) => ({
          callbacks: s.callbacks.filter((c) => c.id !== id),
        }));
      },

      // Audit actions
      addAuditEntry: (entry) => {
        const id = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        set((s) => {
          const log = [{ ...entry, id, timestamp }, ...s.auditLog];
          return { auditLog: log.slice(0, AUDIT_LOG_MAX) };
        });
      },

      // Config
      updateConfig: (updates) => {
        set((s) => ({
          config: { ...s.config, ...updates },
        }));
      },

      // Reports
      addWeeklyReport: (report: WeeklyReport) => {
        set((s) => ({
          weeklyReports: [report, ...s.weeklyReports].slice(0, 52), // keep 1 year
        }));
      },

      // Gamification
      earnBadge: (badgeId: string) => {
        set((s) => {
          if (s.earnedBadges.includes(badgeId)) return s;
          return { earnedBadges: [...s.earnedBadges, badgeId] };
        });
      },

      updateLifetimeStats: (updates: Partial<LifetimeStats>) => {
        set((s) => ({
          lifetimeStats: { ...s.lifetimeStats, ...updates },
        }));
      },

      // Voicemail drop
      updateVoicemailDropConfig: (updates: Partial<VoicemailDropConfig>) => {
        set((s) => ({
          voicemailDropConfig: { ...s.voicemailDropConfig, ...updates },
        }));
      },

      // SMS sequences
      addSmsStep: (step: Omit<SmsStep, "id">) => {
        const id = crypto.randomUUID();
        set((s) => {
          const steps = [{ ...step, id }, ...s.pendingSmsSteps];
          // Prune sent/failed older than 7 days, cap at 200
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const pruned = steps.filter(
            (st) =>
              st.status === "pending" ||
              (st.sentAt && st.sentAt > sevenDaysAgo) ||
              st.scheduledAt > sevenDaysAgo,
          );
          return { pendingSmsSteps: pruned.slice(0, 200) };
        });
      },

      markSmsStepSent: (id: string) => {
        set((s) => ({
          pendingSmsSteps: s.pendingSmsSteps.map((st) =>
            st.id === id
              ? { ...st, status: "sent" as const, sentAt: Date.now() }
              : st,
          ),
        }));
      },

      markSmsStepFailed: (id: string, error: string) => {
        set((s) => ({
          pendingSmsSteps: s.pendingSmsSteps.map((st) =>
            st.id === id ? { ...st, status: "failed" as const, error } : st,
          ),
        }));
      },

      clearSmsStepsForContact: (contactId: string) => {
        set((s) => ({
          pendingSmsSteps: s.pendingSmsSteps.filter(
            (st) => st.contactId !== contactId,
          ),
        }));
      },

      // Call recordings
      addCallRecord: (entry: Omit<CallRecordingEntry, "id">) => {
        const id = crypto.randomUUID();
        set((s) => ({
          recentCallRecords: [{ ...entry, id }, ...s.recentCallRecords].slice(
            0,
            50,
          ),
        }));
      },

      // Queries
      getTodayPlan: () => {
        const schedule = get().currentSchedule;
        if (!schedule) return null;
        const today = new Date().toISOString().split("T")[0];
        return schedule.days.find((d) => d.date === today) ?? null;
      },

      getCurrentBlock: () => {
        const todayPlan = get().getTodayPlan();
        if (!todayPlan) return null;
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        return (
          todayPlan.blocks.find(
            (b) => currentHour >= b.startHour && currentHour < b.endHour,
          ) ?? null
        );
      },

      getPendingCallbacks: () => {
        return get().callbacks.filter(
          (c) => c.status === "pending" || c.status === "placed",
        );
      },

      getTodayCallCount: () => {
        return get().performanceMetrics.todayCallsMade;
      },

      canMakeMoreCalls: () => {
        const state = get();
        return (
          state.performanceMetrics.todayCallsMade <
          state.config.maxCallsPerDay
        );
      },
    }),
    {
      name: "dannia-mode-store",
      version: 3,
      storage: idbStorage,
      partialize: (state) => ({
        currentSchedule: state.currentSchedule,
        performanceMetrics: state.performanceMetrics,
        callbacks: state.callbacks,
        auditLog: state.auditLog,
        config: state.config,
        weeklyReports: state.weeklyReports,
        earnedBadges: state.earnedBadges,
        lifetimeStats: state.lifetimeStats,
        voicemailDropConfig: state.voicemailDropConfig,
        pendingSmsSteps: state.pendingSmsSteps,
        recentCallRecords: state.recentCallRecords,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          // v1 → v2: add gamification + voicemail drop fields
          if (!state.earnedBadges) state.earnedBadges = [];
          if (!state.lifetimeStats) state.lifetimeStats = { ...EMPTY_LIFETIME_STATS };
          if (!state.voicemailDropConfig) state.voicemailDropConfig = { ...DEFAULT_VM_DROP_CONFIG };
        }
        if (version < 3) {
          // v2 → v3: add SMS sequences + call recordings
          if (!state.pendingSmsSteps) state.pendingSmsSteps = [];
          if (!state.recentCallRecords) state.recentCallRecords = [];
        }
        return state as DanniaStoreState;
      },
    },
  ),
);
