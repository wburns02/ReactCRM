import { useState, useMemo } from "react";
import { CampaignList } from "./components/CampaignList";
import { CampaignStatsBar } from "./components/CampaignStatsBar";
import { ContactTable } from "./components/ContactTable";
import { PowerDialer } from "./components/PowerDialer";
import { CampaignAnalytics } from "./components/CampaignAnalytics";
import { ImportDialog } from "./components/ImportDialog";
import { useOutboundStore } from "./store";
import type { CampaignContact, CampaignStats } from "./types";
import {
  PhoneOutgoing,
  Users,
  Zap,
  Upload,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type Tab = "campaigns" | "contacts" | "dialer" | "analytics";

export function OutboundCampaignsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);

  const campaigns = useOutboundStore((s) => s.campaigns);
  const allContacts = useOutboundStore((s) => s.contacts);
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
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <PhoneOutgoing className="w-6 h-6 text-primary" />
            Outbound Campaigns
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Manage call lists, track dispositions, and power-dial through
            contacts
          </p>
        </div>
        {selectedCampaignId && (
          <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Import Contacts
          </Button>
        )}
      </div>

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
              disabled={tab.disabled}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : tab.disabled
                    ? "border-transparent text-text-tertiary cursor-not-allowed"
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
      </div>

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
