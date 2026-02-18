import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatPhone } from "@/lib/utils.ts";
import { useIsMobileOrTablet } from "@/hooks/useMediaQuery";
import { TECHNICIAN_SKILL_LABELS } from "@/api/types/technician.ts";
import type { Technician, TechnicianSkill } from "@/api/types/technician.ts";
import { useEmailCompose } from "@/context/EmailComposeContext";

/**
 * Props for memoized row component
 */
interface TechnicianRowProps {
  technician: Technician;
  onEdit?: (technician: Technician) => void;
  onDelete?: (technician: Technician) => void;
}

/**
 * Table row component for technician data
 */
function TableTechnicianRow({
  technician,
  onEdit,
  onDelete,
}: TechnicianRowProps) {
  const navigate = useNavigate();
  const { openEmailCompose } = useEmailCompose();

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking interactive elements (links, buttons)
    if ((e.target as HTMLElement).closest("a, button")) {
      return;
    }
    navigate(`/technicians/${technician.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/technicians/${technician.id}`);
    }
  };

  return (
    <tr
      className="hover:bg-bg-hover transition-colors cursor-pointer"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      role="row"
      aria-label={`View ${technician.first_name} ${technician.last_name}`}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-text-primary">
            {technician.first_name} {technician.last_name}
          </p>
          {technician.employee_id && (
            <p className="text-sm text-text-secondary">
              ID: {technician.employee_id}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          {technician.email && (
            <button
              onClick={(e) => { e.stopPropagation(); openEmailCompose({ to: technician.email!, customerName: `${technician.first_name} ${technician.last_name}` }); }}
              className="text-text-link hover:underline block text-left"
            >
              {technician.email}
            </button>
          )}
          {technician.phone && (
            <span className="text-text-secondary">
              {formatPhone(technician.phone)}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {technician.skills && technician.skills.length > 0 ? (
            technician.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="default" className="text-xs">
                {TECHNICIAN_SKILL_LABELS[skill as TechnicianSkill] || skill}
              </Badge>
            ))
          ) : (
            <span className="text-text-muted text-sm">-</span>
          )}
          {technician.skills && technician.skills.length > 3 && (
            <Badge variant="default" className="text-xs">
              +{technician.skills.length - 3}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">
        {technician.assigned_vehicle || "-"}
      </td>
      <td className="px-4 py-3">
        <Badge variant={technician.is_active ? "success" : "default"}>
          {technician.is_active ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link to={`/technicians/${technician.id}`}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={
                "View " + technician.first_name + " " + technician.last_name
              }
            >
              View
            </Button>
          </Link>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(technician)}
              aria-label={
                "Edit " + technician.first_name + " " + technician.last_name
              }
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(technician)}
              aria-label={
                "Delete " + technician.first_name + " " + technician.last_name
              }
              className="text-danger hover:text-danger"
            >
              Delete
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface TechniciansListProps {
  technicians: Technician[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (technician: Technician) => void;
  onDelete?: (technician: Technician) => void;
}

/**
 * Technicians data table with pagination
 */
export function TechniciansList({
  technicians,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: TechniciansListProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const isMobile = useIsMobileOrTablet();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (technicians.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">👷</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No technicians found
        </h3>
        <p className="text-text-secondary">
          Try adjusting your filters or add a new technician.
        </p>
      </div>
    );
  }

  return (
    <div>
      {isMobile ? (
        /* Mobile card view */
        <div className="space-y-3">
          {technicians.map((technician) => (
            <article
              key={technician.id}
              className="bg-bg-card border border-border rounded-xl p-4 cursor-pointer active:bg-bg-hover transition-colors touch-manipulation"
              onClick={() => navigate(`/technicians/${technician.id}`)}
              aria-label={`Technician: ${technician.first_name} ${technician.last_name}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-text-primary text-base">
                    {technician.first_name} {technician.last_name}
                  </h3>
                  {technician.email && (
                    <p className="text-sm text-text-link">{technician.email}</p>
                  )}
                  {technician.phone && (
                    <p className="text-sm text-text-secondary">{formatPhone(technician.phone)}</p>
                  )}
                </div>
                <Badge variant={technician.is_active ? "success" : "default"}>
                  {technician.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {technician.skills && technician.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {technician.skills.slice(0, 4).map((skill) => (
                    <Badge key={skill} variant="default" className="text-xs">
                      {TECHNICIAN_SKILL_LABELS[skill as TechnicianSkill] || skill}
                    </Badge>
                  ))}
                  {technician.skills.length > 4 && (
                    <Badge variant="default" className="text-xs">+{technician.skills.length - 4}</Badge>
                  )}
                </div>
              )}
              {technician.assigned_vehicle && (
                <div className="text-sm text-text-secondary mb-3">
                  <span className="mr-1">🚛</span> {technician.assigned_vehicle}
                </div>
              )}
              <div className="flex gap-2">
                <Link to={`/technicians/${technician.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="primary" size="sm">View</Button>
                </Link>
                {onEdit && (
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(technician); }}>Edit</Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(technician); }} className="text-danger hover:text-danger ml-auto">Delete</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Desktop table view */
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Technicians list">
            <thead>
              <tr className="border-b border-border bg-bg-muted">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Skills</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Vehicle</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {technicians.map((technician) => (
                <TableTechnicianRow key={technician.id} technician={technician} onEdit={onEdit} onDelete={onDelete} />
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
