import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  useTechJobDetail,
  useStartJob,
  useCompleteJob,
  useUploadJobPhoto,
  useJobPhotos,
  useJobPayments,
  useRecordPayment,
} from "@/api/hooks/useTechPortal.ts";
import { useUpdateWorkOrder } from "@/api/hooks/useWorkOrders.ts";
import { useCustomer, useUpdateCustomer } from "@/api/hooks/useCustomers.ts";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from "@/api/types/techPortal.ts";
import { useInitiateCall } from "@/features/phone/api.ts";
import { apiClient } from "@/api/client.ts";
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

type TabKey = "info" | "customer" | "photos" | "payment" | "complete";

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

  // Quick text state
  const [showQuickText, setShowQuickText] = useState(false);
  const [quickTextMsg, setQuickTextMsg] = useState("");

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Customer edit state
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustPhone, setEditCustPhone] = useState("");
  const [editCustEmail, setEditCustEmail] = useState("");
  const [editCustAddress, setEditCustAddress] = useState("");
  const [editCustCity, setEditCustCity] = useState("");
  const [editCustState, setEditCustState] = useState("");
  const [editCustPostal, setEditCustPostal] = useState("");
  const [editCustNotes, setEditCustNotes] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

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
  const updateWorkOrderMutation = useUpdateWorkOrder();
  const updateCustomerMutation = useUpdateCustomer();
  const initiateCall = useInitiateCall();
  const sendSMS = useMutation({
    mutationFn: async (input: { to: string; body: string; customer_id?: string }) => {
      const { data } = await apiClient.post("/communications/sms/send", input);
      return data;
    },
  });

  // Fetch full customer profile when we have a customer_id
  const customerId = job?.customer_id || undefined;
  const { data: customer, isLoading: isLoadingCustomer, refetch: refetchCustomer } = useCustomer(customerId);

  // Initialize edit fields when job data loads
  useEffect(() => {
    if (job && !isEditing) {
      setEditStatus(job.status || "");
      setEditPriority(job.priority || "normal");
      setEditNotes(job.notes || "");
      setEditInternalNotes(job.internal_notes || "");
      setEditDuration(job.estimated_duration_hours ? String(job.estimated_duration_hours) : "");
    }
  }, [job, isEditing]);

  // Initialize customer edit fields when customer data loads
  useEffect(() => {
    if (customer && !isEditingCustomer) {
      setEditCustPhone(customer.phone || "");
      setEditCustEmail(customer.email || "");
      setEditCustAddress(customer.address_line1 || "");
      setEditCustCity(customer.city || "");
      setEditCustState(customer.state || "");
      setEditCustPostal(customer.postal_code || "");
      setEditCustNotes(customer.lead_notes || "");
    }
  }, [customer, isEditingCustomer]);

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

  // ── Edit Mode Handlers ───────────────────────────────────────────────

  const handleEnterEdit = useCallback(() => {
    if (!job) return;
    setEditStatus(job.status || "");
    setEditPriority(job.priority || "normal");
    setEditNotes(job.notes || "");
    setEditInternalNotes(job.internal_notes || "");
    setEditDuration(job.estimated_duration_hours ? String(job.estimated_duration_hours) : "");
    setIsEditing(true);
  }, [job]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!jobId) return;

    // Confirmation for completing via status change
    if (editStatus === "completed" && job?.status !== "completed") {
      setShowCompleteConfirm(true);
      return;
    }

    setIsSavingEdit(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editStatus !== (job?.status || "")) updates.status = editStatus;
      if (editPriority !== (job?.priority || "normal")) updates.priority = editPriority;
      if (editNotes !== (job?.notes || "")) updates.notes = editNotes;
      if (editInternalNotes !== (job?.internal_notes || "")) updates.internal_notes = editInternalNotes;
      const dur = editDuration ? parseFloat(editDuration) : null;
      if (dur !== (job?.estimated_duration_hours ?? null)) updates.estimated_duration_hours = dur;

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      await updateWorkOrderMutation.mutateAsync({ id: jobId, data: updates as any });
      setIsEditing(false);
      refetch();
    } catch {
      // toast handled by mutation
    } finally {
      setIsSavingEdit(false);
    }
  }, [jobId, job, editStatus, editPriority, editNotes, editInternalNotes, editDuration, updateWorkOrderMutation, refetch]);

  const handleConfirmStatusComplete = useCallback(async () => {
    if (!jobId) return;
    setShowCompleteConfirm(false);
    setIsSavingEdit(true);
    try {
      const updates: Record<string, unknown> = { status: "completed" };
      if (editNotes !== (job?.notes || "")) updates.notes = editNotes;
      if (editInternalNotes !== (job?.internal_notes || "")) updates.internal_notes = editInternalNotes;
      await updateWorkOrderMutation.mutateAsync({ id: jobId, data: updates as any });
      setIsEditing(false);
      refetch();
    } catch {
      // toast handled by mutation
    } finally {
      setIsSavingEdit(false);
    }
  }, [jobId, job, editNotes, editInternalNotes, updateWorkOrderMutation, refetch]);

  // ── Customer Edit Handlers ─────────────────────────────────────────────

  const handleEnterCustomerEdit = useCallback(() => {
    if (!customer) return;
    setEditCustPhone(customer.phone || "");
    setEditCustEmail(customer.email || "");
    setEditCustAddress(customer.address_line1 || "");
    setEditCustCity(customer.city || "");
    setEditCustState(customer.state || "");
    setEditCustPostal(customer.postal_code || "");
    setEditCustNotes(customer.lead_notes || "");
    setIsEditingCustomer(true);
  }, [customer]);

  const handleCancelCustomerEdit = useCallback(() => {
    setIsEditingCustomer(false);
  }, []);

  const handleSaveCustomerEdit = useCallback(async () => {
    if (!customerId) return;
    setIsSavingCustomer(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editCustPhone !== (customer?.phone || "")) updates.phone = editCustPhone;
      if (editCustEmail !== (customer?.email || "")) updates.email = editCustEmail || undefined;
      if (editCustAddress !== (customer?.address_line1 || "")) updates.address_line1 = editCustAddress;
      if (editCustCity !== (customer?.city || "")) updates.city = editCustCity;
      if (editCustState !== (customer?.state || "")) updates.state = editCustState;
      if (editCustPostal !== (customer?.postal_code || "")) updates.postal_code = editCustPostal;
      if (editCustNotes !== (customer?.lead_notes || "")) updates.lead_notes = editCustNotes;

      if (Object.keys(updates).length === 0) {
        setIsEditingCustomer(false);
        return;
      }

      await updateCustomerMutation.mutateAsync({ id: customerId, data: updates as any });
      toastSuccess("Customer Updated", "Customer info saved successfully");
      setIsEditingCustomer(false);
      refetchCustomer();
      refetch(); // Also refresh work order for updated customer_name
    } catch {
      toastError("Update Failed", "Could not save customer changes. Please try again.");
    } finally {
      setIsSavingCustomer(false);
    }
  }, [customerId, customer, editCustPhone, editCustEmail, editCustAddress, editCustCity, editCustState, editCustPostal, editCustNotes, updateCustomerMutation, refetchCustomer, refetch]);

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
      <div className="flex gap-1.5">
        <TabButton
          label="Job Info"
          emoji="📋"
          active={activeTab === "info"}
          onClick={() => setActiveTab("info")}
        />
        <TabButton
          label="Customer"
          emoji="👤"
          active={activeTab === "customer"}
          onClick={() => setActiveTab("customer")}
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
          label="Done"
          emoji="✅"
          active={activeTab === "complete"}
          onClick={() => setActiveTab("complete")}
        />
      </div>

      {/* ── Confirm Complete Dialog ─────────────────────────────────── */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-bg-surface rounded-2xl p-6 w-[calc(100vw-2rem)] sm:w-[400px] shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary mb-2">Complete This Job?</h3>
            <p className="text-text-secondary text-sm mb-6">
              This will mark the job as completed. This action creates a commission record and cannot be easily undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCompleteConfirm(false)} className="flex-1 h-12 rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleConfirmStatusComplete} disabled={isSavingEdit} className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white">
                {isSavingEdit ? "Saving..." : "Yes, Complete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: JOB INFO (EDITABLE)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "info" && (
        <>
          {/* Edit Toggle */}
          <div className="flex justify-end">
            {!isEditing ? (
              <button
                onClick={handleEnterEdit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <span>✏️</span> Edit Job Details
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
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
                  </div>

                  {/* Quick Text Compose */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={() => setShowQuickText((v) => !v)}
                      className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                        showQuickText
                          ? "bg-purple-200 text-purple-800"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                      }`}
                    >
                      <span className="text-xl">📲</span> RC Text
                    </button>
                  </div>

                  {showQuickText && (
                    <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <p className="text-sm font-medium text-purple-800 mb-2">
                        Send SMS to {job.customer_phone} via RingCentral
                      </p>
                      <textarea
                        value={quickTextMsg}
                        onChange={(e) => setQuickTextMsg(e.target.value)}
                        placeholder="Type your message..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-purple-600">
                          {quickTextMsg.length}/160 chars
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowQuickText(false); setQuickTextMsg(""); }}
                            className="px-4 py-2 text-sm text-purple-600 hover:text-purple-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (!quickTextMsg.trim()) { toastError("Type a message first"); return; }
                              sendSMS.mutate(
                                { to: job.customer_phone!, body: quickTextMsg.trim(), customer_id: job.customer_id || undefined },
                                {
                                  onSuccess: () => { toastSuccess("Text sent to customer!"); setQuickTextMsg(""); setShowQuickText(false); },
                                  onError: () => { toastError("Failed to send text. Try the direct Text button instead."); },
                                },
                              );
                            }}
                            disabled={sendSMS.isPending || !quickTextMsg.trim()}
                            className="px-5 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            {sendSMS.isPending ? "Sending..." : "Send"}
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
                    className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-base font-medium hover:bg-blue-100 transition-colors"
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

                {/* Status Selector */}
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setEditStatus(opt.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          editStatus === opt.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-border bg-bg-surface text-text-secondary hover:border-blue-300"
                        }`}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setEditPriority(opt.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          editPriority === opt.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-border bg-bg-surface text-text-secondary hover:border-blue-300"
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimated Duration */}
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
                    className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
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
                      value={new Date(job.actual_start_time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                    />
                  )}
                  {job.actual_end_time && (
                    <InfoRow
                      emoji="⏹️"
                      label="Completed At"
                      value={new Date(job.actual_end_time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                    />
                  )}
                  {job.total_labor_minutes != null && job.total_labor_minutes > 0 && (
                    <InfoRow
                      emoji="⏳"
                      label="Total Labor"
                      value={job.total_labor_minutes >= 60
                        ? `${Math.floor(job.total_labor_minutes / 60)}h ${job.total_labor_minutes % 60}m`
                        : `${job.total_labor_minutes}m`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes (Always visible, editable in edit mode) */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                <span className="text-xl">📝</span> Notes
              </h2>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-2 block">
                      Job Notes
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add notes about this job..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
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
                      className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
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
                    <p className="text-sm text-text-muted italic mb-3">No job notes yet. Tap "Edit Job Details" to add notes.</p>
                  )}
                  {job.internal_notes && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Internal Notes</p>
                      <p className="text-base text-text-secondary bg-bg-muted rounded-lg p-3 whitespace-pre-wrap">{job.internal_notes}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Save Button (sticky at bottom when editing) */}
          {isEditing && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancelEdit} className="flex-1 h-14 rounded-xl text-base">
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
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
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: CUSTOMER INFO (NEW)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "customer" && (
        <>
          {isLoadingCustomer ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : !customer ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-4xl mb-3">👤</p>
                <p className="text-lg font-medium text-text-secondary">No customer linked</p>
                <p className="text-sm text-text-muted mt-1">This work order has no customer ID associated with it.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Customer Profile Header */}
              <Card className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white border-0">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                      {(customer.first_name || "?")[0]}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {customer.first_name} {customer.last_name}
                      </h2>
                      <p className="text-indigo-200 text-sm">
                        {customer.customer_type ? customer.customer_type.charAt(0).toUpperCase() + customer.customer_type.slice(1) : "Customer"}
                      </p>
                    </div>
                  </div>
                  {customer.is_active === false && (
                    <Badge variant="danger" size="sm" className="mt-2">Inactive</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Edit Toggle */}
              <div className="flex justify-end">
                {!isEditingCustomer ? (
                  <button
                    onClick={handleEnterCustomerEdit}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <span>✏️</span> Edit Customer Info
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelCustomerEdit}
                      className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCustomerEdit}
                      disabled={isSavingCustomer}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isSavingCustomer ? "Saving..." : "Save Customer"}
                    </button>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                    <span className="text-xl">📱</span> Contact Info
                  </h3>
                  {isEditingCustomer ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-text-secondary mb-1 block">Phone</label>
                        <input
                          type="tel"
                          inputMode="tel"
                          value={editCustPhone}
                          onChange={(e) => setEditCustPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                          className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-secondary mb-1 block">Email</label>
                        <input
                          type="email"
                          inputMode="email"
                          value={editCustEmail}
                          onChange={(e) => setEditCustEmail(e.target.value)}
                          placeholder="customer@email.com"
                          className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      <InfoRow emoji="📞" label="Phone" value={customer.phone} />
                      <InfoRow emoji="📧" label="Email" value={customer.email} />
                      {!customer.phone && !customer.email && (
                        <p className="text-sm text-text-muted italic py-2">No contact info on file</p>
                      )}
                    </div>
                  )}
                  {/* Quick Contact Buttons */}
                  {!isEditingCustomer && (customer.phone || customer.email) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {customer.phone && (
                        <>
                          <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                            <span>📞</span> Call
                          </a>
                          <a href={`sms:${customer.phone}`} className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-teal-100 transition-colors">
                            <span>💬</span> Text
                          </a>
                        </>
                      )}
                      {customer.email && (
                        <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                          <span>📧</span> Email
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                    <span className="text-xl">📍</span> Address
                  </h3>
                  {isEditingCustomer ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-text-secondary mb-1 block">Street Address</label>
                        <input
                          type="text"
                          value={editCustAddress}
                          onChange={(e) => setEditCustAddress(e.target.value)}
                          placeholder="123 Main St"
                          className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-text-secondary mb-1 block">City</label>
                          <input
                            type="text"
                            value={editCustCity}
                            onChange={(e) => setEditCustCity(e.target.value)}
                            placeholder="City"
                            className="w-full h-12 px-3 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-text-secondary mb-1 block">State</label>
                          <input
                            type="text"
                            maxLength={2}
                            value={editCustState}
                            onChange={(e) => setEditCustState(e.target.value.toUpperCase())}
                            placeholder="TX"
                            className="w-full h-12 px-3 rounded-xl border border-border bg-bg-surface text-base text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-text-secondary mb-1 block">ZIP</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editCustPostal}
                            onChange={(e) => setEditCustPostal(e.target.value)}
                            placeholder="77001"
                            className="w-full h-12 px-3 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {customer.address_line1 ? (
                        <a
                          href={buildMapsUrl(customer.address_line1, customer.city, customer.state)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 text-primary hover:text-primary/80"
                        >
                          <span className="text-xl mt-0.5">📍</span>
                          <div>
                            <p className="text-base underline">{customer.address_line1}</p>
                            {customer.address_line2 && <p className="text-base">{customer.address_line2}</p>}
                            <p className="text-sm text-text-secondary">
                              {[customer.city, customer.state, customer.postal_code].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </a>
                      ) : (
                        <p className="text-sm text-text-muted italic">No address on file</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Customer Notes */}
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                    <span className="text-xl">📝</span> Customer Notes
                  </h3>
                  {isEditingCustomer ? (
                    <textarea
                      value={editCustNotes}
                      onChange={(e) => setEditCustNotes(e.target.value)}
                      placeholder="Notes about this customer..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                    />
                  ) : customer.lead_notes ? (
                    <p className="text-base text-text-primary bg-bg-muted rounded-lg p-3 whitespace-pre-wrap">{customer.lead_notes}</p>
                  ) : (
                    <p className="text-sm text-text-muted italic">No notes. Tap "Edit Customer Info" to add notes.</p>
                  )}
                </CardContent>
              </Card>

              {/* Customer Details (Read-Only) */}
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                    <span className="text-xl">ℹ️</span> Account Details
                  </h3>
                  <div className="divide-y divide-border">
                    <InfoRow emoji="🏷️" label="Customer Type" value={customer.customer_type ? customer.customer_type.charAt(0).toUpperCase() + customer.customer_type.slice(1) : null} />
                    <InfoRow emoji="💳" label="Payment Terms" value={customer.default_payment_terms} />
                    <InfoRow emoji="📅" label="Customer Since" value={customer.created_at ? formatDate(customer.created_at) : null} />
                  </div>
                </CardContent>
              </Card>

              {/* Save Button for Customer Edit */}
              {isEditingCustomer && (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCancelCustomerEdit} className="flex-1 h-14 rounded-xl text-base">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveCustomerEdit}
                    disabled={isSavingCustomer}
                    className="flex-1 h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-bold shadow-lg disabled:opacity-50"
                  >
                    {isSavingCustomer ? "Saving..." : "Save Customer Info"}
                  </Button>
                </div>
              )}
            </>
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
