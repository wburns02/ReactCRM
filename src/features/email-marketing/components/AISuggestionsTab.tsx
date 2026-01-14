import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useAISuggestions,
  useGenerateSuggestions,
  useApproveSuggestion,
  useDismissSuggestion,
} from "@/api/hooks/useEmailMarketing.ts";
import type {
  SubscriptionTier,
  AISuggestion,
} from "@/api/types/emailMarketing.ts";
import { formatCurrency, formatDate } from "@/lib/utils.ts";

interface AISuggestionsTabProps {
  tier: SubscriptionTier; // Currently unused but kept for tier-based feature gating
}

// Suggestion type icons
const SUGGESTION_ICONS: Record<string, string> = {
  service_reminder: "🔔",
  win_back: "🎯",
  seasonal: "🌸",
  referral: "🤝",
  promotion: "💰",
  birthday: "🎂",
  default: "💡",
};

export function AISuggestionsTab({ tier: _tier }: AISuggestionsTabProps) {
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<AISuggestion | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: suggestions = [], isLoading } = useAISuggestions();
  const generateSuggestions = useGenerateSuggestions();
  const approveSuggestion = useApproveSuggestion();
  const dismissSuggestion = useDismissSuggestion();

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  const handleGenerate = async () => {
    try {
      await generateSuggestions.mutateAsync();
    } catch (err) {
      console.error("Failed to generate suggestions:", err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveSuggestion.mutateAsync(id);
      setIsPreviewOpen(false);
    } catch (err) {
      console.error("Failed to approve suggestion:", err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissSuggestion.mutateAsync(id);
      setIsPreviewOpen(false);
    } catch (err) {
      console.error("Failed to dismiss suggestion:", err);
    }
  };

  const handlePreview = (suggestion: AISuggestion) => {
    setSelectedSuggestion(suggestion);
    setIsPreviewOpen(true);
  };

  const getPriorityColor = (score: number | null | undefined): string => {
    if (!score) return "text-text-muted";
    if (score >= 80) return "text-danger";
    if (score >= 60) return "text-warning";
    return "text-text-secondary";
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
        <div>
          <p className="text-text-secondary">
            AI analyzes your customer data and suggests targeted campaigns.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateSuggestions.isPending}
        >
          {generateSuggestions.isPending
            ? "Generating..."
            : "Generate New Suggestions"}
        </Button>
      </div>

      {/* Suggestions List */}
      {pendingSuggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No pending suggestions
            </h3>
            <p className="text-text-secondary mb-4">
              Click "Generate New Suggestions" to have AI analyze your customer
              base and create personalized campaign recommendations.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generateSuggestions.isPending}
            >
              {generateSuggestions.isPending
                ? "Generating..."
                : "Generate Suggestions"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingSuggestions.map((suggestion) => {
            const icon =
              SUGGESTION_ICONS[suggestion.suggestion_type] ||
              SUGGESTION_ICONS.default;

            return (
              <Card
                key={suggestion.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{icon}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-text-primary">
                            {suggestion.title}
                          </h3>
                          <Badge variant="default" className="mt-1">
                            {suggestion.suggestion_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium ${getPriorityColor(suggestion.priority_score)}`}
                          >
                            Priority: {suggestion.priority_score || "N/A"}
                          </p>
                        </div>
                      </div>

                      {suggestion.description && (
                        <p className="text-sm text-text-secondary mb-3">
                          {suggestion.description}
                        </p>
                      )}

                      <div className="flex items-center gap-6 text-sm text-text-muted mb-3">
                        {suggestion.estimated_recipients && (
                          <span>
                            <strong>{suggestion.estimated_recipients}</strong>{" "}
                            recipients
                          </span>
                        )}
                        {suggestion.estimated_revenue && (
                          <span className="text-success">
                            Est. Revenue:{" "}
                            <strong>
                              {formatCurrency(suggestion.estimated_revenue)}
                            </strong>
                          </span>
                        )}
                        {suggestion.target_segment && (
                          <span>
                            Segment:{" "}
                            <strong>{suggestion.target_segment}</strong>
                          </span>
                        )}
                        {suggestion.suggested_send_date && (
                          <span>
                            Send:{" "}
                            <strong>
                              {formatDate(suggestion.suggested_send_date)}
                            </strong>
                          </span>
                        )}
                      </div>

                      {suggestion.ai_rationale && (
                        <div className="bg-bg-muted rounded p-3 mb-3">
                          <p className="text-xs text-text-muted mb-1">
                            AI Rationale:
                          </p>
                          <p className="text-sm text-text-secondary">
                            {suggestion.ai_rationale}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handlePreview(suggestion)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApprove(suggestion.id)}
                          disabled={approveSuggestion.isPending}
                        >
                          Approve & Send
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDismiss(suggestion.id)}
                          disabled={dismissSuggestion.isPending}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)}>
        <DialogContent size="lg">
          <DialogHeader onClose={() => setIsPreviewOpen(false)}>
            Preview: {selectedSuggestion?.title}
          </DialogHeader>
          <DialogBody>
            {selectedSuggestion && (
              <div className="space-y-4">
                <div className="bg-bg-muted rounded p-3">
                  <p className="text-xs text-text-muted mb-1">
                    Suggested Subject:
                  </p>
                  <p className="font-medium text-text-primary">
                    {selectedSuggestion.suggested_subject ||
                      "No subject generated"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-muted mb-2">
                    Suggested Content:
                  </p>
                  <div className="border border-border rounded p-4 bg-white">
                    {selectedSuggestion.suggested_body ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: selectedSuggestion.suggested_body,
                        }}
                      />
                    ) : (
                      <p className="text-text-muted">
                        No content generated. The AI will create content when
                        the campaign is approved.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-text-muted">Target Segment:</p>
                    <p className="font-medium">
                      {selectedSuggestion.target_segment || "All customers"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Estimated Recipients:</p>
                    <p className="font-medium">
                      {selectedSuggestion.estimated_recipients || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Estimated Revenue:</p>
                    <p className="font-medium text-success">
                      {selectedSuggestion.estimated_revenue
                        ? formatCurrency(selectedSuggestion.estimated_revenue)
                        : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Suggested Send Date:</p>
                    <p className="font-medium">
                      {selectedSuggestion.suggested_send_date
                        ? formatDate(selectedSuggestion.suggested_send_date)
                        : "ASAP"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() =>
                selectedSuggestion && handleDismiss(selectedSuggestion.id)
              }
              disabled={dismissSuggestion.isPending}
            >
              Dismiss
            </Button>
            <Button
              onClick={() =>
                selectedSuggestion && handleApprove(selectedSuggestion.id)
              }
              disabled={approveSuggestion.isPending}
            >
              {approveSuggestion.isPending
                ? "Approving..."
                : "Approve & Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
