import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { useIsMobileOrTablet } from "@/hooks/useMediaQuery";
import {
  type Ticket,
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/api/types/ticket.ts";

interface TicketsListProps {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (ticket: Ticket) => void;
  onDelete?: (ticket: Ticket) => void;
}

/**
 * Tickets data table with pagination
 */
export function TicketsList({
  tickets,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: TicketsListProps) {
  const isMobile = useIsMobileOrTablet();
  const navigate = useNavigate();
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🎫</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No tickets found
        </h3>
        <p className="text-text-secondary">
          Try adjusting your filters or create a new ticket.
        </p>
      </div>
    );
  }

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

  return (
    <div>
      {isMobile ? (
        /* Mobile card view */
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              className="bg-bg-card border border-border rounded-xl p-4 cursor-pointer active:bg-bg-hover transition-colors touch-manipulation"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              aria-label={`Ticket: ${ticket.title}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-text-primary flex-1 mr-2">{ticket.title}</h3>
                <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </Badge>
              </div>
              {ticket.description && (
                <p className="text-sm text-text-secondary line-clamp-2 mb-2">{ticket.description}</p>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={getStatusBadgeVariant(ticket.status)}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
                <Badge variant="default">{TICKET_TYPE_LABELS[ticket.type]}</Badge>
                {ticket.rice_score !== null && (
                  <span className="text-xs text-text-muted ml-auto">RICE: {ticket.rice_score.toFixed(1)}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Link to={`/tickets/${ticket.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="primary" size="sm">View</Button>
                </Link>
                {onEdit && (
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(ticket); }}>Edit</Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(ticket); }} className="text-danger hover:text-danger ml-auto">Delete</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
      /* Desktop Table */
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Tickets list">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Title
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Priority
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                RICE Score
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="hover:bg-bg-hover transition-colors"
                tabIndex={0}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-text-primary">
                      {ticket.title}
                    </p>
                    <p className="text-sm text-text-secondary line-clamp-1">
                      {ticket.description}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default">
                    {TICKET_TYPE_LABELS[ticket.type]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusBadgeVariant(ticket.status)}>
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                    {TICKET_PRIORITY_LABELS[ticket.priority]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {ticket.rice_score !== null ? (
                    <span className="font-medium text-text-primary">
                      {ticket.rice_score.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/tickets/${ticket.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={"View " + ticket.title}
                      >
                        View
                      </Button>
                    </Link>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(ticket)}
                        aria-label={"Edit " + ticket.title}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(ticket)}
                        aria-label={"Delete " + ticket.title}
                        className="text-danger hover:text-danger"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-text-secondary">
          Showing {startItem} to {endItem} of {total} tickets
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for table
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-bg-muted mb-2" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-bg-hover mb-1" />
      ))}
    </div>
  );
}
