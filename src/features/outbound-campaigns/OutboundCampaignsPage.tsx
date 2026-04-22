import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { CampaignList } from "./components/CampaignList";
import { CampaignStatsBar } from "./components/CampaignStatsBar";
import { ContactTable } from "./components/ContactTable";
import { PowerDialer } from "./components/PowerDialer";
import { CampaignAnalytics } from "./components/CampaignAnalytics";
import { PermitCampaignBuilder } from "./components/PermitCampaignBuilder";
import { ImportDialog } from "./components/ImportDialog";
import { useOutboundStore } from "./store";
import { useLocalMigration } from "./useLocalMigration";
import type { CampaignContact, CampaignStats } from "./types";
import {
  PhoneOutgoing,
  Users,
  Zap,
  Upload,
  BarChart3,
  FileSearch,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const DanniaDashboard = lazy(() =>
  import("./dannia/components/DanniaDashboard").then((m) => ({
    default: m.DanniaDashboard,
  })),
);

type Tab = "campaigns" | "contacts" | "dialer" | "analytics" | "permits";

export function OutboundCampaignsPage() {
  useLocalMigration();
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);

  const campaigns = useOutboundStore((s) => s.campaigns);
  const allContacts = useOutboundStore((s) => s.contacts);
  const danniaMode = useOutboundStore((s) => s.danniaMode);
  const syncFromBackend = useOutboundStore((s) => s.syncFromBackend);

  // Pull team-wide truth on mount and every 30s while the page is visible.
  useEffect(() => {
    syncFromBackend().catch(() => {
      /* logged in store */
    });
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        syncFromBackend().catch(() => {});
      }
    }, 30_000);
    const onFocus = () => {
      syncFromBackend().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncFromBackend]);

  // Auto-select the first campaign so tabs are never disabled
  useEffect(() => {
    if (!selectedCampaignId && campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const stats: CampaignStats | null = useMemo(() => {
    if (!selectedCampaignId) return null;
    const camp = allContacts.filter((c) => c.campaign_id === selectedCampaignId);
    const total = camp.length;
    const pending = camp.filter((c) => c.call_status === "pending").length;
    const called = camp.filter((c) => c.call_status !== "pending" && c.call_status !== "queued").length;
    const connected = camp.filter((c) =>
      ["connected", "interested", "not_interested", "completed"].includes(c.call_status),
    ).length;
    const interested = camp.filter((c) => c.call_status === "interested").length;
    const not_interested = camp.filter((c) => c.call_status === "not_interested").length;
    const voicemail = camp.filter((c) => c.call_status === "voicemail").length;
    const no_answer = camp.filter((c) => c.call_status === "no_answer").length;
    const callback_scheduled = camp.filter((c) => c.call_status === "callback_scheduled").length;
    const completed = camp.filter((c) =>
      ["completed", "interested", "not_interested", "wrong_number", "do_not_call"].includes(c.call_status),
    ).length;
    const do_not_call = camp.filter((c) => c.call_status === "do_not_call").length;
    return {
      total, pending, called, connected, interested, not_interested,
      voicemail, no_answer, callback_scheduled, completed, do_not_call,
      connect_rate: called > 0 ? (connected / called) * 100 : 0,
      interest_rate: connected > 0 ? (interested / connected) * 100 : 0,
    };
  }, [allContacts, selectedCampaignId]);

  function handleSelectCampaign(id: string) {
    setSelectedCampaignId(id);
    if (activeTab === "campaigns") {
      setActiveTab("contacts");
    }
  }

  function handleDialContact(contact: CampaignContact) {
    // Switch to dialer tab with this contact focused
    setActiveTab("dialer");
  }

  const tabs: {
    id: Tab;
    label: string;
    icon: typeof PhoneOutgoing;
    disabled: boolean;
  }[] = [
    { id: "campaigns", label: "Campaigns", icon: PhoneOutgoing, disabled: false },
    {
      id: "contacts",
      label: "Contacts",
      icon: Users,
      disabled: !selectedCampaignId,
    },
    {
      id: "dialer",
      label: "Power Dialer",
      icon: Zap,
      disabled: !selectedCampaignId,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      disabled: !selectedCampaignId,
    },
    {
      id: "permits",
      label: "Permit Campaigns",
      icon: FileSearch,
      disabled: false,
    },
  ];

  return (
    <div
      className="p-6 max-w-7xl mx-auto"
      {...(danniaMode ? { "data-dannia": true } : {})}
    >
      {/* Header */}
      {danniaMode ? (
        /* ── Dannia Mode header: gradient banner ── */
        <div className="dannia-enter mb-6">
          <div className="dannia-gradient-header rounded-2xl px-6 py-5 mb-4 relative overflow-hidden">
            <div className="dannia-shimmer absolute inset-0 rounded-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  Dannia Mode
                </h1>
                <p className="text-sm text-white/80 mt-1 ml-[42px]">
                  Autonomous outbound engine — just show up and talk
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    useOutboundStore.getState().setDanniaMode(false)
                  }
                  className="dannia-toggle-active flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white border transition-all"
                >
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Dannia Mode
                  <span className="text-white/60 text-[10px]">ON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Normal mode header ── */
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
              <PhoneOutgoing className="w-6 h-6 text-primary" />
              Outbound Campaigns
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Manage call lists, track dispositions, and power-dial through contacts
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Dannia Mode toggle */}
            <button
              onClick={() =>
                useOutboundStore.getState().setDanniaMode(true)
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 text-violet-700 dark:text-violet-300 hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-950/50 dark:hover:to-indigo-950/50 hover:border-violet-300 dark:hover:border-violet-700 transition-all hover:shadow-md hover:shadow-violet-500/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Dannia Mode
            </button>
            {selectedCampaignId && (
              <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-1" /> Import Contacts
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Dannia Mode Dashboard */}
      {danniaMode ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12 text-text-tertiary text-sm">
              <Sparkles className="w-5 h-5 animate-pulse mr-2 text-violet-400" />
              Loading Dannia Mode...
            </div>
          }
        >
          <DanniaDashboard />
        </Suspense>
      ) : (
        <>
          {/* Campaign stats bar */}
          {stats && selectedCampaign && (
            <div className="mb-6">
              <div className="text-xs text-text-tertiary mb-2 flex items-center gap-2">
                <span className="font-medium">{selectedCampaign.name}</span>
                <button
                  onClick={() => {
                    setSelectedCampaignId(null);
                    setActiveTab("campaigns");
                  }}
                  className="text-primary hover:underline"
                >
                  Change
                </button>
              </div>
              <CampaignStatsBar stats={stats} />
            </div>
          )}

          {/* Tab navigation */}
          <div className="border-b border-border mb-6">
            <nav className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : tab.disabled
                        ? "border-transparent text-text-tertiary/50 opacity-40 cursor-default"
                        : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "campaigns" && (
              <CampaignList
                onSelectCampaign={handleSelectCampaign}
                selectedCampaignId={selectedCampaignId}
              />
            )}
            {activeTab === "contacts" && selectedCampaignId && (
              <ContactTable
                campaignId={selectedCampaignId}
                onDialContact={handleDialContact}
              />
            )}
            {activeTab === "dialer" && selectedCampaignId && (
              <PowerDialer campaignId={selectedCampaignId} />
            )}
            {activeTab === "analytics" && selectedCampaignId && (
              <CampaignAnalytics campaignId={selectedCampaignId} />
            )}
            {activeTab === "permits" && (
              <PermitCampaignBuilder />
            )}
          </div>
        </>
      )}

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(rows) => {
          if (selectedCampaignId) {
            const count = useOutboundStore.getState().importContacts(selectedCampaignId, rows);
            alert(`Imported ${count} contacts`);
          }
        }}
      />
    </div>
  );
}
