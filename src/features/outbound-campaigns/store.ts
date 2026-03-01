import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AutoDialDelay,
  Campaign,
  CampaignAutomationConfig,
  CampaignContact,
  CampaignStats,
  CampaignStatus,
  ContactCallStatus,
  SortOrder,
} from "./types";
import { DEFAULT_AUTOMATION_CONFIG } from "./types";

/**
 * Parse Sherrie Sheet XLSX data into campaign contacts.
 * This processes the "All Contracts 1030" sheet structure from the analyzed file.
 */
export interface ImportRow {
  account_number: string;
  account_name: string;
  company: string;
  contract_number: string;
  phone: string;
  email: string;
  contract_type: string;
  start_date?: string;
  end_date?: string;
  term_months?: number;
  address?: string;
  zip_code?: string;
  service_zone?: string;
  system_type?: string;
  contract_status?: string;
  days_since_expiry?: number;
  customer_type?: string;
  call_priority_label?: string;
  notes?: string;
  callback_date?: string;
  disposition?: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

interface OutboundCampaignState {
  campaigns: Campaign[];
  contacts: CampaignContact[];
  activeCampaignId: string | null;
  dialerContactIndex: number;
  dialerActive: boolean;

  // Auto-dial
  autoDialEnabled: boolean;
  autoDialDelay: AutoDialDelay;

  // Smart ordering
  sortOrder: SortOrder;

  // Post-call automation
  campaignAutomationConfigs: Record<string, CampaignAutomationConfig>;

  // Campaign CRUD
  createCampaign: (name: string, description?: string) => string;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  setCampaignStatus: (id: string, status: CampaignStatus) => void;

  // Contact management
  importContacts: (campaignId: string, rows: ImportRow[], sourceFile?: string, sourceSheet?: string) => number;
  batchImportZones: (zones: { sheetName: string; rows: ImportRow[] }[], sourceFile: string) => string[];
  updateContact: (id: string, updates: Partial<CampaignContact>) => void;
  setContactCallStatus: (id: string, status: ContactCallStatus, notes?: string) => void;
  removeContact: (id: string) => void;

  // Dialer
  setActiveCampaign: (id: string | null) => void;
  setDialerContactIndex: (index: number) => void;
  startDialer: () => void;
  stopDialer: () => void;
  advanceDialer: () => void;

  // Auto-dial / sort setters
  setAutoDialEnabled: (enabled: boolean) => void;
  setAutoDialDelay: (delay: AutoDialDelay) => void;
  setSortOrder: (order: SortOrder) => void;
  getAutomationConfig: (campaignId: string) => CampaignAutomationConfig;

  // Seeding
  seedFromBuiltInData: () => Promise<void>;

