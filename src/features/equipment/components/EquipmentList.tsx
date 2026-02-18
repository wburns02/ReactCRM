import { Button } from "@/components/ui/Button.tsx";
import { EquipmentStatusBadge } from "./EquipmentStatusBadge.tsx";
import { useIsMobileOrTablet } from "@/hooks/useMediaQuery";
import type { Equipment } from "@/api/types/equipment.ts";

interface EquipmentListProps {
  equipment: Equipment[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit?: (equipment: Equipment) => void;
  onDelete?: (equipment: Equipment) => void;
}

/**
 * Equipment data table with pagination
 */
export function EquipmentList({
  equipment,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onEdit,
  onDelete,
}: EquipmentListProps) {
  const isMobile = useIsMobileOrTablet();
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (equipment.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🛠️</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No equipment found
        </h3>
        <p className="text-text-secondary">
          Try adjusting your filters or add new equipment.
        </p>
      </div>
    );
  }

  return (
    <div>
      {isMobile ? (
        /* Mobile card view */
        <div className="space-y-3">
          {equipment.map((item) => (
            <article
              key={item.id}
              className="bg-bg-card border border-border rounded-xl p-4 touch-manipulation"
              aria-label={`Equipment: ${item.name}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-text-primary">{item.name}</h3>
                  <p className="text-sm text-text-secondary">{item.type}</p>
                </div>
                <EquipmentStatusBadge status={item.status} />
              </div>
              <div className="space-y-1 text-sm mb-3">
                {item.serial_number && (
                  <p className="text-text-secondary">SN: {item.serial_number}</p>
                )}
                <p className="text-text-secondary">
                  Assigned: {item.assigned_to || "Unassigned"}
                </p>
                {item.next_maintenance && (
                  <p className="text-text-secondary">
                    Next maintenance: {new Date(item.next_maintenance).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {onEdit && (
                  <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>Edit</Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={() => onDelete(item)} className="text-danger hover:text-danger ml-auto">Delete</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
      /* Desktop Table */
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="Equipment list">
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
                Type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Serial Number
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
                Assigned To
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Next Maintenance
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
            {equipment.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-bg-hover transition-colors"
                tabIndex={0}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-text-primary">{item.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {item.type}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {item.serial_number || "-"}
                </td>
                <td className="px-4 py-3">
                  <EquipmentStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {item.assigned_to || "Unassigned"}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {item.next_maintenance
                    ? new Date(item.next_maintenance).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        aria-label={"Edit " + item.name}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item)}
                        aria-label={"Delete " + item.name}
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
          Showing {startItem} to {endItem} of {total} items
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
