import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type {
  RealtorAgent,
  RealtorStage,
  RealtorDisposition,
  Referral,
} from "./types";
import { SEED_AGENTS } from "./seedData";

/**
 * IndexedDB-backed storage for the realtor pipeline.
 * Same pattern as the outbound campaigns store.
 */
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

export type RealtorSortOrder = "urgency" | "name" | "stage" | "last_contact";

interface RealtorPipelineState {
  // Agents
  agents: RealtorAgent[];
  referrals: Referral[];

  // UI state
  selectedAgentId: string | null;
  sortOrder: RealtorSortOrder;
  stageFilter: RealtorStage | "all";
  searchQuery: string;

  // Dialer state
  dialerActive: boolean;
  dialerAgentIndex: number;

  // Agent CRUD
  addAgent(agent: Omit<RealtorAgent, "id" | "created_at" | "updated_at" | "call_attempts" | "total_referrals" | "total_revenue" | "one_pager_sent">): void;
  updateAgent(id: string, updates: Partial<RealtorAgent>): void;
  deleteAgent(id: string): void;
  setAgentStage(id: string, stage: RealtorStage): void;
  recordCall(id: string, disposition: RealtorDisposition, duration: number): void;

  // Referral CRUD
  addReferral(referral: Omit<Referral, "id">): void;
  updateReferral(id: string, updates: Partial<Referral>): void;
  deleteReferral(id: string): void;

  // UI actions
  setSelectedAgent(id: string | null): void;
  setSortOrder(order: RealtorSortOrder): void;
  setStageFilter(stage: RealtorStage | "all"): void;
  setSearchQuery(query: string): void;

  // Dialer actions
  startDialer(): void;
  stopDialer(): void;
  nextAgent(): void;

  // Import
  importAgents(rows: Array<{
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    brokerage?: string;
    city?: string;
    state?: string;
    coverage_area?: string;
  }>): number;
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

/** Calculate follow-up date based on stage */
function getNextFollowUp(stage: RealtorStage): string {
  const date = new Date();
  switch (stage) {
    case "active_referrer":
      date.setDate(date.getDate() + 14); // 2 weeks
      break;
    case "warm":
      date.setDate(date.getDate() + 21); // 3 weeks
      break;
    case "introd":
      date.setDate(date.getDate() + 28); // 4 weeks
      break;
    case "cold":
    default:
      date.setDate(date.getDate() + 7); // 1 week for cold leads
      break;
  }
  return date.toISOString();
}

/** Auto-advance stage based on disposition */
function getStageFromDisposition(
  currentStage: RealtorStage,
  disposition: RealtorDisposition,
): RealtorStage {
  if (disposition === "referral_received") return "active_referrer";
  if (disposition === "wants_quote" && currentStage !== "active_referrer") return "warm";
  if (disposition === "intro_complete" && currentStage === "cold") return "introd";
  if (disposition === "one_pager_sent" && currentStage === "cold") return "introd";
  return currentStage;
}

export const useRealtorStore = create<RealtorPipelineState>()(
  persist(
    (set, get) => ({
      agents: [],
      referrals: [],
      selectedAgentId: null,
      sortOrder: "urgency" as RealtorSortOrder,
      stageFilter: "all" as RealtorStage | "all",
      searchQuery: "",
      dialerActive: false,
      dialerAgentIndex: 0,

      addAgent(data) {
        const agent: RealtorAgent = {
          ...data,
          id: generateId(),
          call_attempts: 0,
          total_referrals: 0,
          total_revenue: 0,
          one_pager_sent: data.one_pager_sent_date ? true : false,
          created_at: now(),
          updated_at: now(),
        };
        set((s) => ({ agents: [...s.agents, agent] }));
      },

      updateAgent(id, updates) {
        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === id ? { ...a, ...updates, updated_at: now() } : a,
          ),
        }));
      },

      deleteAgent(id) {
        set((s) => ({
          agents: s.agents.filter((a) => a.id !== id),
          referrals: s.referrals.filter((r) => r.realtor_id !== id),
          selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId,
        }));
      },

