import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Campaign,
  CampaignContact,
  CampaignStats,
  CampaignStatus,
  ContactCallStatus,
} from "./types";

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

  // Campaign CRUD
  createCampaign: (name: string, description?: string) => string;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  setCampaignStatus: (id: string, status: CampaignStatus) => void;

  // Contact management
  importContacts: (campaignId: string, rows: ImportRow[]) => number;
  updateContact: (id: string, updates: Partial<CampaignContact>) => void;
  setContactCallStatus: (id: string, status: ContactCallStatus, notes?: string) => void;
  removeContact: (id: string) => void;

  // Dialer
  setActiveCampaign: (id: string | null) => void;
  setDialerContactIndex: (index: number) => void;
  startDialer: () => void;
  stopDialer: () => void;
  advanceDialer: () => void;

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

      createCampaign: (name, description) => {
        const id = generateId();
        const now = new Date().toISOString();
        const campaign: Campaign = {
          id,
          name,
          description: description ?? null,
          status: "draft",
          source_file: null,
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

      importContacts: (campaignId, rows) => {
        const now = new Date().toISOString();
        // Deduplicate by phone number within this campaign
        const existingPhones = new Set(
          get()
            .contacts.filter((c) => c.campaign_id === campaignId)
            .map((c) => c.phone),
        );

        const newContacts: CampaignContact[] = [];
        for (const row of rows) {
          if (!row.phone || existingPhones.has(row.phone)) continue;
          existingPhones.add(row.phone);

          newContacts.push({
            id: generateId(),
            campaign_id: campaignId,
            account_number: row.account_number || null,
            account_name: row.account_name || "Unknown",
            company: row.company || null,
            phone: row.phone,
            email: row.email || null,
            address: null,
            city: null,
            state: null,
            contract_type: row.contract_type || null,
            contract_start: row.start_date || null,
            contract_end: row.end_date || null,
            contract_value: null,
            call_status: "pending",
            call_attempts: 0,
            last_call_date: null,
            last_call_duration: null,
            last_disposition: null,
            notes: null,
            callback_date: null,
            assigned_rep: null,
            priority: 0,
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
                    source_file: "Sherrie Sheet.xlsx",
                    updated_at: now,
                  }
                : c,
            ),
          };
        });

        return newContacts.length;
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
      version: 1,
    },
  ),
);
