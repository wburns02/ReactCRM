import { memo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils.ts";
import { useIsMobileOrTablet } from "@/hooks/useMediaQuery";
import { useEmailCompose } from "@/context/EmailComposeContext";
import {
  PROSPECT_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
} from "@/api/types/common.ts";
import type { Prospect } from "@/api/types/prospect.ts";

/**
 * Props for memoized row component
 */
interface ProspectRowProps {
  prospect: Prospect;
  onEdit?: (prospect: Prospect) => void;
  onDelete?: (prospect: Prospect) => void;
}

/**
 * Memoized table row - prevents re-render unless props change
 */
const TableProspectRow = memo(function TableProspectRow({
  prospect,
  onEdit,
  onDelete,
}: ProspectRowProps) {
  const navigate = useNavigate();
  const { openEmailCompose } = useEmailCompose();

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or links
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    navigate(`/prospects/${prospect.id}`);
  };

  return (
    <tr
      className="hover:bg-bg-hover transition-colors cursor-pointer"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/prospects/${prospect.id}`);
        }
      }}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-text-primary">
            {prospect.first_name || ""} {prospect.last_name || ""}
          </p>
          {prospect.company_name && (
            <p className="text-sm text-text-secondary">
              {prospect.company_name}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          {prospect.email && (
            <button
              onClick={(e) => { e.stopPropagation(); openEmailCompose({ to: prospect.email!, customerName: `${prospect.first_name || ""} ${prospect.last_name || ""}` }); }}
              className="text-text-link hover:underline block text-left"
            >
              {prospect.email}
            </button>
          )}
          {prospect.phone && (
            <span className="text-text-secondary">
              {formatPhone(prospect.phone)}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="stage" stage={prospect.prospect_stage}>
          {PROSPECT_STAGE_LABELS[prospect.prospect_stage]}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">
        {prospect.lead_source ? LEAD_SOURCE_LABELS[prospect.lead_source] : "-"}
      </td>
      <td className="px-4 py-3 text-sm text-text-primary font-medium">
        {formatCurrency(prospect.estimated_value)}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">
        {formatDate(prospect.next_follow_up_date)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link to={`/prospects/${prospect.id}`}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`View ${prospect.first_name || ""} ${prospect.last_name || ""}`}
            >
              View
            </Button>
          </Link>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(prospect)}
              aria-label={`Edit ${prospect.first_name || ""} ${prospect.last_name || ""}`}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(prospect)}
              aria-label={`Delete ${prospect.first_name || ""} ${prospect.last_name || ""}`}
              className="text-danger hover:text-danger hover:bg-danger/10"
            >
              Delete
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});

interface ProspectsListProps {
  prospects: Prospect[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (prospect: Prospect) => void;
  onDelete?: (prospect: Prospect) => void;
}

/**
 * Prospects data table with pagination
 */
export function ProspectsList({
  prospects,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: ProspectsListProps) {
  const isMobile = useIsMobileOrTablet();
  const navigate = useNavigate();
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // Memoized callbacks for child components - must be before any early returns
  const handleEdit = useCallback(
    (prospect: Prospect) => onEdit?.(prospect),
    [onEdit],
  );
  const handleDelete = useCallback(
    (prospect: Prospect) => onDelete?.(prospect),
    [onDelete],
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (prospects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No prospects found
        </h3>
        <p className="text-text-secondary">
          Try adjusting your filters or add a new prospect.
        </p>
      </div>
    );
  }

  return (
    <div>
      {isMobile ? (
        /* Mobile card view */
        <div className="space-y-3">
          {prospects.map((prospect) => (
            <article
              key={prospect.id}
              className="bg-bg-card border border-border rounded-xl p-4 cursor-pointer active:bg-bg-hover transition-colors touch-manipulation"
              onClick={() => navigate(`/prospects/${prospect.id}`)}
              aria-label={`Prospect: ${prospect.first_name || ""} ${prospect.last_name || ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-text-primary">
                    {prospect.first_name || ""} {prospect.last_name || ""}
                  </h3>
                  {prospect.company_name && (
                    <p className="text-sm text-text-secondary">{prospect.company_name}</p>
                  )}
                </div>
                <Badge variant="stage" stage={prospect.prospect_stage}>
                  {PROSPECT_STAGE_LABELS[prospect.prospect_stage]}
                </Badge>
              </div>
              <div className="space-y-1 text-sm mb-3">
                {prospect.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">📧</span>
                    <span className="text-text-link truncate">{prospect.email}</span>
                  </div>
                )}
                {prospect.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">📱</span>
                    <a href={`tel:${prospect.phone}`} className="text-text-secondary" onClick={(e) => e.stopPropagation()}>{formatPhone(prospect.phone)}</a>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  {prospect.estimated_value > 0 && (
                    <span><span className="text-text-secondary">Value: </span><span className="font-medium text-text-primary">{formatCurrency(prospect.estimated_value)}</span></span>
                  )}
                  {prospect.lead_source && (
                    <span className="text-text-secondary">{LEAD_SOURCE_LABELS[prospect.lead_source]}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/prospects/${prospect.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="primary" size="sm">View</Button>
                </Link>
                {onEdit && (
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(prospect); }}>Edit</Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(prospect); }} className="text-danger hover:text-danger ml-auto">Delete</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Desktop table view */
        <div className="overflow-x-auto">
          <table className="w-full" role="grid" aria-label="Prospects list">
            <thead>
              <tr className="border-b border-border bg-bg-muted">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Stage</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Source</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Value</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Follow-up</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {prospects.map((prospect) => (
                <TableProspectRow key={prospect.id} prospect={prospect} onEdit={onEdit ? handleEdit : undefined} onDelete={onDelete ? handleDelete : undefined} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-text-secondary">
          {startItem}-{endItem} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">Prev</Button>
          <span className="text-sm text-text-secondary px-1">{page}/{totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">Next</Button>
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
