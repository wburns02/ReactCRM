import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useContextMenu } from "../context/ContextMenuContext.tsx";
import {
  useUpdateWorkOrder,
  useAssignWorkOrder,
  useUnscheduleWorkOrder,
  useDeleteWorkOrder,
} from "@/api/hooks/useWorkOrders.ts";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import {
  type WorkOrderStatus,
  type JobType,
  type Priority,
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from "@/api/types/workOrder.ts";
import { SCHEDULE_CONFIG } from "@/api/types/schedule.ts";

/**
 * Priority color dots for the priority picker
 */
const PRIORITY_DOTS: Record<string, string> = {
  emergency: "bg-red-500",
  urgent: "bg-orange-500",
  high: "bg-yellow-500",
  normal: "bg-blue-500",
  low: "bg-gray-400",
};

type ExpandedSection = "technician" | "time" | "status" | "priority" | null;

/**
 * WorkOrderContextMenu — right-click menu for quick work order edits
 *
 * Renders via portal at mouse coordinates. Expandable sections for
 * technician assignment, time setting, status change, and priority change.
 */
export function WorkOrderContextMenu() {
  const { state, closeMenu } = useContextMenu();
  const { isOpen, position, workOrder } = state;
  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Mutations
  const updateWorkOrder = useUpdateWorkOrder();
  const assignWorkOrder = useAssignWorkOrder();
  const unscheduleWorkOrder = useUnscheduleWorkOrder();
  const deleteWorkOrder = useDeleteWorkOrder();

  // Technician list (only fetched when menu is open)
  const { data: techData } = useTechnicians(
    isOpen ? { page: 1, page_size: 50, active_only: true } : {},
  );
  const technicians = techData?.items || [];

  // Reset expanded section and delete confirmation when menu opens/closes
  useEffect(() => {
    if (!isOpen) {
      setExpanded(null);
      setConfirmingDelete(false);
    }
  }, [isOpen]);

  // Calculate position with viewport boundary detection
  useEffect(() => {
    if (!isOpen) return;

    const menuWidth = 256;
    const menuHeight = 320; // estimated max height
    const padding = 8;

    let top = position.y;
    let left = position.x;

    // Flip left if near right edge
    if (left + menuWidth + padding > window.innerWidth) {
      left = left - menuWidth;
    }
    // Flip up if near bottom edge
    if (top + menuHeight + padding > window.innerHeight) {
      top = Math.max(padding, top - menuHeight);
    }
    // Clamp to viewport
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    setMenuPosition({ top, left });
  }, [isOpen, position]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, closeMenu]);

  const toggleSection = useCallback((section: ExpandedSection) => {
    setExpanded((prev) => (prev === section ? null : section));
  }, []);

  // Action handlers
  const handleAssignTech = useCallback(
    (techName: string | null) => {
      if (!workOrder) return;
      if (techName) {
        assignWorkOrder.mutate({
          id: workOrder.id,
          technician: techName,
          date: workOrder.scheduled_date || undefined,
        });
      } else {
        // Unassign
        updateWorkOrder.mutate({
          id: workOrder.id,
          data: { assigned_technician: "" },
        });
      }
      closeMenu();
    },
    [workOrder, assignWorkOrder, updateWorkOrder, closeMenu],
  );

  const handleSetTime = useCallback(
    (hour: number) => {
      if (!workOrder) return;
      const timeStr = `${hour.toString().padStart(2, "0")}:00:00`;
      updateWorkOrder.mutate({
        id: workOrder.id,
        data: { time_window_start: timeStr },
      });
      closeMenu();
    },
    [workOrder, updateWorkOrder, closeMenu],
  );

  const handleChangeStatus = useCallback(
    (status: string) => {
      if (!workOrder) return;
      updateWorkOrder.mutate({
        id: workOrder.id,
        data: { status: status as WorkOrderStatus },
      });
      closeMenu();
    },
    [workOrder, updateWorkOrder, closeMenu],
  );

  const handleChangePriority = useCallback(
    (priority: string) => {
      if (!workOrder) return;
      updateWorkOrder.mutate({
        id: workOrder.id,
        data: { priority: priority as Priority },
      });
      closeMenu();
    },
    [workOrder, updateWorkOrder, closeMenu],
  );

  const handleUnschedule = useCallback(() => {
    if (!workOrder) return;
    unscheduleWorkOrder.mutate(workOrder.id);
    closeMenu();
  }, [workOrder, unscheduleWorkOrder, closeMenu]);

  const handleDelete = useCallback(() => {
    if (!workOrder) return;
    deleteWorkOrder.mutate(workOrder.id);
    closeMenu();
  }, [workOrder, deleteWorkOrder, closeMenu]);

  if (!isOpen || !workOrder) return null;

  // Parse current time hour for highlighting
  let currentHour: number | null = null;
  if (workOrder.time_window_start) {
    const parsed = parseInt(workOrder.time_window_start.split(":")[0], 10);
    if (!isNaN(parsed)) currentHour = parsed;
  }

  // Generate time slots
  const timeSlots: { hour: number; label: string }[] = [];
  for (
    let h = SCHEDULE_CONFIG.WORK_HOURS.start;
    h < SCHEDULE_CONFIG.WORK_HOURS.end;
    h++
  ) {
    const period = h >= 12 ? "PM" : "AM";
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
    timeSlots.push({ hour: h, label: `${display}${period}` });
  }

  return createPortal(
    <>
    {/* Transparent backdrop: clicking anywhere outside closes the menu */}
    <div
      className="fixed inset-0 z-[59]"
      data-testid="wo-context-backdrop"
      onMouseDown={closeMenu}
    />
    <div
      ref={menuRef}
      role="menu"
      data-testid="wo-context-menu"
      className="fixed z-[60] w-64 overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ top: menuPosition.top, left: menuPosition.left }}
    >
      <div className="max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border bg-bg-muted">
          <p className="text-xs font-semibold text-text-primary truncate">
            {workOrder.work_order_number || workOrder.id.slice(0, 8)} &middot;{" "}
            {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}
          </p>
          <p className="text-xs text-text-secondary truncate">
            {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
          </p>
        </div>

        {/* Expandable Sections */}
        <div className="py-1">
          {/* Assign Technician */}
          <button
            type="button"
            role="menuitem"
            data-testid="ctx-assign-tech"
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            onClick={() => toggleSection("technician")}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs">👷</span>
              Assign Technician
            </span>
            <span
              className={`text-[10px] text-text-muted transition-transform ${expanded === "technician" ? "rotate-90" : ""}`}
            >
              ▸
            </span>
          </button>
          {expanded === "technician" && (
            <div
              className="px-2 pb-2 space-y-0.5"
              data-testid="ctx-tech-list"
            >
              {technicians.map((tech) => {
                const fullName = `${tech.first_name} ${tech.last_name}`;
                const isCurrent =
                  workOrder.assigned_technician === fullName;
                return (
                  <button
                    key={tech.id}
                    type="button"
                    className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                    onClick={() => handleAssignTech(fullName)}
                  >
                    {isCurrent && (
                      <span className="mr-1.5">✓</span>
                    )}
                    {fullName}
                  </button>
                );
              })}
              {workOrder.assigned_technician && (
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-xs text-text-muted hover:text-danger hover:bg-bg-hover rounded transition-colors"
                  onClick={() => handleAssignTech(null)}
                >
                  Unassign
                </button>
              )}
              {technicians.length === 0 && (
                <p className="px-2 py-1 text-xs text-text-muted">
                  No technicians available
                </p>
              )}
            </div>
          )}

          {/* Set Time */}
          <button
            type="button"
            role="menuitem"
            data-testid="ctx-set-time"
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            onClick={() => toggleSection("time")}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs">🕐</span>
              Set Time
            </span>
            <span
              className={`text-[10px] text-text-muted transition-transform ${expanded === "time" ? "rotate-90" : ""}`}
            >
              ▸
            </span>
          </button>
          {expanded === "time" && (
            <div
              className="px-2 pb-2 grid grid-cols-4 gap-1"
              data-testid="ctx-time-grid"
            >
              {timeSlots.map(({ hour, label }) => (
                <button
                  key={hour}
                  type="button"
                  className={`px-1 py-1.5 text-xs rounded text-center transition-colors ${
                    currentHour === hour
                      ? "bg-primary text-white font-semibold"
                      : "bg-bg-muted text-text-secondary hover:bg-primary/10 hover:text-primary"
                  }`}
                  onClick={() => handleSetTime(hour)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Change Status */}
          <button
            type="button"
            role="menuitem"
            data-testid="ctx-change-status"
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            onClick={() => toggleSection("status")}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs">📋</span>
              Change Status
            </span>
            <span
              className={`text-[10px] text-text-muted transition-transform ${expanded === "status" ? "rotate-90" : ""}`}
            >
              ▸
            </span>
          </button>
          {expanded === "status" && (
            <div
              className="px-2 pb-2 space-y-0.5"
              data-testid="ctx-status-list"
            >
              {Object.entries(WORK_ORDER_STATUS_LABELS).map(
                ([value, label]) => {
                  const isCurrent = workOrder.status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                        isCurrent
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                      }`}
                      onClick={() => handleChangeStatus(value)}
                    >
                      {isCurrent && (
                        <span className="mr-1.5">✓</span>
                      )}
                      {label}
                    </button>
                  );
                },
              )}
            </div>
          )}

          {/* Set Priority */}
          <button
            type="button"
            role="menuitem"
            data-testid="ctx-set-priority"
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            onClick={() => toggleSection("priority")}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs">⚡</span>
              Set Priority
            </span>
            <span
              className={`text-[10px] text-text-muted transition-transform ${expanded === "priority" ? "rotate-90" : ""}`}
            >
              ▸
            </span>
          </button>
          {expanded === "priority" && (
            <div
              className="px-2 pb-2 space-y-0.5"
              data-testid="ctx-priority-list"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => {
                const isCurrent = workOrder.priority === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                    onClick={() => handleChangePriority(value)}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOTS[value] || "bg-gray-400"}`}
                    />
                    {isCurrent && <span>✓</span>}
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Direct Actions */}
        <div className="border-t border-border py-1">
          <Link
            to={`/work-orders/${workOrder.id}`}
            role="menuitem"
            data-testid="ctx-view-details"
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            onClick={closeMenu}
          >
            <span className="text-xs">📝</span>
            View Details
          </Link>
          {workOrder.scheduled_date && (
            <button
              type="button"
              role="menuitem"
              data-testid="ctx-unschedule"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg-hover transition-colors"
              onClick={handleUnschedule}
            >
              <span className="text-xs">✕</span>
              Unschedule
            </button>
          )}
          {!workOrder.scheduled_date && (
            <>
              {!confirmingDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="ctx-delete"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <span className="text-xs">🗑️</span>
                  Delete Work Order
                </button>
              ) : (
                <div className="px-3 py-2 space-y-2" data-testid="ctx-delete-confirm">
                  <p className="text-xs font-medium text-danger">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-testid="ctx-delete-yes"
                      className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-danger rounded hover:bg-danger/90 transition-colors"
                      onClick={handleDelete}
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      data-testid="ctx-delete-cancel"
                      className="flex-1 px-2 py-1.5 text-xs font-medium text-text-secondary bg-bg-muted rounded hover:bg-bg-hover transition-colors"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>,
    document.body,
  );
}
