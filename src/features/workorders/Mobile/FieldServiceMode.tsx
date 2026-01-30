/**
 * FieldServiceMode - Full-screen field technician work order view
 *
 * Features:
 * - Full-screen work order view
 * - Status progression buttons
 * - Photo capture integration
 * - Signature capture
 * - Notes input
 * - Complete job button
 * - Works at 375px width minimum
 * - Large touch targets (44px min)
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatDate, formatPhone } from "@/lib/utils";
import type { WorkOrder, WorkOrderStatus } from "@/api/types/workOrder";
import {
  // WORK_ORDER_STATUS_LABELS,
  // STATUS_COLORS,
  PRIORITY_LABELS,
  JOB_TYPE_LABELS,
} from "@/api/types/workOrder";
import { PhotoQueue } from "../components/PhotoQueue";
import { OfflineSignature } from "../components/OfflineSignature";
import { StatusUpdateWidget } from "./StatusUpdateWidget";
import { OfflineIndicator } from "./OfflineIndicator";

// ============================================
// Types
// ============================================

interface FieldServiceModeProps {
  workOrder: WorkOrder;
  onStatusChange: (status: WorkOrderStatus, notes?: string) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
  onPhotoCapture?: (photoUrl: string) => void;
  onSignatureCapture?: (signatureData: string) => void;
  onComplete: () => Promise<void>;
  onExit?: () => void;
  isOffline?: boolean;
  pendingSyncCount?: number;
  lastSyncTime?: Date;
  onSyncNow?: () => Promise<void>;
}

type FieldServiceTab = "overview" | "photos" | "signature" | "notes";

// ============================================
// Tab Button Component
// ============================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 px-3 min-h-[56px] min-w-[64px] rounded-lg touch-manipulation transition-colors",
        active
          ? "bg-primary text-white"
          : "bg-bg-muted text-text-secondary hover:bg-bg-hover",
      )}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 bg-danger text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// ============================================
// Icons
// ============================================

const Icons = {
  overview: (
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
  photos: (
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
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  signature: (
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
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
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
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  exit: (
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
  check: (
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
        d="M5 13l4 4L19 7"
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
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
    </svg>
  ),
};

// ============================================
// Main Component
// ============================================

export function FieldServiceMode({
  workOrder,
  onStatusChange,
  onAddNote,
  onPhotoCapture,
  onSignatureCapture,
  onComplete,
  onExit,
  isOffline = false,
  pendingSyncCount = 0,
  lastSyncTime,
  onSyncNow,
}: FieldServiceModeProps) {
  const [activeTab, setActiveTab] = useState<FieldServiceTab>("overview");
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Build full address
  const fullAddress = [
    workOrder.service_address_line1,
    workOrder.service_city,
    workOrder.service_state,
    workOrder.service_postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  // Handle note submission
  const handleAddNote = useCallback(async () => {
    if (!noteText.trim()) return;

    setIsAddingNote(true);
    try {
      await onAddNote(noteText.trim());
      setNoteText("");
    } finally {
      setIsAddingNote(false);
    }
  }, [noteText, onAddNote]);

  // Handle job completion
  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  }, [onComplete]);

  // Open phone dialer
  const handleCall = useCallback((phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, "")}`;
  }, []);

  // Open maps for navigation
  const handleNavigate = useCallback((address: string) => {
    const encodedAddress = encodeURIComponent(address);
    // Try to use native maps on mobile
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.location.href = `maps://?daddr=${encodedAddress}`;
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
        "_blank",
      );
    }
  }, []);

  // Check if job can be completed
  const canComplete = workOrder.status === "in_progress";

  return (
    <div className="fixed inset-0 bg-bg-page z-50 flex flex-col">
      {/* Header */}
      <div className="bg-bg-card border-b border-border px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Exit field service mode"
          >
            {Icons.exit}
          </button>
          <div className="flex-1 text-center">
            <h1 className="font-bold text-text-primary">
              {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm text-text-secondary">
              {JOB_TYPE_LABELS[workOrder.job_type]}
            </p>
          </div>
          <OfflineIndicator
            isOffline={isOffline}
            pendingChanges={pendingSyncCount}
            lastSyncTime={lastSyncTime}
            onSyncNow={onSyncNow}
            compact
          />
        </div>
      </div>

      {/* Status Update Widget */}
      <div className="px-4 py-3 bg-bg-card border-b border-border">
        <StatusUpdateWidget
          currentStatus={workOrder.status}
          onStatusChange={onStatusChange}
          disabled={isOffline && pendingSyncCount > 5}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 px-4 py-3 bg-bg-muted border-b border-border overflow-x-auto">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon={Icons.overview}
          label="Overview"
        />
        <TabButton
          active={activeTab === "photos"}
          onClick={() => setActiveTab("photos")}
          icon={Icons.photos}
          label="Photos"
        />
        <TabButton
          active={activeTab === "signature"}
          onClick={() => setActiveTab("signature")}
          icon={Icons.signature}
          label="Signature"
        />
        <TabButton
          active={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
          icon={Icons.notes}
          label="Notes"
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium text-text-primary">
                  {workOrder.customer_name ||
                    (workOrder.customer
                      ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
                      : "N/A")}
                </p>
                {workOrder.customer?.phone && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => handleCall(workOrder.customer!.phone!)}
                    className="w-full min-h-[48px] touch-manipulation"
                  >
                    {Icons.phone}
                    <span>{formatPhone(workOrder.customer.phone)}</span>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Service Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-text-primary">
                  {fullAddress || "No address"}
                </p>
                {fullAddress && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleNavigate(fullAddress)}
                    className="w-full min-h-[48px] touch-manipulation"
                  >
                    {Icons.navigate}
                    <span>Navigate</span>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Schedule Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Date</p>
                    <p className="font-medium">
                      {formatDate(workOrder.scheduled_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Priority</p>
                    <Badge variant="default" className="mt-1">
                      {PRIORITY_LABELS[workOrder.priority]}
                    </Badge>
                  </div>
                  {workOrder.time_window_start && (
                    <div>
                      <p className="text-sm text-text-secondary">Time Window</p>
                      <p className="font-medium">
                        {workOrder.time_window_start}
                        {workOrder.time_window_end &&
                          ` - ${workOrder.time_window_end}`}
                      </p>
                    </div>
                  )}
                  {workOrder.estimated_duration_hours && (
                    <div>
                      <p className="text-sm text-text-secondary">
                        Est. Duration
                      </p>
                      <p className="font-medium">
                        {workOrder.estimated_duration_hours}h
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "photos" && (
          <PhotoQueue
            workOrderId={workOrder.id}
            onPhotoUploaded={onPhotoCapture}
            maxPhotos={20}
          />
        )}

        {activeTab === "signature" && (
          <div className="space-y-4">
            <OfflineSignature
              workOrderId={workOrder.id}
              signerType="customer"
              label="Customer Signature"
              onSignatureCapture={onSignatureCapture}
            />
            <OfflineSignature
              workOrderId={workOrder.id}
              signerType="technician"
              label="Technician Signature"
            />
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
            {/* Add Note */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Add Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter job notes..."
                  className="w-full px-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[120px] text-base"
                  rows={4}
                />
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || isAddingNote}
                  className="w-full min-h-[48px] touch-manipulation"
                >
                  {isAddingNote ? "Adding..." : "Add Note"}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Notes */}
            {workOrder.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Existing Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-text-primary">
                    {workOrder.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action - Complete Job */}
      <div className="bg-bg-card border-t border-border p-4 safe-area-inset-bottom">
        <Button
          variant={canComplete ? "primary" : "secondary"}
          size="lg"
          onClick={handleComplete}
          disabled={!canComplete || isCompleting}
          className={cn(
            "w-full min-h-[56px] touch-manipulation text-lg font-semibold",
            canComplete && "bg-success hover:bg-success/90",
          )}
        >
          {Icons.check}
          <span>{isCompleting ? "Completing..." : "Complete Job"}</span>
        </Button>
        {!canComplete && (
          <p className="text-center text-sm text-text-secondary mt-2">
            Status must be "In Progress" to complete
          </p>
        )}
      </div>
    </div>
  );
}

export default FieldServiceMode;
