import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useTechJobDetail,
  useStartJob,
  useCompleteJob,
  useUploadJobPhoto,
  useJobPhotos,
  useJobPayments,
  useRecordPayment,
} from "@/api/hooks/useTechPortal.ts";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from "@/api/types/techPortal.ts";
import { useInitiateCall } from "@/features/phone/api.ts";
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

const STATUS_BADGE_VARIANT: Record<
  string,
  "info" | "warning" | "success" | "danger" | "default"
> = {
  blue: "info",
  yellow: "warning",
  orange: "warning",
  green: "success",
  red: "danger",
  gray: "default",
};

const REQUIRED_PHOTO_TYPES = [
  { type: "before", label: "Before", emoji: "📷" },
  { type: "after", label: "After", emoji: "📸" },
  { type: "lid", label: "Lid", emoji: "🔲" },
  { type: "tank", label: "Tank", emoji: "🪣" },
] as const;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", emoji: "💵" },
  { value: "check", label: "Check", emoji: "📝" },
  { value: "card", label: "Card", emoji: "💳" },
  { value: "ach", label: "ACH / Bank", emoji: "🏦" },
  { value: "other", label: "Other", emoji: "📋" },
] as const;

type TabKey = "info" | "photos" | "payment" | "complete";

// ── Helpers ────────────────────────────────────────────────────────────────

function buildDirectionsUrl(
  address?: string | null,
  city?: string | null,
  state?: string | null,
): string {
  const parts = [address, city, state || "TX"].filter(Boolean).join(", ");
  return `https://maps.google.com/maps?daddr=${encodeURIComponent(parts)}`;
}

function buildMapsUrl(
  address?: string | null,
  city?: string | null,
  state?: string | null,
): string {
  const parts = [address, city, state || "TX"].filter(Boolean).join(", ");
  return `https://maps.google.com/?q=${encodeURIComponent(parts)}`;
}

