import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useOutboundStore } from "../store";
import {
  CAMPAIGN_STATUS_CONFIG,
  type Campaign,
  type CampaignStatus,
} from "../types";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Archive,
  ChevronRight,
  Upload,
} from "lucide-react";
import { ImportDialog } from "./ImportDialog";

interface CampaignListProps {
  onSelectCampaign: (id: string) => void;
  selectedCampaignId: string | null;
}

export function CampaignList({
  onSelectCampaign,
  selectedCampaignId,
}: CampaignListProps) {
  const campaigns = useOutboundStore((s) => s.campaigns);
  const contacts = useOutboundStore((s) => s.contacts);

  const getStats = (campaignId: string) => {
    const camp = contacts.filter((c) => c.campaign_id === campaignId);
    const total = camp.length;
    const called = camp.filter((c) => c.call_status !== "pending" && c.call_status !== "queued").length;
    const interested = camp.filter((c) => c.call_status === "interested").length;
    const completed = camp.filter((c) =>
      ["completed", "interested", "not_interested", "wrong_number", "do_not_call"].includes(c.call_status),
    ).length;
    return { total, called, interested, completed };
  };

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [importCampaignId, setImportCampaignId] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    const id = useOutboundStore.getState().createCampaign(newName.trim(), newDesc.trim() || undefined);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    onSelectCampaign(id);
  }

  function handleStatusToggle(campaign: Campaign) {
    const nextStatus: Record<CampaignStatus, CampaignStatus> = {
      draft: "active",
      active: "paused",
      paused: "active",
      completed: "archived",
      archived: "draft",
    };
    useOutboundStore.getState().setCampaignStatus(campaign.id, nextStatus[campaign.status]);
  }

  const statusAction: Record<CampaignStatus, { icon: typeof Play; label: string }> = {
    draft: { icon: Play, label: "Start" },
    active: { icon: Pause, label: "Pause" },
    paused: { icon: Play, label: "Resume" },
    completed: { icon: Archive, label: "Archive" },
    archived: { icon: Play, label: "Reopen" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Campaigns</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Campaign
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            autoFocus
            placeholder="Campaign name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreate(false);
                setNewName("");
                setNewDesc("");
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length === 0 && !showCreate && (
        <div className="text-center py-12 text-text-tertiary text-sm">
          No campaigns yet. Create one to get started.
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map((campaign) => {
          const stats = getStats(campaign.id);
          const isSelected = campaign.id === selectedCampaignId;
          const statusConf = CAMPAIGN_STATUS_CONFIG[campaign.status];
          const action = statusAction[campaign.status];

          return (
            <div
              key={campaign.id}
              className={`bg-bg-card border rounded-xl p-4 cursor-pointer transition-colors ${
                isSelected
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40"
              }`}
              onClick={() => onSelectCampaign(campaign.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-text-primary truncate">
                      {campaign.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConf.color}`}
                    >
                      {statusConf.label}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                    <span>{stats.total} contacts</span>
                    {stats.called > 0 && (
                      <span className="text-blue-600">
                        {stats.called} called
                      </span>
                    )}
                    {stats.interested > 0 && (
                      <span className="text-emerald-600">
                        {stats.interested} interested
                      </span>
                    )}
                    {stats.total > 0 && (
                      <span>
                        {((stats.completed / stats.total) * 100).toFixed(0)}%
                        done
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImportCampaignId(campaign.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
                    title="Import contacts"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusToggle(campaign);
                    }}
                    className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
                    title={action.label}
                  >
                    <action.icon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${campaign.name}"?`)) {
                        useOutboundStore.getState().deleteCampaign(campaign.id);
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-text-secondary hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight
                    className={`w-4 h-4 text-text-tertiary transition-transform ${isSelected ? "rotate-90" : ""}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Import dialog */}
      <ImportDialog
        open={!!importCampaignId}
        onClose={() => setImportCampaignId(null)}
        onImport={(rows) => {
          if (importCampaignId) {
            const count = useOutboundStore.getState().importContacts(importCampaignId, rows);
            alert(`Imported ${count} contacts`);
          }
        }}
      />
    </div>
  );
}
