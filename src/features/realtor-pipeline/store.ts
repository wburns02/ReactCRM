import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type {
  RealtorAgent,
  RealtorStage,
  RealtorDisposition,
  Referral,
} from "./types";

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
 * Seed demo Nashville-area realtors across all pipeline stages.
 * Only runs if the store is empty (first visit).
 */
function injectSeedAgents(): void {
  const store = useRealtorStore.getState();
  if (store.agents.length > 0) return;

  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

  const seedAgents: RealtorAgent[] = [
    // Active Referrers (2)
    {
      id: generateId(), first_name: "Sarah", last_name: "Johnson",
      brokerage: "Keller Williams Nashville", license_number: null,
      phone: "6155551234", email: "sarah.johnson@kw.com", cell: null,
      preferred_contact: "call", coverage_area: "South Nashville",
      city: "Nashville", state: "TN", zip_code: "37204",
      stage: "active_referrer", current_inspector: "Jones Septic",
      relationship_notes: "Great relationship. Sends 1-2 inspections/month.",
      call_attempts: 8, last_call_date: daysAgo(5), last_call_duration: 420,
      last_disposition: "referral_received", next_follow_up: daysAgo(-9),
      total_referrals: 6, total_revenue: 4950, last_referral_date: daysAgo(5),
      one_pager_sent: true, one_pager_sent_date: daysAgo(60),
      assigned_rep: "Dannia", priority: 95, notes: "Prefers text for scheduling. Covers Davidson & Williamson counties.",
      created_at: daysAgo(90), updated_at: daysAgo(5),
    },
    {
      id: generateId(), first_name: "Mike", last_name: "Williams",
      brokerage: "RE/MAX Nashville", license_number: null,
      phone: "6155559001", email: "mike.williams@remax.com", cell: "6155559002",
      preferred_contact: "call", coverage_area: "Williamson County",
      city: "Franklin", state: "TN", zip_code: "37064",
      stage: "active_referrer", current_inspector: null,
      relationship_notes: "Switched from his old inspector after our first job.",
      call_attempts: 6, last_call_date: daysAgo(12), last_call_duration: 300,
      last_disposition: "referral_received", next_follow_up: daysAgo(-2),
      total_referrals: 3, total_revenue: 2475, last_referral_date: daysAgo(12),
      one_pager_sent: true, one_pager_sent_date: daysAgo(45),
      assigned_rep: "Dannia", priority: 90, notes: "High-volume agent. Focuses on Spring Hill and Franklin.",
      created_at: daysAgo(75), updated_at: daysAgo(12),
    },
    // Warm (3)
    {
      id: generateId(), first_name: "Lisa", last_name: "Chen",
      brokerage: "Compass", license_number: null,
      phone: "6155553456", email: "lisa.chen@compass.com", cell: null,
      preferred_contact: "email", coverage_area: "Brentwood / South Nashville",
      city: "Brentwood", state: "TN", zip_code: "37027",
      stage: "warm", current_inspector: "ABC Septic",
      relationship_notes: "Interested but loyal to current inspector. Follow up regularly.",
      call_attempts: 4, last_call_date: daysAgo(18), last_call_duration: 240,
      last_disposition: "wants_quote", next_follow_up: daysAgo(-3),
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: true, one_pager_sent_date: daysAgo(30),
      assigned_rep: "Dannia", priority: 75, notes: null,
      created_at: daysAgo(60), updated_at: daysAgo(18),
    },
    {
      id: generateId(), first_name: "David", last_name: "Brown",
      brokerage: "Coldwell Banker", license_number: null,
      phone: "6155554567", email: "david.brown@cb.com", cell: null,
      preferred_contact: "call", coverage_area: "Maury County",
      city: "Columbia", state: "TN", zip_code: "38401",
      stage: "warm", current_inspector: null,
      relationship_notes: "No current inspector — prime target.",
      call_attempts: 3, last_call_date: daysAgo(25), last_call_duration: 180,
      last_disposition: "wants_quote", next_follow_up: daysAgo(4),
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: true, one_pager_sent_date: daysAgo(25),
      assigned_rep: "Dannia", priority: 80, notes: "Handles a lot of rural listings south of Columbia.",
      created_at: daysAgo(50), updated_at: daysAgo(25),
    },
    {
      id: generateId(), first_name: "Amanda", last_name: "Lee",
      brokerage: "Village Real Estate", license_number: null,
      phone: "6155555678", email: "amanda@villagerealestate.com", cell: null,
      preferred_contact: "text", coverage_area: "12 South / Berry Hill",
      city: "Nashville", state: "TN", zip_code: "37204",
      stage: "warm", current_inspector: "Valley Septic",
      relationship_notes: "Complained about Valley Septic being slow. Good opening.",
      call_attempts: 3, last_call_date: daysAgo(20), last_call_duration: 360,
      last_disposition: "intro_complete", next_follow_up: daysAgo(-1),
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: true, one_pager_sent_date: daysAgo(20),
      assigned_rep: "Dannia", priority: 70, notes: null,
      created_at: daysAgo(40), updated_at: daysAgo(20),
    },
    // Intro'd (3)
    {
      id: generateId(), first_name: "Emily", last_name: "Taylor",
      brokerage: "EXIT Realty", license_number: null,
      phone: "6155556789", email: "emily.taylor@exitrealty.com", cell: null,
      preferred_contact: "call", coverage_area: "Spring Hill",
      city: "Spring Hill", state: "TN", zip_code: "37174",
      stage: "introd", current_inspector: null,
      relationship_notes: null,
      call_attempts: 2, last_call_date: daysAgo(14), last_call_duration: 180,
      last_disposition: "one_pager_sent", next_follow_up: daysAgo(0),
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: true, one_pager_sent_date: daysAgo(14),
      assigned_rep: "Dannia", priority: 60, notes: null,
      created_at: daysAgo(30), updated_at: daysAgo(14),
    },
    {
      id: generateId(), first_name: "James", last_name: "Martinez",
      brokerage: "Century 21", license_number: null,
      phone: "6155557890", email: "james.martinez@c21.com", cell: null,
      preferred_contact: "call", coverage_area: "Murfreesboro",
      city: "Murfreesboro", state: "TN", zip_code: "37129",
      stage: "introd", current_inspector: "Rutherford Septic",
      relationship_notes: "Outside core area — may need travel uplift pricing.",
      call_attempts: 1, last_call_date: daysAgo(21), last_call_duration: 120,
      last_disposition: "intro_complete", next_follow_up: daysAgo(7),
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: false, one_pager_sent_date: null,
      assigned_rep: "Dannia", priority: 50, notes: "Need to send one-pager.",
      created_at: daysAgo(25), updated_at: daysAgo(21),
    },
    {
      id: generateId(), first_name: "Rachel", last_name: "Adams",
      brokerage: "eXp Realty", license_number: null,
      phone: "6155558901", email: "rachel.adams@exp.com", cell: null,
      preferred_contact: "email", coverage_area: "East Nashville",
      city: "Nashville", state: "TN", zip_code: "37206",
      stage: "introd", current_inspector: null,
      relationship_notes: null,
      call_attempts: 1, last_call_date: daysAgo(10), last_call_duration: 150,
      last_disposition: "intro_complete", next_follow_up: daysAgo(-18),
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: true, one_pager_sent_date: daysAgo(10),
      assigned_rep: "Dannia", priority: 55, notes: null,
      created_at: daysAgo(15), updated_at: daysAgo(10),
    },
    // Cold (4)
    {
      id: generateId(), first_name: "Tom", last_name: "Garcia",
      brokerage: "Berkshire Hathaway", license_number: null,
      phone: "6155559012", email: "tom.garcia@bhhs.com", cell: null,
      preferred_contact: "call", coverage_area: "Nolensville",
      city: "Nolensville", state: "TN", zip_code: "37135",
      stage: "cold", current_inspector: null, relationship_notes: null,
      call_attempts: 0, last_call_date: null, last_call_duration: null,
      last_disposition: null, next_follow_up: null,
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: false, one_pager_sent_date: null,
      assigned_rep: null, priority: 50, notes: null,
      created_at: daysAgo(5), updated_at: daysAgo(5),
    },
    {
      id: generateId(), first_name: "Karen", last_name: "Mitchell",
      brokerage: "Crye-Leike", license_number: null,
      phone: "6155559123", email: "karen.mitchell@crye-leike.com", cell: null,
      preferred_contact: "call", coverage_area: "Smyrna / La Vergne",
      city: "Smyrna", state: "TN", zip_code: "37167",
      stage: "cold", current_inspector: null, relationship_notes: null,
      call_attempts: 0, last_call_date: null, last_call_duration: null,
      last_disposition: null, next_follow_up: null,
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: false, one_pager_sent_date: null,
      assigned_rep: null, priority: 50, notes: null,
      created_at: daysAgo(3), updated_at: daysAgo(3),
    },
    {
      id: generateId(), first_name: "Brian", last_name: "Patel",
      brokerage: "Parks Real Estate", license_number: null,
      phone: "6155559234", email: "brian.patel@parks.com", cell: null,
      preferred_contact: "call", coverage_area: "Dickson / Fairview",
      city: "Dickson", state: "TN", zip_code: "37055",
      stage: "cold", current_inspector: null, relationship_notes: null,
      call_attempts: 0, last_call_date: null, last_call_duration: null,
      last_disposition: null, next_follow_up: null,
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: false, one_pager_sent_date: null,
      assigned_rep: null, priority: 50, notes: "Covers areas west of Nashville — check travel uplift.",
      created_at: daysAgo(2), updated_at: daysAgo(2),
    },
    {
      id: generateId(), first_name: "Nicole", last_name: "Foster",
      brokerage: "Zeitlin Sotheby's", license_number: null,
      phone: "6155559345", email: "nicole.foster@sothebys.com", cell: null,
      preferred_contact: "email", coverage_area: "Belle Meade / Green Hills",
      city: "Nashville", state: "TN", zip_code: "37205",
      stage: "cold", current_inspector: null, relationship_notes: null,
      call_attempts: 0, last_call_date: null, last_call_duration: null,
      last_disposition: null, next_follow_up: null,
      total_referrals: 0, total_revenue: 0, last_referral_date: null,
      one_pager_sent: false, one_pager_sent_date: null,
      assigned_rep: null, priority: 50, notes: "Luxury market — higher-end properties.",
      created_at: daysAgo(1), updated_at: daysAgo(1),
    },
  ];

  const seedReferrals: Referral[] = [
    // Sarah Johnson's 6 referrals
    { id: generateId(), realtor_id: seedAgents[0].id, property_address: "123 Hickory Ln, Nashville, TN 37211", homeowner_name: "Robert Miller", service_type: "inspection", invoice_amount: 825, status: "paid", referred_date: daysAgo(80), completed_date: daysAgo(75), notes: null },
    { id: generateId(), realtor_id: seedAgents[0].id, property_address: "456 Oak Dr, Franklin, TN 37064", homeowner_name: "Jane Wilson", service_type: "inspection", invoice_amount: 825, status: "paid", referred_date: daysAgo(60), completed_date: daysAgo(55), notes: null },
    { id: generateId(), realtor_id: seedAgents[0].id, property_address: "789 Elm St, Columbia, TN 38401", homeowner_name: "Steve & Karen Thompson", service_type: "inspection", invoice_amount: 825, status: "paid", referred_date: daysAgo(45), completed_date: daysAgo(40), notes: null },
    { id: generateId(), realtor_id: seedAgents[0].id, property_address: "321 Maple Ave, Brentwood, TN 37027", homeowner_name: "Linda Chen", service_type: "pumpout", invoice_amount: 625, status: "paid", referred_date: daysAgo(30), completed_date: daysAgo(27), notes: null },
    { id: generateId(), realtor_id: seedAgents[0].id, property_address: "555 Cedar Ct, Nashville, TN 37220", homeowner_name: "Marcus Brown", service_type: "inspection", invoice_amount: 825, status: "completed", referred_date: daysAgo(14), completed_date: daysAgo(10), notes: null },
    { id: generateId(), realtor_id: seedAgents[0].id, property_address: "888 Walnut Dr, Spring Hill, TN 37174", homeowner_name: "Patricia Davis", service_type: "inspection", invoice_amount: 825, status: "scheduled", referred_date: daysAgo(5), completed_date: null, notes: "Scheduled for next week" },
    // Mike Williams's 3 referrals
    { id: generateId(), realtor_id: seedAgents[1].id, property_address: "210 Pine St, Franklin, TN 37064", homeowner_name: "Tom Harris", service_type: "inspection", invoice_amount: 825, status: "paid", referred_date: daysAgo(40), completed_date: daysAgo(35), notes: null },
    { id: generateId(), realtor_id: seedAgents[1].id, property_address: "444 Birch Rd, Spring Hill, TN 37174", homeowner_name: "Amy Rodriguez", service_type: "inspection", invoice_amount: 825, status: "paid", referred_date: daysAgo(25), completed_date: daysAgo(20), notes: null },
    { id: generateId(), realtor_id: seedAgents[1].id, property_address: "777 Spruce Ln, Franklin, TN 37064", homeowner_name: "Kevin Walsh", service_type: "inspection", invoice_amount: 825, status: "pending", referred_date: daysAgo(12), completed_date: null, notes: "Waiting on seller to confirm access" },
  ];

  store.agents = seedAgents;
  store.referrals = seedReferrals;
  useRealtorStore.setState({ agents: seedAgents, referrals: seedReferrals });
}