      setAgentStage(id, stage) {
        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === id
              ? { ...a, stage, next_follow_up: getNextFollowUp(stage), updated_at: now() }
              : a,
          ),
        }));
      },

      recordCall(id, disposition, duration) {
        const currentAgent = get().agents.find((a) => a.id === id);
        if (!currentAgent) return;

        const newStage = getStageFromDisposition(currentAgent.stage, disposition);

        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === id
              ? {
                  ...a,
                  call_attempts: a.call_attempts + 1,
                  last_call_date: now(),
                  last_call_duration: duration,
                  last_disposition: disposition,
                  stage: newStage,
                  next_follow_up: getNextFollowUp(newStage),
                  one_pager_sent: disposition === "one_pager_sent" ? true : a.one_pager_sent,
                  one_pager_sent_date:
                    disposition === "one_pager_sent" && !a.one_pager_sent
                      ? now()
                      : a.one_pager_sent_date,
                  updated_at: now(),
                }
              : a,
          ),
        }));
      },

      addReferral(data) {
        const referral: Referral = { ...data, id: generateId() };
        set((s) => {
          const agent = s.agents.find((a) => a.id === data.realtor_id);
          const revenue = data.invoice_amount || 0;
          return {
            referrals: [...s.referrals, referral],
            agents: s.agents.map((a) =>
              a.id === data.realtor_id
                ? {
                    ...a,
                    total_referrals: a.total_referrals + 1,
                    total_revenue: a.total_revenue + revenue,
                    last_referral_date: now(),
                    stage: "active_referrer" as RealtorStage,
                    updated_at: now(),
                  }
                : a,
            ),
          };
        });
      },

      updateReferral(id, updates) {
        set((s) => ({
          referrals: s.referrals.map((r) =>
            r.id === id ? { ...r, ...updates } : r,
          ),
        }));
      },

      deleteReferral(id) {
        const referral = get().referrals.find((r) => r.id === id);
        if (!referral) return;
        set((s) => ({
          referrals: s.referrals.filter((r) => r.id !== id),
          agents: s.agents.map((a) =>
            a.id === referral.realtor_id
              ? {
                  ...a,
                  total_referrals: Math.max(0, a.total_referrals - 1),
                  total_revenue: Math.max(0, a.total_revenue - (referral.invoice_amount || 0)),
                  updated_at: now(),
                }
              : a,
          ),
        }));
      },

      setSelectedAgent(id) {
        set({ selectedAgentId: id });
      },

      setSortOrder(order) {
        set({ sortOrder: order });
      },

      setStageFilter(stage) {
        set({ stageFilter: stage });
      },

      setSearchQuery(query) {
        set({ searchQuery: query });
      },

      startDialer() {
        set({ dialerActive: true, dialerAgentIndex: 0 });
      },

      stopDialer() {
        set({ dialerActive: false });
      },

      nextAgent() {
        set((s) => ({ dialerAgentIndex: s.dialerAgentIndex + 1 }));
      },

      importAgents(rows) {
        let count = 0;
        const existing = get().agents;
        const newAgents: RealtorAgent[] = [];

        for (const row of rows) {
          // Skip duplicates by phone
          const phone = row.phone?.replace(/\D/g, "");
          if (!phone || phone.length < 10) continue;
          if (existing.some((a) => a.phone.replace(/\D/g, "") === phone)) continue;
          if (newAgents.some((a) => a.phone.replace(/\D/g, "") === phone)) continue;

          newAgents.push({
            id: generateId(),
            first_name: row.first_name || "",
            last_name: row.last_name || "",
            phone,
            email: row.email || null,
            cell: null,
            brokerage: row.brokerage || null,
            license_number: null,
            preferred_contact: "call",
            coverage_area: row.coverage_area || null,
            city: row.city || null,
            state: row.state || "TN",
            zip_code: null,
            stage: "cold",
            current_inspector: null,
            relationship_notes: null,
            call_attempts: 0,
            last_call_date: null,
            last_call_duration: null,
            last_disposition: null,
            next_follow_up: null,
            total_referrals: 0,
            total_revenue: 0,
            last_referral_date: null,
            one_pager_sent: false,
            one_pager_sent_date: null,
            assigned_rep: null,
            priority: 50,
            notes: null,
            created_at: now(),
            updated_at: now(),
          });
          count++;
        }

        if (newAgents.length > 0) {
          set((s) => ({ agents: [...s.agents, ...newAgents] }));
        }
        return count;
      },
    }),
    {
      name: "realtor-pipeline-store",
      storage: idbStorage,
      partialize: (state) => ({
        agents: state.agents,
        referrals: state.referrals,
        sortOrder: state.sortOrder,
        stageFilter: state.stageFilter,
      }),
      onRehydrateStorage: () => {
        // After store loads from IndexedDB, seed demo data if empty
        return (state) => {
          if (state && state.agents.length === 0) {
            injectSeedAgents();
          }
        };
      },
    },
  ),
);

/**
 * Seed real Nashville-area TN realtors from realtor-crm-import.csv.
 * Only runs if the store is empty (first visit).
 * All agents start as "cold" — Dannia moves them through the pipeline.
 */
function injectSeedAgents(): void {
  const store = useRealtorStore.getState();
  if (store.agents.length > 0) return;

  const seedAgents: RealtorAgent[] = SEED_AGENTS.map((a) => ({
    id: generateId(),
    first_name: a.first_name,
    last_name: a.last_name,
    phone: a.phone,
    email: null,
    cell: null,
    brokerage: a.brokerage || null,
    license_number: a.license_number || null,
    preferred_contact: "call" as const,
    coverage_area: a.city || null,
    city: a.city,
    state: "TN",
    zip_code: a.zip_code || null,
    stage: "cold" as RealtorStage,
    current_inspector: null,
    relationship_notes: null,
    call_attempts: 0,
    last_call_date: null,
    last_call_duration: null,
    last_disposition: null,
    next_follow_up: null,
    total_referrals: 0,
    total_revenue: 0,
    last_referral_date: null,
    one_pager_sent: false,
    one_pager_sent_date: null,
    assigned_rep: null,
    priority: 50,
    notes: null,
    created_at: now(),
    updated_at: now(),
  }));

  useRealtorStore.setState({ agents: seedAgents, referrals: [] });
}
