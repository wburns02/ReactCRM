import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { useTicket } from "@/api/hooks/useTickets.ts";
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/api/types/ticket.ts";

/**
 * Ticket detail page - view single ticket
 */
export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, error } = useTicket(id);

  const getPriorityBadgeVariant = (priority: string) => {
    const variantMap = {
      urgent: "danger",
      high: "warning",
      medium: "info",
      low: "default",
    } as const;
    return variantMap[priority as keyof typeof variantMap] || "default";
  };

  const getStatusBadgeVariant = (status: string) => {
    const variantMap = {
      open: "info",
      in_progress: "warning",
      resolved: "success",
      closed: "default",
    } as const;
    return variantMap[status as keyof typeof variantMap] || "default";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-bg-muted rounded w-1/3 mx-auto mb-4" />
              <div className="h-4 bg-bg-muted rounded w-1/2 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger mb-4">
              Failed to load ticket. It may not exist.
            </p>
            <Button onClick={() => navigate("/tickets")}>
              Back to Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-text-primary">
              {ticket.title}
            </h1>
            <Badge variant={getStatusBadgeVariant(ticket.status)}>
              {TICKET_STATUS_LABELS[ticket.status]}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary">
            Created {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/tickets")}>
          Back to List
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary whitespace-pre-wrap">
                {ticket.description}
              </p>
            </CardContent>
          </Card>

          {/* RICE Scoring Details */}
          {ticket.rice_score !== null && (
            <Card>
              <CardHeader>
                <CardTitle>RICE Priority Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-1">
                        RICE Score
                      </h4>
                      <p className="text-3xl font-bold text-primary">
                        {ticket.rice_score.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg-muted rounded-lg p-3">
                    <p className="text-xs text-text-secondary mb-1">Reach</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {ticket.reach !== null ? ticket.reach.toFixed(1) : "-"}
                    </p>
                    <p className="text-xs text-text-muted">users affected</p>
                  </div>

                  <div className="bg-bg-muted rounded-lg p-3">
                    <p className="text-xs text-text-secondary mb-1">Impact</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {ticket.impact !== null ? ticket.impact.toFixed(1) : "-"}
                    </p>
                    <p className="text-xs text-text-muted">per user</p>
                  </div>

                  <div className="bg-bg-muted rounded-lg p-3">
                    <p className="text-xs text-text-secondary mb-1">
                      Confidence
                    </p>
                    <p className="text-lg font-semibold text-text-primary">
                      {ticket.confidence !== null
                        ? ticket.confidence.toFixed(0)
                        : "-"}
                      %
                    </p>
                    <p className="text-xs text-text-muted">certainty</p>
                  </div>

                  <div className="bg-bg-muted rounded-lg p-3">
                    <p className="text-xs text-text-secondary mb-1">Effort</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {ticket.effort !== null ? ticket.effort.toFixed(1) : "-"}
                    </p>
                    <p className="text-xs text-text-muted">person-weeks</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-bg-hover rounded-lg">
                  <p className="text-xs text-text-secondary">
                    <strong>Formula:</strong> RICE = (Reach × Impact ×
                    Confidence%) / Effort
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Properties */}
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  Type
                </p>
                <Badge variant="default">
                  {TICKET_TYPE_LABELS[ticket.type]}
                </Badge>
              </div>

              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  Priority
                </p>
                <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </Badge>
              </div>

              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  Status
                </p>
                <Badge variant={getStatusBadgeVariant(ticket.status)}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
              </div>

              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  Assigned To
                </p>
                <p className="text-sm text-text-primary">
                  {ticket.assigned_to || "Unassigned"}
                </p>
              </div>

              {ticket.resolved_at && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                    Resolved At
                  </p>
                  <p className="text-sm text-text-primary">
                    {new Date(ticket.resolved_at).toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                  Last Updated
                </p>
                <p className="text-sm text-text-primary">
                  {ticket.updated_at
                    ? new Date(ticket.updated_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
