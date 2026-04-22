import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { apiClient } from "@/api/client.ts";
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
 * Fire-and-forget API call; never throws into calling code. Server errors
 * are logged and the next syncFromBackend() reconciles local state.
 */
function postBackend(fn: () => Promise<unknown>): void {
  Promise.resolve(fn()).catch((err) => {
    console.error("[outbound] backend sync failed", err);
  });
}

/**
 * IndexedDB-backed storage adapter for Zustand persist.
 * localStorage has a ~5MB limit which is too small for 8k+ contacts.
 * IndexedDB supports hundreds of MB.
 */
const idbStorage = createJSONStorage(() => ({
  getItem: async (name: string): Promise<string | null> => {
    const val = await idbGet(name);
    // Migrate from localStorage if exists in localStorage but not IndexedDB
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
  customer_type?: string;
  call_priority_label?: string;
  notes?: string;
  callback_date?: string;
  disposition?: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Inject "Email Openers - Spring Follow-Up" campaign with 39 TN permit owners
 * who opened the Mar 27 email. Only injects if the campaign doesn't already exist.
 */
function injectEmailOpenersCampaign(): void {
  const state = useOutboundStore.getState();
  const CAMPAIGN_ID = "email-openers-spring-2026";

  // Don't re-inject if already present
  if (state.campaigns.some((c) => c.id === CAMPAIGN_ID)) return;

  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: CAMPAIGN_ID,
    name: "Email Openers - Spring Follow-Up",
    description: "39 TN permit owners who opened the Mar 27 spring service email (1-8x opens). Warm leads for outbound calls.",
    status: "active",
    source_file: "Brevo Transactional Export",
    source_sheet: null,
    total_contacts: 39,
    contacts_called: 0,
    contacts_connected: 0,
    contacts_interested: 0,
    contacts_completed: 0,
    assigned_reps: [],
    created_by: "claude-marketing-analysis",
    created_at: now,
    updated_at: now,
  };

  const contactData: Array<{
    name: string; phone: string; email: string;
    city: string; state: string; address: string; opens: number;
  }> = [
    { name: "Shanna Byrnes", phone: "9313341335", email: "shanna.hulsey81@gmail.com", city: "Spring Hill", state: "TN", address: "164 Oak Valley Dr", opens: 8 },
    { name: "Deborah Bohannon", phone: "6159675144", email: "dinonerd1981@gmail.com", city: "Columbia", state: "TN", address: "612 Delk Ln", opens: 6 },
    { name: "Christine Browm", phone: "4075519693", email: "doug@macseptic.com", city: "Ashland City", state: "TN", address: "404 Patricia Dr", opens: 6 },
    { name: "Chris Guthrie", phone: "8475071120", email: "chrisguthrie143@gmail.com", city: "Columbia", state: "TN", address: "2298 Hermitage Cir", opens: 5 },
    { name: "Amerispec", phone: "9314103003", email: "contact@amerispecmidtn.net", city: "Spring Hill", state: "TN", address: "2465 Lake Shore Dr", opens: 5 },
    { name: "Jack Hartley", phone: "4193039476", email: "j.hartley.bhs@gmail.com", city: "Columbia", state: "TN", address: "2846 Pulaski Hwy", opens: 5 },
    { name: "Melinda Hanes", phone: "9314864677", email: "mhanes@hawkston.com", city: "Columbia", state: "TN", address: "2410 Park Plus Dr", opens: 4 },
    { name: "Secilia Wagnor", phone: "6157177267", email: "seciliabryce2023@gmail.com", city: "Columbia", state: "TN", address: "1508 Potter Dr", opens: 3 },
    { name: "Lina Wagoner", phone: "6158046383", email: "lina8809@gmail.com", city: "Columbia", state: "TN", address: "1399 Standing Stone Circle", opens: 3 },
    { name: "Smotherman Excavation", phone: "6154891015", email: "smothermanexcavation@gmail.com", city: "Columbia", state: "TN", address: "", opens: 3 },
    { name: "Keith Barnhill", phone: "6154957989", email: "keith.barnhill@erm.com", city: "Spring Hill", state: "TN", address: "2472 Lewisburg Pike", opens: 3 },
    { name: "Dj Gillit", phone: "8063924352", email: "dgillit@gmail.com", city: "Columbia", state: "TN", address: "1926 Bryant Road", opens: 3 },
    { name: "Lowell Brown", phone: "8202884114", email: "atlasbuildtn@gmail.com", city: "Culleoka", state: "TN", address: "2952 Valley Creek Rd", opens: 2 },
    { name: "Samantha Sierra", phone: "6616168583", email: "mike_sam@att.net", city: "Spring Hill", state: "TN", address: "405 Billy Ln", opens: 2 },
    { name: "Kirk Hennig", phone: "6154966459", email: "kirkhennig@gmail.com", city: "Spring Hill", state: "TN", address: "3688 Stone Creek Dr", opens: 2 },
    { name: "Felix Pena", phone: "9312158029", email: "generalemaildumping@gmail.com", city: "Culleoka", state: "TN", address: "2629 Demastus Rd", opens: 2 },
    { name: "Brittney King", phone: "6157109159", email: "kbrittney106@gmail.com", city: "Columbia", state: "TN", address: "1103 Haley St", opens: 2 },
    { name: "Allison Epps", phone: "2142293589", email: "epps.ali@gmail.com", city: "Spring Hill", state: "TN", address: "59 Oak Valley Dr", opens: 2 },
    { name: "Natalie Wagner", phone: "9164128643", email: "natalie@libertytransactions.com", city: "Columbia", state: "TN", address: "2380 Beasley Lane", opens: 2 },
    { name: "Chris Cocilovo", phone: "8058891833", email: "chriscocilovo@gmail.com", city: "Chapel Hill", state: "TN", address: "4012 Caney Creek Ln", opens: 2 },
    { name: "Bill Spradley", phone: "9319815033", email: "williamasberry64@gmail.com", city: "Columbia", state: "TN", address: "909 Everyman Ct", opens: 2 },
    { name: "Vanessa Medrano", phone: "6195193931", email: "vmedrano@firstwatch.com", city: "Columbia", state: "TN", address: "202 S James Campbell", opens: 2 },
    { name: "Jeremy Smith", phone: "6155062797", email: "jeremybsmith@gmail.com", city: "Columbia", state: "TN", address: "1157 Roseland Dr", opens: 2 },
    { name: "Mark Leatherman", phone: "9312557429", email: "markleatherman10@gmail.com", city: "Columbia", state: "TN", address: "3034 Glenstone Dr", opens: 2 },
    { name: "Briana Betker", phone: "9319818789", email: "brianabetker739@gmail.com", city: "Columbia", state: "TN", address: "2624 Bristow Rd", opens: 2 },
    { name: "Carla Gibbs", phone: "9312427123", email: "carlapfernandez@yahoo.com", city: "Columbia", state: "TN", address: "3514 Tobe Robertson Rd", opens: 2 },
    { name: "Shea Heeney", phone: "6154964191", email: "sheaandbecca@gmail.com", city: "Columbia", state: "TN", address: "903 Carters Creek Pike", opens: 1 },
    { name: "Dillon Nab", phone: "3072775547", email: "dillon.nab@gmail.com", city: "Mount Pleasant", state: "TN", address: "4461 W Point Road", opens: 1 },
    { name: "Wilbur Alvarez", phone: "8083439032", email: "wilburalvarez0148@gmail.com", city: "Columbia", state: "TN", address: "2854 Greens Mill Rd", opens: 1 },
    { name: "Paul Rivera", phone: "7142232557", email: "paul.rivera59@icloud.com", city: "Columbia", state: "TN", address: "1151 Old Hwy 99", opens: 1 },
    { name: "Peri Chinoda", phone: "6154389095", email: "pchinoda2@yahoo.com", city: "Spring Hill", state: "TN", address: "2219 Twin Peaks Ct", opens: 1 },
    { name: "Debra Setera", phone: "6153977764", email: "abennett@scoutrealty.com", city: "Columbia", state: "TN", address: "5317 Tobe Robertson Rd", opens: 1 },
    { name: "Loretta Lovett", phone: "2817734844", email: "lorettaanngilbert@gmail.com", city: "Lewisburg", state: "TN", address: "1352 Webb Road", opens: 1 },
    { name: "Floyd White", phone: "6152683557", email: "fwhite0725@gmail.com", city: "Columbia", state: "TN", address: "414 Lake Circle", opens: 1 },
    { name: "Wesley Baird", phone: "4693446395", email: "asclafani423@gmail.com", city: "Columbia", state: "TN", address: "215 Elliott Ct", opens: 1 },
    { name: "Adam Busch", phone: "5638456577", email: "acbusch52@gmail.com", city: "Columbia", state: "TN", address: "3687 Perry Cemetery Road", opens: 1 },
    { name: "Jeff Lamb", phone: "6155049533", email: "jplambsr@gmail.com", city: "Columbia", state: "TN", address: "3907 Kelley Farris Rd", opens: 1 },
  ];

  const contacts: CampaignContact[] = contactData.map((data, i) => ({
    id: `email-opener-${i + 1}`,
    campaign_id: CAMPAIGN_ID,
    account_number: null,
    account_name: data.name,
    company: null,
    phone: data.phone,
    email: data.email,
    address: data.address,
    city: data.city,
    state: data.state,
    zip_code: null,
    service_zone: null,
    system_type: "Residential Septic",
    contract_type: null,
    contract_status: null,
    contract_start: null,
    contract_end: null,
    contract_value: null,
    customer_type: "Residential",
    call_priority_label: data.opens >= 4 ? "High" : data.opens >= 2 ? "Medium" : "Low",
    call_status: "pending" as const,
    call_attempts: 0,
    last_call_date: null,
    last_call_duration: null,
    last_disposition: null,
    notes: `Opened spring service email ${data.opens}x. TN septic permit owner — warm lead.`,
    callback_date: null,
    assigned_rep: null,
    priority: data.opens >= 4 ? 5 : data.opens >= 2 ? 3 : 1,
    created_at: now,
    updated_at: now,
  }));

  useOutboundStore.setState({
    campaigns: [campaign, ...state.campaigns],
    contacts: [...contacts, ...state.contacts],
  });
}


/**
 * Inject a dedicated "Test Calls - Will Burns" campaign with 5 contacts.
 * This creates its own campaign so the power dialer only dials these 5.
 * Replaces any existing test campaign to ensure correct contact count.
 */
function injectTestContacts(): void {
  const state = useOutboundStore.getState();
  const TEST_CAMPAIGN_ID = "test-campaign-will";
  const EXPECTED_COUNT = 10;

  // Always rebuild Will Burns contacts so data stays fresh
  // (also resets any that were previously called so they can be re-tested)

  // Remove old test campaign + contacts if present
  const cleanedCampaigns = state.campaigns.filter(
    (c) => c.id !== TEST_CAMPAIGN_ID,
  );
  const cleanedContacts = state.contacts.filter(
    (c) => c.campaign_id !== TEST_CAMPAIGN_ID,
  );

  const now = new Date().toISOString();
  const testCampaign: Campaign = {
    id: TEST_CAMPAIGN_ID,
    name: "Will Burns - Outbound",
    description: "Will Burns contacts across service zones",
    status: "active",
    source_file: null,
    source_sheet: null,
    total_contacts: EXPECTED_COUNT,
    contacts_called: 0,
    contacts_connected: 0,
    contacts_interested: 0,
    contacts_completed: 0,
    assigned_reps: [],
    created_by: null,
    created_at: now,
    updated_at: now,
  };

  const willBurnsData: Array<{
    account_number: string;
    account_name: string;
    address: string;
    city: string;
    zip_code: string;
    service_zone: string;
    system_type: string;
    contract_type: string;
    contract_status: string;
    customer_type: string;
    priority: number;
  }> = [
    {
      account_number: "WB-0001",
      account_name: "Will Burns",
      address: "142 Post Oak Ln, San Marcos, TX 78666",
      city: "San Marcos",
      zip_code: "78666",
      service_zone: "Zone 1 - Home Base",
      system_type: "Aerobic",
      contract_type: "Annual",
      contract_status: "Expired",
      customer_type: "Residential",
      priority: 5,
    },
    {
      account_number: "WB-0002",
      account_name: "Will Burns",
      address: "308 Elm Creek Dr, Buda, TX 78610",
      city: "Buda",
      zip_code: "78610",
      service_zone: "Zone 2 - Buda / Kyle",
      system_type: "Conventional",
      contract_type: "Bi-Annual",
      contract_status: "Active",
      customer_type: "Residential",
      priority: 3,
    },
    {
      account_number: "WB-0003",
      account_name: "Will Burns",
      address: "720 Blanco River Rd, Wimberley, TX 78676",
      city: "Wimberley",
      zip_code: "78676",
      service_zone: "Zone 3 - Wimberley",
      system_type: "Aerobic",
      contract_type: "Annual",
      contract_status: "Expired",
      customer_type: "Residential",
      priority: 4,
    },
    {
      account_number: "WB-0004",
      account_name: "Will Burns",
      address: "55 Hilltop Cir, Dripping Springs, TX 78620",
      city: "Dripping Springs",
      zip_code: "78620",
      service_zone: "Zone 4 - Dripping Springs",
      system_type: "Aerobic",
      contract_type: "Quarterly",
      contract_status: "Expired",
      customer_type: "Commercial",
      priority: 4,
    },
    {
      account_number: "WB-0005",
      account_name: "Will Burns",
      address: "901 Ranch Rd 12, San Marcos, TX 78666",
      city: "San Marcos",
      zip_code: "78666",
      service_zone: "Zone 1 - Home Base",
      system_type: "Conventional",
      contract_type: "Annual",
      contract_status: "Pending Renewal",
      customer_type: "Residential",
      priority: 3,
    },
    {
      account_number: "WB-0006",
      account_name: "Will Burns",
      address: "415 Creekside Trl, Kyle, TX 78640",
      city: "Kyle",
      zip_code: "78640",
      service_zone: "Zone 2 - Buda / Kyle",
      system_type: "Aerobic",
      contract_type: "Annual",
      contract_status: "Expired",
      customer_type: "Residential",
      priority: 5,
    },
    {
      account_number: "WB-0007",
      account_name: "Will Burns",
      address: "1200 Wimberly Oaks Dr, Wimberley, TX 78676",
      city: "Wimberley",
      zip_code: "78676",
      service_zone: "Zone 3 - Wimberley",
      system_type: "Conventional",
      contract_type: "Bi-Annual",
      contract_status: "Active",
      customer_type: "Residential",
      priority: 2,
    },
    {
      account_number: "WB-0008",
      account_name: "Will Burns",
      address: "88 Sunset Canyon Dr, Dripping Springs, TX 78620",
      city: "Dripping Springs",
      zip_code: "78620",
      service_zone: "Zone 4 - Dripping Springs",
      system_type: "Aerobic",
      contract_type: "Annual",
      contract_status: "Pending Renewal",
      customer_type: "Commercial",
      priority: 5,
    },
    {
      account_number: "WB-0009",
      account_name: "Will Burns",
      address: "3300 Hunter Rd, San Marcos, TX 78666",
      city: "San Marcos",
      zip_code: "78666",
      service_zone: "Zone 1 - Home Base",
      system_type: "Aerobic",
      contract_type: "Quarterly",
      contract_status: "Expired",
      customer_type: "Residential",
      priority: 4,
    },
    {
      account_number: "WB-0010",
      account_name: "Will Burns",
      address: "650 Old Bastrop Hwy, Buda, TX 78610",
      city: "Buda",
      zip_code: "78610",
      service_zone: "Zone 2 - Buda / Kyle",
      system_type: "Conventional",
      contract_type: "Annual",
      contract_status: "Expired",
      customer_type: "Residential",
      priority: 3,
    },
  ];

  const testContacts: CampaignContact[] = willBurnsData.map((data, i) => ({
    id: `test-will-${i + 1}`,
    campaign_id: TEST_CAMPAIGN_ID,
    account_number: data.account_number,
    account_name: data.account_name,
    company: "Mac Septic",
    phone: "9792361958",
    email: "will@macseptic.com",
    address: data.address,
    city: data.city,
    state: "TX",
    zip_code: data.zip_code,
    service_zone: data.service_zone,
    system_type: data.system_type,
    contract_type: data.contract_type,
    contract_status: data.contract_status,
    contract_start: "2024-01-01",
    contract_end: "2025-12-31",
    contract_value: null,
    customer_type: data.customer_type,
    call_priority_label: data.priority >= 4 ? "High" : "Medium",
    call_status: "pending" as const,
    call_attempts: 0,
    last_call_date: null,
    last_call_duration: null,
    last_disposition: null,
    notes: null,
    callback_date: null,
    assigned_rep: null,
    priority: data.priority,
    created_at: now,
    updated_at: now,
  }));

  useOutboundStore.setState({
    campaigns: [testCampaign, ...cleanedCampaigns],
    contacts: [...testContacts, ...cleanedContacts],
  });
}

interface OutboundCampaignState {
  campaigns: Campaign[];
  contacts: CampaignContact[];
  activeCampaignId: string | null;
  dialerContactIndex: number;
  dialerActive: boolean;

  // Dannia Mode
  danniaMode: boolean;

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
  addContact: (campaignId: string, data: { name: string; phone: string; company?: string; email?: string; address?: string; city?: string; state?: string; zip_code?: string; service_zone?: string; notes?: string }) => string;
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

  // Dannia Mode
  setDanniaMode: (enabled: boolean) => void;

  // Auto-dial / sort setters
  setAutoDialEnabled: (enabled: boolean) => void;
  setAutoDialDelay: (delay: AutoDialDelay) => void;
  setSortOrder: (order: SortOrder) => void;
  getAutomationConfig: (campaignId: string) => CampaignAutomationConfig;

  // Seeding (legacy; no longer auto-invoked — kept for external callers)
  seedFromBuiltInData: () => Promise<void>;

  // Backend sync: replaces local state with the team-wide truth from the API.
  // Called on store rehydrate + from OutboundCampaignsPage on a 30s interval.
  syncFromBackend: () => Promise<void>;

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
      danniaMode: false,
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
        postBackend(() =>
          apiClient.post("/outbound-campaigns/campaigns", {
            id,
            name,
            description: description ?? null,
            status: "draft",
          }),
        );
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
        const body: Record<string, unknown> = {};
        if (updates.name !== undefined) body.name = updates.name;
        if (updates.description !== undefined) body.description = updates.description;
        if (updates.status !== undefined) body.status = updates.status;
        if (Object.keys(body).length > 0) {
          postBackend(() =>
            apiClient.patch(`/outbound-campaigns/campaigns/${id}`, body),
          );
        }
      },

      deleteCampaign: (id) => {
        set((s) => ({
          campaigns: s.campaigns.filter((c) => c.id !== id),
          contacts: s.contacts.filter((c) => c.campaign_id !== id),
          activeCampaignId:
            s.activeCampaignId === id ? null : s.activeCampaignId,
        }));
        postBackend(() =>
          apiClient.delete(`/outbound-campaigns/campaigns/${id}`),
        );
      },

      setCampaignStatus: (id, status) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id
              ? { ...c, status, updated_at: new Date().toISOString() }
              : c,
          ),
        }));
        postBackend(() =>
          apiClient.patch(`/outbound-campaigns/campaigns/${id}`, { status }),
        );
      },

      addContact: (campaignId, data) => {
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        const contact: CampaignContact = {
          id,
          campaign_id: campaignId,
          account_number: null,
          account_name: data.name,
          company: data.company || null,
          phone: data.phone.replace(/\D/g, ""),
          email: data.email || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          zip_code: data.zip_code || null,
          service_zone: data.service_zone || null,
          system_type: null,
          contract_type: null,
          contract_status: null,
          contract_start: null,
          contract_end: null,
          contract_value: null,
          customer_type: null,
          call_priority_label: null,
          call_status: "pending",
          call_attempts: 0,
          last_call_date: null,
          last_call_duration: null,
          last_disposition: null,
          notes: data.notes || null,
          callback_date: null,
          assigned_rep: null,
          priority: 2,
          created_at: now,
          updated_at: now,
        };
        set((s) => ({
          contacts: [...s.contacts, contact],
          campaigns: s.campaigns.map((c) =>
            c.id === campaignId
              ? { ...c, total_contacts: c.total_contacts + 1, updated_at: now }
              : c,
          ),
        }));
        postBackend(() =>
          apiClient.post(`/outbound-campaigns/campaigns/${campaignId}/contacts`, {
            contacts: [
              {
                id,
                account_name: data.name,
                phone: contact.phone,
                company: contact.company,
                email: contact.email,
                address: contact.address,
                city: contact.city,
                state: contact.state,
                zip_code: contact.zip_code,
                service_zone: contact.service_zone,
                notes: contact.notes,
                priority: contact.priority,
              },
            ],
          }),
        );
        return id;
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

        if (newContacts.length > 0) {
          postBackend(() =>
            apiClient.post(
              `/outbound-campaigns/campaigns/${campaignId}/contacts`,
              {
                contacts: newContacts.map((c) => ({
                  id: c.id,
                  account_number: c.account_number,
                  account_name: c.account_name,
                  company: c.company,
                  phone: c.phone,
                  email: c.email,
                  address: c.address,
                  city: c.city,
                  state: c.state,
                  zip_code: c.zip_code,
                  service_zone: c.service_zone,
                  system_type: c.system_type,
                  contract_type: c.contract_type,
                  contract_status: c.contract_status,
                  customer_type: c.customer_type,
                  call_priority_label: c.call_priority_label,
                  notes: c.notes,
                  priority: c.priority,
                })),
              },
            ),
          );
        }

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
        const allowed: Record<string, unknown> = {};
        const fields = [
          "account_name", "company", "phone", "email", "address", "city",
          "state", "zip_code", "service_zone", "system_type",
          "call_priority_label", "priority", "notes", "callback_date",
        ];
        for (const f of fields) {
          if (f in updates && (updates as Record<string, unknown>)[f] !== undefined) {
            allowed[f] = (updates as Record<string, unknown>)[f];
          }
        }
        if (Object.keys(allowed).length > 0) {
          postBackend(() =>
            apiClient.patch(`/outbound-campaigns/contacts/${id}`, allowed),
          );
        }
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

        postBackend(() =>
          apiClient.post(`/outbound-campaigns/contacts/${id}/dispositions`, {
            call_status: status,
            notes: notes ?? null,
          }),
        );
      },

      removeContact: (id) => {
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
        }));
        postBackend(() =>
          apiClient.delete(`/outbound-campaigns/contacts/${id}`),
        );
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

      setDanniaMode: (enabled) => set({ danniaMode: enabled }),
      setAutoDialEnabled: (enabled) => set({ autoDialEnabled: enabled }),
      setAutoDialDelay: (delay) => set({ autoDialDelay: delay }),
      setSortOrder: (order) => set({ sortOrder: order }),
      getAutomationConfig: (campaignId) => {
        return get().campaignAutomationConfigs[campaignId] ?? DEFAULT_AUTOMATION_CONFIG;
      },

      seedFromBuiltInData: async () => {
        // Legacy: no longer auto-invoked. The server is the source of truth
        // for campaigns/contacts. This is retained only for any external
        // caller that may still reference it.
        return;
      },

      syncFromBackend: async () => {
        try {
          const campRes = await apiClient.get("/outbound-campaigns/campaigns");
          const serverCampaigns = (campRes.data?.campaigns ?? []) as Array<{
            id: string;
            name: string;
            description: string | null;
            status: CampaignStatus;
            source_file: string | null;
            source_sheet: string | null;
            created_by: number | null;
            created_at: string;
            updated_at: string;
            counters: {
              total: number;
              called: number;
              connected: number;
              interested: number;
              completed: number;
            };
          }>;

          const campaigns: Campaign[] = serverCampaigns.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            status: c.status,
            source_file: c.source_file,
            source_sheet: c.source_sheet,
            total_contacts: c.counters.total,
            contacts_called: c.counters.called,
            contacts_connected: c.counters.connected,
            contacts_interested: c.counters.interested,
            contacts_completed: c.counters.completed,
            assigned_reps: [],
            created_by: c.created_by ? String(c.created_by) : null,
            created_at: c.created_at,
            updated_at: c.updated_at,
          }));

          const contactPromises = serverCampaigns.map((c) =>
            apiClient
              .get(`/outbound-campaigns/campaigns/${c.id}/contacts`)
              .then((r) => r.data?.contacts ?? [])
              .catch((err) => {
                console.warn(`[outbound] failed to fetch contacts for ${c.id}`, err);
                return [];
              }),
          );
          const contactsByCampaign = await Promise.all(contactPromises);
          const contacts: CampaignContact[] = contactsByCampaign.flat().map((c) => ({
            id: c.id,
            campaign_id: c.campaign_id,
            account_number: c.account_number ?? null,
            account_name: c.account_name,
            company: c.company ?? null,
            phone: c.phone,
            email: c.email ?? null,
            address: c.address ?? null,
            city: c.city ?? null,
            state: c.state ?? null,
            zip_code: c.zip_code ?? null,
            service_zone: c.service_zone ?? null,
            system_type: c.system_type ?? null,
            contract_type: c.contract_type ?? null,
            contract_status: c.contract_status ?? null,
            contract_start: c.contract_start ?? null,
            contract_end: c.contract_end ?? null,
            contract_value:
              c.contract_value != null ? Number(c.contract_value) : null,
            customer_type: c.customer_type ?? null,
            call_priority_label: c.call_priority_label ?? null,
            call_status: c.call_status,
            call_attempts: c.call_attempts ?? 0,
            last_call_date: c.last_call_date ?? null,
            last_call_duration: c.last_call_duration ?? null,
            last_disposition: c.last_disposition ?? null,
            notes: c.notes ?? null,
            callback_date: c.callback_date ?? null,
            assigned_rep: c.assigned_rep ? String(c.assigned_rep) : null,
            priority: c.priority ?? 0,
            created_at: c.created_at,
            updated_at: c.updated_at,
          }));

          set({ campaigns, contacts });
        } catch (err) {
          console.error("[outbound] syncFromBackend failed", err);
          throw err;
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
      version: 5,
      storage: idbStorage,
      onRehydrateStorage: () => {
        return (state) => {
          if (!state) return;
          // Pull the team-wide truth from the backend. Local state from
          // IndexedDB is kept as a fallback for offline reads until this
          // resolves. Legacy hardcoded injects are no longer run — the
          // Email Openers campaign lives in the backend (alembic 107).
          state.syncFromBackend().catch((err) => {
            console.error("[outbound] initial sync failed", err);
          });
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
        if (version < 4) {
          // v4: Replace category campaigns with geographical zones.
          // Clear old data — onRehydrateStorage will re-seed with zone campaigns.
          state.campaigns = [];
          state.contacts = [];
        }
        if (version < 5) {
          state.danniaMode = false;
        }
        return state as OutboundCampaignState;
      },
    },
  ),
);
