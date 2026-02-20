import type { UseMutateFunction } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatCurrency, formatDate } from "@/lib/utils.ts";
import type { TechWorkOrder } from "@/api/types/techPortal.ts";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled", emoji: "📅" },
  { value: "en_route", label: "En Route", emoji: "🚛" },
  { value: "in_progress", label: "In Progress", emoji: "🔧" },
  { value: "completed", label: "Completed", emoji: "✅" },
  { value: "on_hold", label: "On Hold", emoji: "⏸️" },
  { value: "requires_followup", label: "Needs Follow-Up", emoji: "🔄" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", emoji: "🟢" },
  { value: "normal", label: "Normal", emoji: "🔵" },
  { value: "high", label: "High", emoji: "🟡" },
  { value: "urgent", label: "Urgent", emoji: "🟠" },
  { value: "emergency", label: "Emergency", emoji: "🔴" },
] as const;

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({
  emoji,
  label,
  value,
  valueClassName,
}: {
  emoji: string;
  label: string;
  value: string | number | null | undefined;
  valueClassName?: string;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="text-xl mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
        <p className={`text-base font-medium text-text-primary truncate ${valueClassName || ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface JobInfoTabProps {
  job: TechWorkOrder;
  // Derived values (computed in parent)
  fullAddress: string;
  mapsUrl: string;
  directionsUrl: string;
  timeWindow: string | null;
  jobTypeEmoji: string;
  jobTypeLabel: string;
  priorityEmoji: string;
  priorityLabel: string;
  amount: number;
  // Edit state
  isEditing: boolean;
  editStatus: string;
  editPriority: string;
  editNotes: string;
  editInternalNotes: string;
  editDuration: string;
  isSavingEdit: boolean;
  // Edit state setters
  setEditStatus: (v: string) => void;
  setEditPriority: (v: string) => void;
  setEditNotes: (v: string) => void;
  setEditInternalNotes: (v: string) => void;
  setEditDuration: (v: string) => void;
  onEnterEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  // Quick text
  showQuickText: boolean;
  quickTextMsg: string;
  sendSMSPending: boolean;
  setShowQuickText: Dispatch<SetStateAction<boolean>>;
  setQuickTextMsg: (v: string) => void;
  onSendSMS: (msg: string) => void;
  // External actions
  initiateCallPending: boolean;
  onInitiateCall: (phoneNumber: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JobInfoTab({
  job,
  fullAddress,
  mapsUrl,
  directionsUrl,
  timeWindow,
  jobTypeEmoji,
  jobTypeLabel,
  priorityEmoji,
  priorityLabel,
  amount,
  isEditing,
  editStatus,
  editPriority,
  editNotes,
  editInternalNotes,
  editDuration,
  isSavingEdit,
  setEditStatus,
  setEditPriority,
  setEditNotes,
  setEditInternalNotes,
  setEditDuration,
  onEnterEdit,
  onCancelEdit,
  onSaveEdit,
  showQuickText,
  quickTextMsg,
  sendSMSPending,
  setShowQuickText,
  setQuickTextMsg,
  onSendSMS,
  initiateCallPending,
  onInitiateCall,
}: JobInfoTabProps) {
  return (
    <>
      {/* Edit Toggle */}
      <div className="flex justify-end">
        {!isEditing ? (
          <button
            onClick={onEnterEdit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-light text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            <span>✏️</span> Edit Job Details
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              disabled={isSavingEdit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Customer Quick Contact */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-xl">👤</span> Customer
          </h2>
          <p className="text-lg font-semibold text-text-primary mb-2">
            {job.customer_name || "Unknown Customer"}
          </p>
          {fullAddress && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:text-primary/80 mb-3"
            >
              <span className="text-xl">📍</span>
              <span className="text-base underline">{fullAddress}</span>
            </a>
          )}
          {job.customer_phone && (
            <>
              <div className="flex flex-wrap gap-2 mt-1">
                <a
                  href={`tel:${job.customer_phone}`}
                  className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-base font-medium hover:bg-green-100 transition-colors"
                >
                  <span className="text-xl">📞</span> Call
                </a>
                <a
                  href={`sms:${job.customer_phone}`}
                  className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-3 rounded-xl text-base font-medium hover:bg-teal-100 transition-colors"
                >
                  <span className="text-xl">💬</span> Text
                </a>
                <button
                  onClick={() => onInitiateCall(job.customer_phone!)}
                  disabled={initiateCallPending}
                  className="inline-flex items-center gap-2 bg-mac-navy/10 text-mac-navy px-4 py-3 rounded-xl text-base font-medium hover:bg-mac-navy/15 transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">🔗</span>
                  {initiateCallPending ? "Connecting..." : "RC Call"}
                </button>
              </div>

              {/* Quick Text Compose */}
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => setShowQuickText((v) => !v)}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    showQuickText
                      ? "bg-mac-navy/20 text-mac-navy"
                      : "bg-mac-navy/10 text-mac-navy hover:bg-mac-navy/15"
                  }`}
                >
                  <span className="text-xl">📲</span> RC Text
                </button>
              </div>

              {showQuickText && (
                <div className="mt-3 p-4 bg-mac-navy/5 rounded-xl border border-mac-navy/20">
                  <p className="text-sm font-medium text-mac-navy mb-2">
                    Send SMS to {job.customer_phone} via RingCentral
                  </p>
                  <textarea
                    value={quickTextMsg}
                    onChange={(e) => setQuickTextMsg(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-mac-navy/30 bg-white text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-mac-navy/70">
                      {quickTextMsg.length}/160 chars
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowQuickText(false); setQuickTextMsg(""); }}
                        className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onSendSMS(quickTextMsg)}
                        disabled={sendSMSPending || !quickTextMsg.trim()}
                        className="px-5 py-2 bg-mac-navy text-white text-sm font-bold rounded-lg hover:bg-mac-navy/90 disabled:opacity-50 transition-colors"
                      >
                        {sendSMSPending ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Directions button */}
          {job.service_address_line1 && (
            <div className="flex flex-wrap gap-2 mt-2">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-3 rounded-xl text-base font-medium hover:bg-primary/15 transition-colors"
              >
                <span className="text-xl">🗺️</span> Get Directions
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status & Priority (Editable) */}
      {isEditing ? (
        <Card>
          <CardContent className="pt-5 pb-5 space-y-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <span className="text-xl">🔄</span> Status & Priority
            </h2>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditStatus(opt.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      editStatus === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-bg-surface text-text-secondary hover:border-primary/40"
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditPriority(opt.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      editPriority === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-bg-surface text-text-secondary hover:border-primary/40"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Estimated Duration (hours)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder="e.g. 2.5"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Job Details (Read-Only) */
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span className="text-xl">📋</span> Job Details
            </h2>
            <div className="divide-y divide-border">
              <InfoRow emoji="📅" label="Scheduled Date" value={formatDate(job.scheduled_date)} />
              {timeWindow && <InfoRow emoji="🕐" label="Time Window" value={timeWindow} />}
              <InfoRow
                emoji="⏱️"
                label="Estimated Duration"
                value={job.estimated_duration_hours ? `${job.estimated_duration_hours} hours` : null}
              />
              <InfoRow emoji={jobTypeEmoji} label="Job Type" value={jobTypeLabel} />
              <InfoRow emoji={priorityEmoji} label="Priority" value={priorityLabel} />
              {amount > 0 && (
                <InfoRow emoji="💰" label="Estimated Value" value={formatCurrency(amount)} valueClassName="text-green-600" />
              )}
              {job.assigned_technician && (
                <InfoRow emoji="🔧" label="Assigned Technician" value={job.assigned_technician} />
              )}
              {job.actual_start_time && (
                <InfoRow
                  emoji="▶️"
                  label="Started At"
                  value={new Date(job.actual_start_time).toLocaleString("en-US", {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
                  })}
                />
              )}
              {job.actual_end_time && (
                <InfoRow
                  emoji="⏹️"
                  label="Completed At"
                  value={new Date(job.actual_end_time).toLocaleString("en-US", {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
                  })}
                />
              )}
              {job.total_labor_minutes != null && job.total_labor_minutes > 0 && (
                <InfoRow
                  emoji="⏳"
                  label="Total Labor"
                  value={
                    job.total_labor_minutes >= 60
                      ? `${Math.floor(job.total_labor_minutes / 60)}h ${job.total_labor_minutes % 60}m`
                      : `${job.total_labor_minutes}m`
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-xl">📝</span> Notes
          </h2>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">Job Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this job..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Internal Notes (not visible to customer)
                </label>
                <textarea
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  placeholder="Internal team notes..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>
            </div>
          ) : (
            <>
              {job.notes ? (
                <div className="mb-3">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Job Notes</p>
                  <p className="text-base text-text-primary bg-bg-muted rounded-lg p-3 whitespace-pre-wrap">{job.notes}</p>
                </div>
              ) : (
                <p className="text-sm text-text-muted italic mb-3">
                  No job notes yet. Tap "Edit Job Details" to add notes.
                </p>
              )}
              {job.internal_notes && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Internal Notes</p>
                  <p className="text-base text-text-secondary bg-bg-muted rounded-lg p-3 whitespace-pre-wrap">
                    {job.internal_notes}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button (sticky at bottom when editing) */}
      {isEditing && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancelEdit} className="flex-1 h-14 rounded-xl text-base">
            Cancel
          </Button>
          <Button
            onClick={onSaveEdit}
            disabled={isSavingEdit}
            className="flex-1 h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-bold shadow-lg disabled:opacity-50"
          >
            {isSavingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      {/* Checklist if present */}
      {!isEditing && job.checklist && Array.isArray(job.checklist) && job.checklist.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span className="text-xl">✔️</span> Checklist
            </h2>
            <div className="space-y-2">
              {(job.checklist as Array<{ item?: string; label?: string; completed?: boolean }>).map(
                (item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 px-3 bg-bg-muted rounded-lg">
                    <span className="text-lg">{item.completed ? "✅" : "⬜"}</span>
                    <span className="text-base">{item.label || item.item || `Item ${idx + 1}`}</span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