function formatTimeWindow(
  start?: string | null,
  end?: string | null,
): string | null {
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
      <Skeleton className="h-10 w-24 rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
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
        <p className="text-xs text-text-muted uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-base font-medium text-text-primary ${valueClassName || ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Tab Button ─────────────────────────────────────────────────────────────

function TabButton({
  label,
  emoji,
  active,
  badge,
  badgeColor,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  badge?: string | number;
  badgeColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-sm font-medium transition-all relative ${
        active
          ? "bg-blue-600 text-white shadow-md"
          : "bg-bg-surface text-text-secondary hover:bg-bg-muted"
      }`}
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-xs">{label}</span>
      {badge != null && (
        <span
          className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1 ${
            badgeColor || "bg-red-500 text-white"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function TechJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotoType, setUploadingPhotoType] = useState<string | null>(
    null,
  );

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Data hooks
  const { data: job, isLoading, refetch } = useTechJobDetail(jobId || "");
  const { data: photos = [], refetch: refetchPhotos } = useJobPhotos(
    jobId || "",
  );
  const { data: payments = [], refetch: refetchPayments } = useJobPayments(
    jobId || "",
  );
  const startJobMutation = useStartJob();
  const completeJobMutation = useCompleteJob();
  const uploadPhotoMutation = useUploadJobPhoto();
  const recordPaymentMutation = useRecordPayment();
  const initiateCall = useInitiateCall();

  // ── Derived values ─────────────────────────────────────────────────────

  const status = job?.status || "pending";
  const canStart =
    status === "scheduled" || status === "en_route" || status === "pending";
  const canComplete = status === "in_progress";
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  // Check which required photos have been uploaded
  const uploadedPhotoTypes = new Set(photos.map((p) => p.photo_type));
  const missingPhotos = REQUIRED_PHOTO_TYPES.filter(
    (r) => !uploadedPhotoTypes.has(r.type),
  );
  const photosComplete = missingPhotos.length === 0;

  // Check payment status
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paymentRecorded = payments.length > 0;

  // Completion readiness
  const completionReady = photosComplete && paymentRecorded;

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleStartJob = useCallback(async () => {
    if (!jobId) return;
    setIsStarting(true);
    try {
      await startJobMutation.mutateAsync({ jobId });
      toastSuccess("Job started! Let's get it done!");
      refetch();
    } catch {
      toastError("Couldn't start job. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }, [jobId, startJobMutation, refetch]);

  const handleCompleteJob = useCallback(async () => {
    if (!jobId) return;
    if (!completionReady) {
      toastError(
        "Complete all required items first: photos and payment info.",
      );
      return;
    }
    setIsCompleting(true);
    try {
      await completeJobMutation.mutateAsync({ jobId });
      toastSuccess("Job completed! Great work!");
      refetch();
    } catch {
      toastError("Couldn't complete job. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  }, [jobId, completionReady, completeJobMutation, refetch]);

  const handlePhotoCapture = useCallback(
    (photoType: string) => {
      setUploadingPhotoType(photoType);
      fileInputRef.current?.click();
    },
    [],
  );

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !jobId || !uploadingPhotoType) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          await uploadPhotoMutation.mutateAsync({
            jobId,
            photo: base64,
            photoType: uploadingPhotoType,
          });
          refetchPhotos();
        } catch {
          // Error handled by mutation
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
      setUploadingPhotoType(null);
    },
    [jobId, uploadingPhotoType, uploadPhotoMutation, refetchPhotos],
  );

  const handleRecordPayment = useCallback(async () => {
    if (!jobId || !paymentMethod || !paymentAmount) {
      toastError("Select payment method and enter amount.");
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toastError("Enter a valid payment amount.");
      return;
    }
    try {
      await recordPaymentMutation.mutateAsync({
        jobId,
        payment_method: paymentMethod,
        amount,
        check_number: checkNumber || undefined,
        notes: paymentNotes || undefined,
      });
      refetchPayments();
      // Reset form
      setPaymentMethod("");
      setPaymentAmount("");
      setCheckNumber("");
      setPaymentNotes("");
    } catch {
      // Error handled by mutation
    }
  }, [
    jobId,
    paymentMethod,
    paymentAmount,
    checkNumber,
    paymentNotes,
    recordPaymentMutation,
    refetchPayments,
  ]);

  // ── Loading / Error States ─────────────────────────────────────────────

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
            <p className="text-lg font-medium text-text-secondary">
              Job not found
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

  // ── More derived values ────────────────────────────────────────────────

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
  const timeWindow = formatTimeWindow(
    job.time_window_start,
    job.time_window_end,
  );
  const fullAddress = [
    job.service_address_line1,
    job.service_city,
    job.service_state,
    job.service_postal_code,
  ]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = buildMapsUrl(
    job.service_address_line1,
    job.service_city,
    job.service_state,
  );
  const directionsUrl = buildDirectionsUrl(
    job.service_address_line1,
    job.service_city,
    job.service_state,
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 space-y-4">
      {/* Hidden file input */}
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

      {/* ── Header Card ─────────────────────────────────────────────────── */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-0">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{jobTypeEmoji}</span>
              <div>
                <h1 className="text-xl font-bold">{jobTypeLabel}</h1>
                {job.work_order_number && (
                  <p className="text-blue-200 text-sm">
                    #{job.work_order_number}
                  </p>
                )}
              </div>
            </div>
            <Badge
              variant={badgeVariant}
              size="lg"
              className="flex-shrink-0"
            >
              {statusLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-blue-100">
            <span>{priorityEmoji}</span>
            <span className="text-sm font-medium">
              Priority: {priorityLabel}
            </span>
            {amount > 0 && (
              <>
                <span className="mx-2">·</span>
                <span className="text-sm font-bold">
                  {formatCurrency(amount)}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Start Job Button (always visible at top when available) ──── */}
      {canStart && (
        <Button
          onClick={handleStartJob}
          disabled={isStarting}
          className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          {isStarting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Starting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-xl">▶️</span> START JOB
            </span>
          )}
        </Button>
      )}

      {/* ── Completed / Cancelled Banner ──────────────────────────────── */}
      {isCompleted && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4 text-center">
            <p className="text-lg font-bold text-green-700">
              Job Completed
            </p>
            {job.actual_end_time && (
              <p className="text-sm text-green-600 mt-1">
                Finished{" "}
                {new Date(job.actual_end_time).toLocaleString("en-US", {
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
      {isCancelled && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-4 text-center">
            <p className="text-lg font-bold text-red-700">Job Cancelled</p>
          </CardContent>
        </Card>
      )}

      {/* ── Tab Navigation ────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <TabButton
          label="Job Info"
          emoji="📋"
          active={activeTab === "info"}
          onClick={() => setActiveTab("info")}
        />
        <TabButton
          label="Photos"
          emoji="📸"
          active={activeTab === "photos"}
          badge={
            missingPhotos.length > 0 ? `${missingPhotos.length}` : undefined
          }
          badgeColor={
            photosComplete
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }
          onClick={() => setActiveTab("photos")}
        />
        <TabButton
          label="Payment"
          emoji="💰"
          active={activeTab === "payment"}
          badge={paymentRecorded ? "✓" : "!"}
          badgeColor={
            paymentRecorded
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }
          onClick={() => setActiveTab("payment")}
        />
        <TabButton
          label="Complete"
          emoji="✅"
          active={activeTab === "complete"}
          onClick={() => setActiveTab("complete")}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: JOB INFO
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "info" && (
        <>
          {/* Customer Info */}
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
              <div className="flex flex-wrap gap-2 mt-1">
                {job.customer_phone && (
                  <>
                    <a
                      href={`tel:${job.customer_phone}`}
                      className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-base font-medium hover:bg-green-100 transition-colors"
                    >
                      <span className="text-xl">📞</span> Call {job.customer_phone}
                    </a>
                    <button
                      onClick={() => {
                        initiateCall.mutate(
                          { phoneNumber: job.customer_phone! },
                          {
                            onSuccess: () => toastSuccess("Calling customer via RingCentral..."),
                            onError: () => toastError("RingCentral call failed. Use the direct dial button instead."),
                          },
                        );
                      }}
                      disabled={initiateCall.isPending}
                      className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-3 rounded-xl text-base font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                      <span className="text-xl">🔗</span>
                      {initiateCall.isPending ? "Connecting..." : "RC Call"}
                    </button>
                  </>
                )}
                {job.service_address_line1 && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-base font-medium hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-xl">🗺️</span> Get Directions
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Job Details */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                <span className="text-xl">📋</span> Job Details
              </h2>
              <div className="divide-y divide-border">
                <InfoRow
                  emoji="📅"
                  label="Scheduled Date"
                  value={formatDate(job.scheduled_date)}
                />
                {timeWindow && (
                  <InfoRow
                    emoji="🕐"
                    label="Time Window"
                    value={timeWindow}
                  />
                )}
                <InfoRow
                  emoji="⏱️"
                  label="Estimated Duration"
                  value={
                    job.estimated_duration_hours
                      ? `${job.estimated_duration_hours} hours`
                      : null
                  }
                />
                <InfoRow
                  emoji={jobTypeEmoji}
                  label="Job Type"
                  value={jobTypeLabel}
                />
                <InfoRow
                  emoji={priorityEmoji}
                  label="Priority"
                  value={priorityLabel}
                />
                {amount > 0 && (
                  <InfoRow
                    emoji="💰"
                    label="Estimated Value"
                    value={formatCurrency(amount)}
                    valueClassName="text-green-600"
                  />
                )}
                {job.assigned_technician && (
                  <InfoRow
                    emoji="🔧"
                    label="Assigned Technician"
                    value={job.assigned_technician}
                  />
                )}
                {job.actual_start_time && (
                  <InfoRow
                    emoji="▶️"
                    label="Started At"
                    value={new Date(job.actual_start_time).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      },
                    )}
                  />
                )}
                {job.actual_end_time && (
                  <InfoRow
                    emoji="⏹️"
                    label="Completed At"
                    value={new Date(job.actual_end_time).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      },
                    )}
                  />
                )}
                {job.total_labor_minutes != null &&
                  job.total_labor_minutes > 0 && (
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

          {/* Notes */}
          {(job.notes || job.internal_notes) && (
            <Card>
              <CardContent className="pt-5 pb-5">
                <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                  <span className="text-xl">📝</span> Notes
                </h2>
                {job.notes && (
                  <div className="mb-3">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                      Job Notes
                    </p>
                    <p className="text-base text-text-primary bg-bg-muted rounded-lg p-3 whitespace-pre-wrap">
                      {job.notes}
                    </p>
                  </div>
                )}
                {job.internal_notes && (
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                      Internal Notes
                    </p>
                    <p className="text-base text-text-secondary bg-bg-muted rounded-lg p-3 whitespace-pre-wrap">
                      {job.internal_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Checklist if present */}
          {job.checklist && Array.isArray(job.checklist) && job.checklist.length > 0 && (
            <Card>
              <CardContent className="pt-5 pb-5">
                <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                  <span className="text-xl">✔️</span> Checklist
                </h2>
                <div className="space-y-2">
                  {(job.checklist as Array<{ item?: string; label?: string; completed?: boolean }>).map(
                    (item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 py-2 px-3 bg-bg-muted rounded-lg"
                      >
                        <span className="text-lg">
                          {item.completed ? "✅" : "⬜"}
                        </span>
                        <span className="text-base">
                          {item.label || item.item || `Item ${idx + 1}`}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: PHOTOS (Required)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "photos" && (
        <>
          {/* Required Photos */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
                <span className="text-xl">📸</span> Required Photos
              </h2>
              <p className="text-sm text-text-muted mb-4">
                All 4 photos are required before completing the job.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {REQUIRED_PHOTO_TYPES.map((req) => {
                  const uploaded = photos.find(
                    (p) => p.photo_type === req.type,
                  );
                  const isUploading =
                    uploadPhotoMutation.isPending &&
                    uploadingPhotoType === req.type;

                  return (
                    <button
                      key={req.type}
                      onClick={() => handlePhotoCapture(req.type)}
                      disabled={isUploading}
                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all min-h-[140px] ${
                        uploaded
                          ? "border-green-400 bg-green-50"
                          : "border-red-300 bg-red-50 hover:border-red-400"
                      }`}
                    >
                      {uploaded ? (
                        <>
                          <img
                            src={uploaded.data_url || uploaded.thumbnail_url || ""}
                            alt={req.label}
                            className="w-full h-20 object-cover rounded-lg mb-2"
                          />
                          <span className="text-green-700 text-sm font-medium flex items-center gap-1">
                            ✅ {req.label}
                          </span>
                          <span className="text-xs text-green-600 mt-1">
                            Tap to retake
                          </span>
                        </>
                      ) : (
                        <>
                          {isUploading ? (
                            <span className="text-3xl animate-pulse">⏳</span>
                          ) : (
                            <span className="text-3xl">{req.emoji}</span>
                          )}
                          <span className="text-red-700 text-sm font-bold mt-2">
                            {req.label}
                          </span>
                          <span className="text-xs text-red-500 font-medium mt-1">
                            REQUIRED — Tap to take photo
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status summary */}
              <div
                className={`mt-4 p-3 rounded-lg text-center text-sm font-medium ${
                  photosComplete
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {photosComplete
                  ? "All required photos uploaded ✓"
                  : `${missingPhotos.length} of ${REQUIRED_PHOTO_TYPES.length} required photos still needed`}
              </div>
            </CardContent>
          </Card>

          {/* Additional Photos */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                <span className="text-xl">📷</span> Additional Photos
              </h2>
              <Button
                variant="outline"
                onClick={() => handlePhotoCapture("other")}
                disabled={uploadPhotoMutation.isPending}
                className="w-full h-12 rounded-xl"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">➕</span> Add Extra Photo
                </span>
              </Button>

              {/* Show all uploaded photos */}
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.data_url || photo.thumbnail_url || ""}
                        alt={photo.photo_type}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {photo.photo_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: PAYMENT
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "payment" && (
        <>
          {/* Payment History */}
          {payments.length > 0 && (
            <Card>
              <CardContent className="pt-5 pb-5">
                <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                  <span className="text-xl">✅</span> Payments Recorded
                </h2>
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-green-50 rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium text-green-800">
                          {formatCurrency(p.amount)} via{" "}
                          {
                            PAYMENT_METHODS.find(
                              (m) => m.value === p.payment_method,
                            )?.label || p.payment_method
                          }
                        </p>
                        {p.payment_date && (
                          <p className="text-xs text-green-600">
                            {new Date(p.payment_date).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </p>
                        )}
                        {p.description && (
                          <p className="text-xs text-green-600 mt-1">
                            {p.description}
                          </p>
                        )}
                      </div>
                      <span className="text-green-500 text-2xl">✅</span>
                    </div>
                  ))}
                  <div className="text-right font-bold text-green-700 pt-2">
                    Total: {formatCurrency(totalPaid)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Record New Payment */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
                <span className="text-xl">💰</span> Record Payment
              </h2>
              <p className="text-sm text-text-muted mb-4">
                {paymentRecorded
                  ? "Add another payment or adjust the amount."
                  : "REQUIRED — Record how payment was received."}
              </p>

              {/* Payment Method Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  How was payment received? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        paymentMethod === method.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-border bg-bg-surface text-text-secondary hover:border-blue-300"
                      }`}
                    >
                      <span className="text-2xl">{method.emoji}</span>
                      <span className="text-xs font-medium">
                        {method.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Amount Received *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-text-muted">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder={amount > 0 ? String(amount) : "0.00"}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full h-14 pl-10 pr-4 text-xl font-bold rounded-xl border border-border bg-bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
                {amount > 0 && (
                  <button
                    onClick={() => setPaymentAmount(String(amount))}
                    className="text-sm text-blue-600 mt-1 hover:underline"
                  >
                    Use estimated amount: {formatCurrency(amount)}
                  </button>
                )}
              </div>

              {/* Check Number (conditional) */}
              {paymentMethod === "check" && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-text-secondary mb-2 block">
                    Check Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter check number"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="mb-4">
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Notes (optional)
                </label>
                <textarea
                  placeholder="Any payment notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleRecordPayment}
                disabled={
                  recordPaymentMutation.isPending ||
                  !paymentMethod ||
                  !paymentAmount
                }
                className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50"
              >
                {recordPaymentMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Recording...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-xl">💰</span> Record Payment
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Payment status */}
          <div
            className={`p-3 rounded-lg text-center text-sm font-medium ${
              paymentRecorded
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {paymentRecorded
              ? `Payment recorded: ${formatCurrency(totalPaid)} ✓`
              : "No payment recorded yet — REQUIRED before completion"}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: COMPLETE
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "complete" && (
        <>
          {/* Completion Checklist */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <span className="text-xl">✅</span> Completion Checklist
              </h2>

              <div className="space-y-3">
                {/* Required Photos */}
                {REQUIRED_PHOTO_TYPES.map((req) => {
                  const done = uploadedPhotoTypes.has(req.type);
                  return (
                    <button
                      key={req.type}
                      onClick={() => {
                        if (!done) {
                          setActiveTab("photos");
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        done
                          ? "border-green-300 bg-green-50"
                          : "border-red-300 bg-red-50 hover:bg-red-100"
                      }`}
                    >
                      <span className="text-2xl">
                        {done ? "✅" : "❌"}
                      </span>
                      <div className="flex-1 text-left">
                        <p
                          className={`font-medium ${done ? "text-green-700" : "text-red-700"}`}
                        >
                          {req.emoji} {req.label} Photo
                        </p>
                        <p className="text-xs text-text-muted">
                          {done ? "Uploaded" : "Required — tap to upload"}
                        </p>
                      </div>
                      {!done && (
                        <span className="text-red-500 text-xs font-bold bg-red-100 px-2 py-1 rounded">
                          REQUIRED
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Payment */}
                <button
                  onClick={() => {
                    if (!paymentRecorded) {
                      setActiveTab("payment");
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    paymentRecorded
                      ? "border-green-300 bg-green-50"
                      : "border-red-300 bg-red-50 hover:bg-red-100"
                  }`}
                >
                  <span className="text-2xl">
                    {paymentRecorded ? "✅" : "❌"}
                  </span>
                  <div className="flex-1 text-left">
                    <p
                      className={`font-medium ${paymentRecorded ? "text-green-700" : "text-red-700"}`}
                    >
                      💰 Payment Information
                    </p>
                    <p className="text-xs text-text-muted">
                      {paymentRecorded
                        ? `${formatCurrency(totalPaid)} recorded`
                        : "Required — tap to record payment"}
                    </p>
                  </div>
                  {!paymentRecorded && (
                    <span className="text-red-500 text-xs font-bold bg-red-100 px-2 py-1 rounded">
                      REQUIRED
                    </span>
                  )}
                </button>
              </div>

              {/* Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">Completion Progress</span>
                  <span className="font-medium">
                    {REQUIRED_PHOTO_TYPES.filter((r) =>
                      uploadedPhotoTypes.has(r.type),
                    ).length +
                      (paymentRecorded ? 1 : 0)}
                    /{REQUIRED_PHOTO_TYPES.length + 1}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      completionReady ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{
                      width: `${
                        ((REQUIRED_PHOTO_TYPES.filter((r) =>
                          uploadedPhotoTypes.has(r.type),
                        ).length +
                          (paymentRecorded ? 1 : 0)) /
                          (REQUIRED_PHOTO_TYPES.length + 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complete Job Button */}
          {canComplete && (
            <Button
              onClick={handleCompleteJob}
              disabled={isCompleting || !completionReady}
              className={`w-full h-16 text-lg font-bold rounded-xl shadow-lg ${
                completionReady
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isCompleting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Completing...
                </span>
              ) : completionReady ? (
                <span className="flex items-center gap-2">
                  <span className="text-xl">✅</span> COMPLETE JOB
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-xl">🔒</span> Complete Required Items
                  First
                </span>
              )}
            </Button>
          )}

          {!canComplete && !isCompleted && !isCancelled && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
              <p className="text-yellow-700 font-medium">
                Start the job first before completing it.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Get Directions (always at bottom) ─────────────────────────── */}
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
  );
}
