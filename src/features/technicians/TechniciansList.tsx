import { memo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatPhone } from "@/lib/utils.ts";
import { TECHNICIAN_SKILL_LABELS } from "@/api/types/technician.ts";
import type { Technician, TechnicianSkill } from "@/api/types/technician.ts";

/**
 * Props for memoized row component
 */
interface TechnicianRowProps {
  technician: Technician;
  onEdit?: (technician: Technician) => void;
  onDelete?: (technician: Technician) => void;
}

/**
 * Memoized table row - prevents re-render unless props change
 */
const TableTechnicianRow = memo(function TableTechnicianRow({
  technician,
  onEdit,
  onDelete,
}: TechnicianRowProps) {
  return (
    <tr className="hover:bg-bg-hover transition-colors" tabIndex={0}>
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
            <a
              href={"mailto:" + technician.email}
              className="text-text-link hover:underline block"
            >
              {technician.email}
            </a>
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
              onClick={(e) => {
                console.log('[TableTechnicianRow] Delete button clicked, technician:', technician.id);
                console.log('[TableTechnicianRow] onDelete function exists:', !!onDelete);
                e.stopPropagation(); // Prevent any parent handlers from interfering
                onDelete(technician);
              }}
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
});

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

  // Debug: Log when onDelete prop is received
  console.log('[TechniciansList] onDelete prop received:', !!onDelete);

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
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Technicians list">
          <thead>
            <tr className="border-b border-border bg-bg-muted">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Contact
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Skills
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Vehicle
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Status
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
            {technicians.map((technician) => (
              <TableTechnicianRow
                key={technician.id}
                technician={technician}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-text-secondary">
          Showing {startItem} to {endItem} of {total} technicians
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
