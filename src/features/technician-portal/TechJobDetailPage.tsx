import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTechJobDetail, useStartJob, useCompleteJob, useUploadJobPhoto } from "@/api/hooks/useTechPortal.ts";
import { STATUS_LABELS, STATUS_COLORS, JOB_TYPE_LABELS, PRIORITY_LABELS } from "@/api/types/techPortal.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { formatCurrency, formatDate } from "@/lib/utils.ts";

// ── Constants ──────────────────────────────────────────────────────────────

const JOB_TYPE_EMOJIS: Record<string, string> = {
  pumping: "🚛",
  inspection: "🔍",
  repair: "🔩",
  installation: "🏗️",
  maintenance: "🛠️",
  emergency: "🚨",
  grease_trap: "🪣",
  other: "📦",
};

const PRIORITY_EMOJIS: Record<string, string> = {
  low: "🟢",
  normal: "🔵",
  high: "🟡",
  urgent: "🟠",
  emergency: "🔴",
};

const STATUS_BADGE_VARIANT: Record<string, "info" | "warning" | "success" | "danger" | "default"> = {
  blue: "info",
  yellow: "warning",
  orange: "warning",
  green: "success",
  red: "danger",
  gray: "default",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function buildMapsUrl(address?: string | null, city?: string | null, state?: string | null): string {
  const parts = [address, city, state || "TX"].filter(Boolean).join(", ");
  return `https://maps.google.com/?q=${encodeURIComponent(parts)}`;
}

function buildDirectionsUrl(address?: string | null, city?: string | null, state?: string | null): string {
  const parts = [address, city, state || "TX"].filter(Boolean).join(", ");
  return `https://maps.google.com/maps?daddr=${encodeURIComponent(parts)}`;
}

function formatTimeWindow(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  return `Ends ${fmt(end!)}`;
}

function parseAmount(value: number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// ── Loading Skeleton ───────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Back button */}
      <Skeleton className="h-10 w-24 rounded-xl" />
      {/* Header card */}
      <Skeleton className="h-32 w-full rounded-xl" />
      {/* Customer info */}
      <Skeleton className="h-40 w-full rounded-xl" />
      {/* Job details */}
      <Skeleton className="h-56 w-full rounded-xl" />
      {/* Action buttons */}
      <Skeleton className="h-14 w-full rounded-xl" />
      {/* Notes */}
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

// ── Info Row Component ─────────────────────────────────────────────────────

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
    <div className="flex items-start gap-3 py-2">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
        <p className={`text-base font-medium text-text-primary ${valueClassName || ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function TechJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const { data: job, isLoading, refetch } = useTechJobDetail(jobId || "");
  const startJobMutation = useStartJob();
  const completeJobMutation = useCompleteJob();
  const uploadPhotoMutation = useUploadJobPhoto();

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStartJob = useCallback(async () => {
    if (!jobId) return;
    setIsStarting(true);
    try {
      await startJobMutation.mutateAsync({ jobId });
      toastSuccess("Job started! Let's get it done! 💪");
      refetch();
    } catch {
      toastError("Couldn't start job. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }, [jobId, startJobMutation, refetch]);

  const handleCompleteJob = useCallback(async () => {
    if (!jobId) return;
    setIsCompleting(true);
    try {
      await completeJobMutation.mutateAsync({ jobId });
      toastSuccess("Job completed! Great work! 🎉");
      refetch();
    } catch {
      toastError("Couldn't complete job. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  }, [jobId, completeJobMutation, refetch]);

  const handlePhotoUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !jobId) return;

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          await uploadPhotoMutation.mutateAsync({ jobId, photo: base64 });
        } catch {
          // Error toast handled by mutation hook
        }
      };
      reader.readAsDataURL(file);

      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [jobId, uploadPhotoMutation],
  );

  // ── Loading / Error States ───────────────────────────────────────────────

  if (isLoading) return <DetailSkeleton />;

  if (!job) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 text-base"
        >
          ← Back
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-lg font-medium text-text-secondary">Job not found</p>
            <p className="text-sm text-text-muted mt-2">
              This job may have been removed or you don't have access.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/portal/jobs")}
              className="mt-6 h-12 px-8 rounded-xl"
            >
              ← Back to My Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Derived Values ───────────────────────────────────────────────────────

  const status = job.status || "pending";
  const colorKey = STATUS_COLORS[status] || "gray";
  const badgeVariant = STATUS_BADGE_VARIANT[colorKey] || "default";
  const statusLabel = STATUS_LABELS[status] || status;
  const jobType = job.job_type || "other";
  const jobTypeEmoji = JOB_TYPE_EMOJIS[jobType] || "📦";
  const jobTypeLabel = JOB_TYPE_LABELS[jobType] || jobType;
  const priority = job.priority || "normal";
  const priorityEmoji = PRIORITY_EMOJIS[priority] || "🔵";
  const priorityLabel = PRIORITY_LABELS[priority] || priority;
  const amount = parseAmount(job.total_amount);
  const timeWindow = formatTimeWindow(job.time_window_start, job.time_window_end);
  const fullAddress = [
    job.service_address_line1,
    job.service_city,
    job.service_state,
    job.service_postal_code,
  ]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = buildMapsUrl(job.service_address_line1, job.service_city, job.service_state);
  const directionsUrl = buildDirectionsUrl(job.service_address_line1, job.service_city, job.service_state);

  const canStart = status === "scheduled" || status === "en_route" || status === "pending";
  const canComplete = status === "in_progress";
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 space-y-4">
      {/* Hidden file input for photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="text-base -ml-2"
      >
        ← Back
      </Button>

      {/* ── Header Card ─────────────────────────────────────────────────────── */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-0">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{jobTypeEmoji}</span>
              <div>
                <h1 className="text-xl font-bold">{jobTypeLabel}</h1>
                {job.work_order_number && (
                  <p className="text-blue-200 text-sm">#{job.work_order_number}</p>
                )}
              </div>
            </div>
            <Badge variant={badgeVariant} size="lg" className="flex-shrink-0">
              {statusLabel}
            </Badge>
          </div>

          {/* Priority indicator */}
          <div className="flex items-center gap-2 text-blue-100">
            <span>{priorityEmoji}</span>
            <span className="text-sm font-medium">Priority: {priorityLabel}</span>
            {amount > 0 && (
              <>
                <span className="mx-2">·</span>
                <span className="text-sm font-bold">💰 {formatCurrency(amount)}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Customer Info Card ──────────────────────────────────────────────── */}
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

          {/* Directions Button */}
          {job.service_address_line1 && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-base font-medium hover:bg-blue-100 transition-colors"
            >
              <span className="text-xl">🗺️</span>
              Get Directions
            </a>
          )}
        </CardContent>
      </Card>

      {/* ── Job Details Card ────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-xl">📋</span> Job Details
          </h2>

          <div className="divide-y divide-border">
            <InfoRow emoji="📅" label="Scheduled Date" value={formatDate(job.scheduled_date)} />
            {timeWindow && (
              <InfoRow emoji="🕐" label="Time Window" value={timeWindow} />
            )}
            <InfoRow
              emoji="⏱️"
              label="Estimated Duration"
              value={job.estimated_duration_hours ? `${job.estimated_duration_hours} hours` : null}
            />
            <InfoRow emoji={jobTypeEmoji} label="Job Type" value={jobTypeLabel} />
            <InfoRow emoji={priorityEmoji} label="Priority" value={priorityLabel} />
            {amount > 0 && (
              <InfoRow
                emoji="💰"
                label="Estimated Value"
                value={formatCurrency(amount)}
                valueClassName="text-green-600"
              />
            )}
            {job.actual_start_time && (
              <InfoRow
                emoji="▶️"
                label="Started At"
                value={new Date(job.actual_start_time).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              />
            )}
            {job.actual_end_time && (
              <InfoRow
                emoji="⏹️"
                label="Completed At"
                value={new Date(job.actual_end_time).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
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

      {/* ── Notes Card ──────────────────────────────────────────────────────── */}
      {(job.notes || job.internal_notes) && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span className="text-xl">📝</span> Notes
            </h2>

            {job.notes && (
              <div className="mb-3">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Job Notes</p>
                <p className="text-base text-text-primary bg-bg-muted rounded-lg p-3 whitespace-pre-wrap">
                  {job.notes}
                </p>
              </div>
            )}

            {job.internal_notes && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Internal Notes</p>
                <p className="text-base text-text-secondary bg-bg-muted rounded-lg p-3 whitespace-pre-wrap">
                  {job.internal_notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Action Buttons ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Start Job */}
        {canStart && (
          <Button
            onClick={handleStartJob}
            disabled={isStarting}
            className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🔄</span> Starting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">▶️</span> START JOB
              </span>
            )}
          </Button>
        )}

        {/* Complete Job */}
        {canComplete && (
          <Button
            onClick={handleCompleteJob}
            disabled={isCompleting}
            className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg"
          >
            {isCompleting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🔄</span> Completing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">✅</span> COMPLETE JOB
              </span>
            )}
          </Button>
        )}

        {/* Completed state */}
        {isCompleted && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-lg font-bold text-green-700">Job Completed!</p>
              {job.actual_end_time && (
                <p className="text-sm text-green-600 mt-1">
                  Finished {new Date(job.actual_end_time).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancelled state */}
        {isCancelled && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="py-4 text-center">
              <p className="text-2xl mb-1">❌</p>
              <p className="text-lg font-bold text-red-700">Job Cancelled</p>
            </CardContent>
          </Card>
        )}

        {/* Photo Upload Button — always available unless cancelled */}
        {!isCancelled && (
          <Button
            variant="outline"
            onClick={handlePhotoUpload}
            disabled={uploadPhotoMutation.isPending}
            className="w-full h-14 text-lg font-bold rounded-xl"
          >
            {uploadPhotoMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🔄</span> Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">📸</span> Upload Photo
              </span>
            )}
          </Button>
        )}

        {/* Get Directions — big touch-friendly button */}
        {job.service_address_line1 && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-14 text-lg font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
          >
            <span className="text-xl">🗺️</span> Get Directions
          </a>
        )}
      </div>
    </div>
  );
}
