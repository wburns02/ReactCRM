/**
 * MobileWorkOrderView - Mobile-optimized work order detail view
 *
 * Features:
 * - Card-based layout optimized for mobile
 * - Large touch targets (44px min)
 * - Collapsible sections
 * - Bottom action bar
 * - Swipe gestures support
 * - Works at 375px width minimum
 */

import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatDate, formatPhone } from "@/lib/utils";
import type { WorkOrder, WorkOrderStatus } from "@/api/types/workOrder";
import {
  WORK_ORDER_STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  JOB_TYPE_LABELS,
} from "@/api/types/workOrder";

// ============================================
// Types
// ============================================

interface MobileWorkOrderViewProps {
  workOrder: WorkOrder;
  onStatusChange?: (status: WorkOrderStatus) => void;
  onAddNote?: () => void;
  onCall?: (phone: string) => void;
  onNavigate?: (address: string) => void;
  onBack?: () => void;
  isOffline?: boolean;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

// ============================================
// Collapsible Section Component
// ============================================

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="mb-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 min-h-[48px] touch-manipulation"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <span className="text-text-secondary">{icon}</span>
          <span className="font-medium text-text-primary">{title}</span>
        </div>
        <svg
          className={cn(
            "w-5 h-5 text-text-secondary transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <CardContent className="pt-0 pb-4 px-4 border-t border-border">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================
// Icons
// ============================================

const Icons = {
  back: (
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  ),
  customer: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  location: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  schedule: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  notes: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  phone: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  ),
  navigate: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  ),
  status: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

// ============================================
// Main Component
// ============================================

export function MobileWorkOrderView({
  workOrder,
  onStatusChange,
  onAddNote,
  onCall,
  onNavigate,
  onBack,
  isOffline = false,
}: MobileWorkOrderViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance for gesture detection
  const minSwipeDistance = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    // const _isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && onBack) {
      // Swipe right to go back
      onBack();
    }
    // Could add left swipe action if needed
  }, [touchStart, touchEnd, onBack]);

  // Build full address
  const fullAddress = [
    workOrder.service_address_line1,
    workOrder.service_address_line2,
    workOrder.service_city,
    workOrder.service_state,
    workOrder.service_postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  // Format time window
  const timeWindow =
    workOrder.time_window_start && workOrder.time_window_end
      ? `${workOrder.time_window_start} - ${workOrder.time_window_end}`
      : workOrder.time_window_start || workOrder.time_window_end || "Any time";

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-bg-page pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Go back"
          >
            {Icons.back}
          </button>
          <div className="flex items-center gap-2">
            {isOffline && (
              <Badge variant="warning" size="sm">
                Offline
              </Badge>
            )}
            <Badge
              variant="default"
              style={{
                backgroundColor: `${STATUS_COLORS[workOrder.status]}20`,
                color: STATUS_COLORS[workOrder.status],
              }}
            >
              {WORK_ORDER_STATUS_LABELS[workOrder.status]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Work Order ID and Type */}
      <div className="p-4 bg-bg-card border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-text-primary">
            {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
          </h1>
          <Badge
            variant="default"
            style={{
              backgroundColor: `${PRIORITY_COLORS[workOrder.priority]}20`,
              color: PRIORITY_COLORS[workOrder.priority],
            }}
          >
            {PRIORITY_LABELS[workOrder.priority]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="font-medium">
            {JOB_TYPE_LABELS[workOrder.job_type]}
          </span>
          {workOrder.estimated_duration_hours && (
            <>
              <span>-</span>
              <span>{workOrder.estimated_duration_hours}h estimated</span>
            </>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="p-4">
        {/* Customer Section */}
        <CollapsibleSection title="Customer" icon={Icons.customer} defaultOpen>
          <div className="space-y-3 pt-3">
            <div>
              <p className="text-sm text-text-secondary">Name</p>
              <p className="font-medium text-text-primary">
                {workOrder.customer_name ||
                  (workOrder.customer
                    ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
                    : "N/A")}
              </p>
            </div>
            {workOrder.customer?.phone && (
              <button
                onClick={() => onCall?.(workOrder.customer!.phone!)}
                className="flex items-center gap-3 w-full p-3 bg-bg-muted rounded-lg min-h-[48px] touch-manipulation"
              >
                <span className="text-primary">{Icons.phone}</span>
                <span className="font-medium text-primary">
                  {formatPhone(workOrder.customer.phone)}
                </span>
              </button>
            )}
          </div>
        </CollapsibleSection>

        {/* Location Section */}
        <CollapsibleSection
          title="Service Location"
          icon={Icons.location}
          defaultOpen
        >
          <div className="space-y-3 pt-3">
            <div>
              <p className="text-sm text-text-secondary">Address</p>
              <p className="font-medium text-text-primary">
                {fullAddress || "No address provided"}
              </p>
            </div>
            {fullAddress && (
              <button
                onClick={() => onNavigate?.(fullAddress)}
                className="flex items-center justify-center gap-2 w-full p-3 bg-primary text-white rounded-lg min-h-[48px] touch-manipulation font-medium"
              >
                {Icons.navigate}
                <span>Navigate</span>
              </button>
            )}
          </div>
        </CollapsibleSection>

        {/* Schedule Section */}
        <CollapsibleSection title="Schedule" icon={Icons.schedule}>
          <div className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Date</p>
                <p className="font-medium text-text-primary">
                  {formatDate(workOrder.scheduled_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Time Window</p>
                <p className="font-medium text-text-primary">{timeWindow}</p>
              </div>
            </div>
            {workOrder.assigned_technician && (
              <div>
                <p className="text-sm text-text-secondary">Technician</p>
                <p className="font-medium text-text-primary">
                  {workOrder.assigned_technician}
                </p>
              </div>
            )}
            {workOrder.assigned_vehicle && (
              <div>
                <p className="text-sm text-text-secondary">Vehicle</p>
                <p className="font-medium text-text-primary">
                  {workOrder.assigned_vehicle}
                </p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Notes Section */}
        <CollapsibleSection title="Notes" icon={Icons.notes}>
          <div className="pt-3">
            {workOrder.notes ? (
              <p className="text-text-primary whitespace-pre-wrap">
                {workOrder.notes}
              </p>
            ) : (
              <p className="text-text-secondary italic">No notes yet</p>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onAddNote}
              className="mt-3 min-h-[44px] touch-manipulation"
            >
              Add Note
            </Button>
          </div>
        </CollapsibleSection>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border p-4 safe-area-inset-bottom">
        <div className="flex gap-3">
          {/* Quick Call Button */}
          {workOrder.customer?.phone && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onCall?.(workOrder.customer!.phone!)}
              className="min-h-[48px] min-w-[48px] touch-manipulation"
              aria-label="Call customer"
            >
              {Icons.phone}
            </Button>
          )}

          {/* Primary Action - Status Change */}
          <Button
            variant="primary"
            size="lg"
            onClick={() => onStatusChange?.(getNextStatus(workOrder.status))}
            className="flex-1 min-h-[48px] touch-manipulation"
          >
            <span>{Icons.status}</span>
            <span>{getNextStatusLabel(workOrder.status)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

const STATUS_FLOW: WorkOrderStatus[] = [
  "draft",
  "scheduled",
  "confirmed",
  "enroute",
  "on_site",
  "in_progress",
  "completed",
];

function getNextStatus(currentStatus: WorkOrderStatus): WorkOrderStatus {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) {
    return currentStatus;
  }
  return STATUS_FLOW[currentIndex + 1];
}

function getNextStatusLabel(currentStatus: WorkOrderStatus): string {
  const nextStatus = getNextStatus(currentStatus);
  const labels: Record<WorkOrderStatus, string> = {
    draft: "Schedule",
    scheduled: "Confirm",
    confirmed: "Start Route",
    enroute: "Arrive",
    on_site: "Start Work",
    in_progress: "Complete",
    completed: "Completed",
    canceled: "Canceled",
    requires_followup: "Follow Up",
  };
  return labels[nextStatus] || WORK_ORDER_STATUS_LABELS[nextStatus];
}

export default MobileWorkOrderView;