  // Queries
  getCampaignContacts: (campaignId: string) => CampaignContact[];
  getCampaignStats: (campaignId: string) => CampaignStats;
  getNextDialerContact: () => CampaignContact | null;
  getCallableContacts: (campaignId: string) => CampaignContact[];
}

export const useOutboundStore = create<OutboundCampaignState>()(
  persist(
    (set, get) => ({
      campaigns: [],
      contacts: [],
      activeCampaignId: null,
      dialerContactIndex: 0,
      dialerActive: false,
      autoDialEnabled: false,
      autoDialDelay: 5,
      sortOrder: "default",
      campaignAutomationConfigs: {},

      createCampaign: (name, description) => {
        const id = generateId();
        const now = new Date().toISOString();
        const campaign: Campaign = {
          id,
          name,
          description: description ?? null,
          status: "draft",
          source_file: null,
          source_sheet: null,
          total_contacts: 0,
          contacts_called: 0,
          contacts_connected: 0,
          contacts_interested: 0,
          contacts_completed: 0,
          assigned_reps: [],
          created_by: null,
          created_at: now,
          updated_at: now,
        };
        set((s) => ({ campaigns: [...s.campaigns, campaign] }));
        return id;
      },

      updateCampaign: (id, updates) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id
              ? { ...c, ...updates, updated_at: new Date().toISOString() }
              : c,
          ),
        }));
      },

      deleteCampaign: (id) => {
        set((s) => ({
          campaigns: s.campaigns.filter((c) => c.id !== id),
          contacts: s.contacts.filter((c) => c.campaign_id !== id),
          activeCampaignId:
            s.activeCampaignId === id ? null : s.activeCampaignId,
        }));
      },

      setCampaignStatus: (id, status) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id
              ? { ...c, status, updated_at: new Date().toISOString() }
              : c,
          ),
        }));
      },

      importContacts: (campaignId, rows, sourceFile, sourceSheet) => {
        const now = new Date().toISOString();
        // Deduplicate by phone number within this campaign
        const existingPhones = new Set(
          get()
            .contacts.filter((c) => c.campaign_id === campaignId)
            .map((c) => c.phone),
        );

        // Map text priority labels to numeric priority
        const priorityMap: Record<string, number> = {
          high: 3,
          medium: 2,
          med: 2,
          low: 1,
        };

        const newContacts: CampaignContact[] = [];
        for (const row of rows) {
          if (!row.phone || existingPhones.has(row.phone)) continue;
          existingPhones.add(row.phone);

          const priorityNum = row.call_priority_label
            ? (priorityMap[row.call_priority_label.toLowerCase().trim()] ?? 0)
            : 0;

          newContacts.push({
            id: generateId(),
            campaign_id: campaignId,
            account_number: row.account_number || null,
            account_name: row.account_name || "Unknown",
            company: row.company || null,
            phone: row.phone,
            email: row.email || null,
            address: row.address || null,
            city: null,
            state: null,
            zip_code: row.zip_code || null,
            service_zone: row.service_zone || null,
            system_type: row.system_type || null,
            contract_type: row.contract_type || null,
            contract_status: row.contract_status || null,
            contract_start: row.start_date || null,
            contract_end: row.end_date || null,
            contract_value: null,
            days_since_expiry: row.days_since_expiry ?? null,
            customer_type: row.customer_type || null,
            call_priority_label: row.call_priority_label || null,
            call_status: "pending",
            call_attempts: 0,
            last_call_date: null,
            last_call_duration: null,
            last_disposition: row.disposition || null,
            notes: row.notes || null,
            callback_date: row.callback_date || null,
            assigned_rep: null,
            priority: priorityNum,
            created_at: now,
            updated_at: now,
          });
        }

        set((s) => {
          const updatedContacts = [...s.contacts, ...newContacts];
          const total = updatedContacts.filter(
            (c) => c.campaign_id === campaignId,
          ).length;
          return {
            contacts: updatedContacts,
            campaigns: s.campaigns.map((c) =>
              c.id === campaignId
                ? {
                    ...c,
                    total_contacts: total,
                    source_file: sourceFile ?? c.source_file ?? "Sherrie Sheet.xlsx",
                    source_sheet: sourceSheet ?? c.source_sheet ?? null,
                    updated_at: now,
                  }
                : c,
            ),
          };
        });

        return newContacts.length;
      },

      batchImportZones: (zones, sourceFile) => {
        const store = get();
        const ids: string[] = [];
        for (const zone of zones) {
          const id = store.createCampaign(zone.sheetName);
          // Re-read store after createCampaign mutated state
          get().importContacts(id, zone.rows, sourceFile, zone.sheetName);
          ids.push(id);
        }
        return ids;
      },

      updateContact: (id, updates) => {
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === id
              ? { ...c, ...updates, updated_at: new Date().toISOString() }
              : c,
          ),
        }));
      },

      setContactCallStatus: (id, status, notes) => {
        const now = new Date().toISOString();
        set((s) => {
          const updatedContacts = s.contacts.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              call_status: status,
              call_attempts: c.call_attempts + 1,
              last_call_date: now,
              last_disposition: status,
              notes: notes ?? c.notes,
              updated_at: now,
            };
          });

          // Recalculate campaign stats
          const contact = updatedContacts.find((c) => c.id === id);
          if (!contact) return { contacts: updatedContacts };

          const campaignContacts = updatedContacts.filter(
            (c) => c.campaign_id === contact.campaign_id,
          );
          const called = campaignContacts.filter(
            (c) => c.call_status !== "pending" && c.call_status !== "queued",
          ).length;
          const connected = campaignContacts.filter((c) =>
            ["connected", "interested", "not_interested", "completed"].includes(
              c.call_status,
            ),
          ).length;
          const interested = campaignContacts.filter(
            (c) => c.call_status === "interested",
          ).length;
          const completed = campaignContacts.filter(
            (c) =>
              [
                "completed",
                "interested",
                "not_interested",
                "wrong_number",
                "do_not_call",
              ].includes(c.call_status),
          ).length;

          return {
            contacts: updatedContacts,
            campaigns: s.campaigns.map((c) =>
              c.id === contact.campaign_id
                ? {
                    ...c,
                    contacts_called: called,
                    contacts_connected: connected,
                    contacts_interested: interested,
                    contacts_completed: completed,
                    updated_at: now,
                  }
                : c,
            ),
          };
        });
      },

      removeContact: (id) => {
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
        }));
      },

      setActiveCampaign: (id) => {
        set({ activeCampaignId: id, dialerContactIndex: 0 });
      },

      setDialerContactIndex: (index) => {
        set({ dialerContactIndex: index });
      },

      startDialer: () => set({ dialerActive: true }),
      stopDialer: () => set({ dialerActive: false }),

      advanceDialer: () => {
        const { activeCampaignId, dialerContactIndex } = get();
        if (!activeCampaignId) return;
        const callable = get().getCallableContacts(activeCampaignId);
        if (dialerContactIndex < callable.length - 1) {
          set({ dialerContactIndex: dialerContactIndex + 1 });
        } else {
          set({ dialerActive: false });
        }
      },

      setAutoDialEnabled: (enabled) => set({ autoDialEnabled: enabled }),
      setAutoDialDelay: (delay) => set({ autoDialDelay: delay }),
      setSortOrder: (order) => set({ sortOrder: order }),
      getAutomationConfig: (campaignId) => {
        return get().campaignAutomationConfigs[campaignId] ?? DEFAULT_AUTOMATION_CONFIG;
      },

      seedFromBuiltInData: async () => {
        // Only seed if store has no campaigns
        if (get().campaigns.length > 0) return;
        try {
          const { SEED_CAMPAIGNS, SEED_SOURCE_FILE } = await import("./seed-data");
          const store = get();
          for (const campaign of SEED_CAMPAIGNS) {
            const id = store.createCampaign(campaign.sheetName);
            get().setCampaignStatus(id, "active");
            get().importContacts(id, campaign.rows, SEED_SOURCE_FILE, campaign.sheetName);
          }
        } catch (err) {
          console.error("Failed to seed campaign data:", err);
        }
      },

      getCampaignContacts: (campaignId) => {
        return get().contacts.filter((c) => c.campaign_id === campaignId);
      },

      getCampaignStats: (campaignId) => {
        const contacts = get().contacts.filter(
          (c) => c.campaign_id === campaignId,
        );
        const total = contacts.length;
        const pending = contacts.filter(
          (c) => c.call_status === "pending",
        ).length;
        const called = contacts.filter(
          (c) => c.call_status !== "pending" && c.call_status !== "queued",
        ).length;
        const connected = contacts.filter((c) =>
          ["connected", "interested", "not_interested", "completed"].includes(
            c.call_status,
          ),
        ).length;
        const interested = contacts.filter(
          (c) => c.call_status === "interested",
        ).length;
        const not_interested = contacts.filter(
          (c) => c.call_status === "not_interested",
        ).length;
        const voicemail = contacts.filter(
          (c) => c.call_status === "voicemail",
        ).length;
        const no_answer = contacts.filter(
          (c) => c.call_status === "no_answer",
        ).length;
        const callback_scheduled = contacts.filter(
          (c) => c.call_status === "callback_scheduled",
        ).length;
        const do_not_call = contacts.filter(
          (c) => c.call_status === "do_not_call",
        ).length;
        const completed = contacts.filter((c) =>
          [
            "completed",
            "interested",
            "not_interested",
            "wrong_number",
            "do_not_call",
          ].includes(c.call_status),
        ).length;

        return {
          total,
          pending,
          called,
          connected,
          interested,
          not_interested,
          voicemail,
          no_answer,
          callback_scheduled,
          completed,
          do_not_call,
          connect_rate: called > 0 ? (connected / called) * 100 : 0,
          interest_rate: connected > 0 ? (interested / connected) * 100 : 0,
        };
      },

      getNextDialerContact: () => {
        const { activeCampaignId, dialerContactIndex } = get();
        if (!activeCampaignId) return null;
        const callable = get().getCallableContacts(activeCampaignId);
        return callable[dialerContactIndex] ?? null;
      },

      getCallableContacts: (campaignId) => {
        return get()
          .contacts.filter(
            (c) =>
              c.campaign_id === campaignId &&
              ["pending", "queued", "no_answer", "busy", "callback_scheduled"].includes(
                c.call_status,
              ),
          )
          .sort((a, b) => {
            // Callbacks first, then by priority, then by creation
            if (
              a.call_status === "callback_scheduled" &&
              b.call_status !== "callback_scheduled"
            )
              return -1;
            if (
              b.call_status === "callback_scheduled" &&
              a.call_status !== "callback_scheduled"
            )
              return 1;
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.created_at.localeCompare(b.created_at);
          });
      },
    }),
    {
      name: "outbound-campaigns-store",
      version: 3,
      onRehydrateStorage: () => {
        return (state) => {
          // After store hydrates from localStorage, seed if empty
          if (state && state.campaigns.length === 0) {
            state.seedFromBuiltInData();
          }
        };
      },
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          // Default new contact fields to null for existing data
          const contacts = (state.contacts as CampaignContact[]) ?? [];
          state.contacts = contacts.map((c) => ({
            ...c,
            zip_code: c.zip_code ?? null,
            service_zone: c.service_zone ?? null,
            system_type: c.system_type ?? null,
            contract_status: c.contract_status ?? null,
            days_since_expiry: c.days_since_expiry ?? null,
            customer_type: c.customer_type ?? null,
            call_priority_label: c.call_priority_label ?? null,
          }));
          const campaigns = (state.campaigns as Campaign[]) ?? [];
          state.campaigns = campaigns.map((c) => ({
            ...c,
            source_sheet: (c as Campaign).source_sheet ?? null,
          }));
        }
        if (version < 3) {
          state.autoDialEnabled = false;
          state.autoDialDelay = 5;
          state.sortOrder = "default";
          state.campaignAutomationConfigs = {};
        }
        return state as OutboundCampaignState;
      },
    },
  ),
);
