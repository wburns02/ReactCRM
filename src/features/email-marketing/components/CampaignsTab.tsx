import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useCampaigns,
  useCreateCampaign,
  useSendCampaign,
  useDeleteCampaign,
  useTemplates,
  useSegments,
} from "@/api/hooks/useEmailMarketing.ts";
import {
  CAMPAIGN_STATUS_LABELS,
  type SubscriptionTier,
} from "@/api/types/emailMarketing.ts";
import { formatDate } from "@/lib/utils.ts";

interface CampaignsTabProps {
  tier: SubscriptionTier;
}

export function CampaignsTab({ tier }: CampaignsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_id: "",
    segment: "",
  });

  const { data: campaigns = [], isLoading } = useCampaigns(
    statusFilter || undefined,
  );
  const { data: templates = [] } = useTemplates();
  const { data: segments = [] } = useSegments();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();
  const deleteCampaign = useDeleteCampaign();

  const canCreate = tier !== "none";

  const handleCreate = async () => {
    if (!formData.name) return;

    try {
      await createCampaign.mutateAsync(formData);
      setIsCreateOpen(false);
      setFormData({ name: "", description: "", template_id: "", segment: "" });
    } catch (err) {
      console.error("Failed to create campaign:", err);
    }
  };

  const handleSend = async (campaignId: string) => {
    if (confirm("Are you sure you want to send this campaign?")) {
      try {
        await sendCampaign.mutateAsync(campaignId);
      } catch (err) {
        console.error("Failed to send campaign:", err);
      }
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      try {
        await deleteCampaign.mutateAsync(campaignId);
      } catch (err) {
        console.error("Failed to delete campaign:", err);
      }
    }
  };

  const getStatusBadgeVariant = (
    status: string,
  ): "default" | "success" | "warning" | "danger" => {
    switch (status) {
      case "sent":
        return "success";
      case "sending":
        return "warning";
      case "canceled":
        return "danger";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-bg-muted rounded" />
        <div className="h-48 bg-bg-muted rounded" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="canceled">Canceled</option>
          </Select>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} disabled={!canCreate}>
          Create Campaign
        </Button>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No campaigns yet
            </h3>
            <p className="text-text-secondary mb-4">
              Create your first email campaign to start reaching customers.
            </p>
            {canCreate && (
              <Button onClick={() => setIsCreateOpen(true)}>
                Create Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text-primary">
                        {campaign.name}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(campaign.status)}>
                        {CAMPAIGN_STATUS_LABELS[campaign.status] ||
                          campaign.status}
                      </Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-text-secondary mb-2">
                        {campaign.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      {campaign.segment && (
                        <span>Segment: {campaign.segment}</span>
                      )}
                      {campaign.sent_at && (
                        <span>Sent: {formatDate(campaign.sent_at)}</span>
                      )}
                      {campaign.scheduled_at && (
                        <span>
                          Scheduled: {formatDate(campaign.scheduled_at)}
                        </span>
                      )}
                      <span>Created: {formatDate(campaign.created_at)}</span>
                    </div>
                    {campaign.stats && (
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-text-secondary">
                          Sent: <strong>{campaign.stats.total_sent}</strong>
                        </span>
                        <span className="text-text-secondary">
                          Opened: <strong>{campaign.stats.opened}</strong>
                          {campaign.stats.total_sent > 0 && (
                            <span className="text-text-muted">
                              {" "}
                              (
                              {(
                                (campaign.stats.opened /
                                  campaign.stats.total_sent) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                          )}
                        </span>
                        <span className="text-text-secondary">
                          Clicked: <strong>{campaign.stats.clicked}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.status === "draft" && canCreate && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSend(campaign.id)}
                          disabled={sendCampaign.isPending}
                        >
                          Send
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(campaign.id)}
                          disabled={deleteCampaign.isPending}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                    {campaign.status === "sent" && (
                      <Button size="sm" variant="secondary">
                        View Report
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <DialogContent>
          <DialogHeader onClose={() => setIsCreateOpen(false)}>
            Create Campaign
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Spring Pumping Reminder"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of this campaign"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="template">Template</Label>
                <Select
                  id="template"
                  value={formData.template_id}
                  onChange={(e) =>
                    setFormData({ ...formData, template_id: e.target.value })
                  }
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="segment">Target Segment</Label>
                <Select
                  id="segment"
                  value={formData.segment}
                  onChange={(e) =>
                    setFormData({ ...formData, segment: e.target.value })
                  }
                >
                  <option value="">All customers</option>
                  {segments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.name} ({segment.count})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || createCampaign.isPending}
            >
              {createCampaign.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
