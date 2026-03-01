import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  useTechJobDetail,
  useStartJob,
  useCompleteJob,
  useRevertJobStatus,
  useUploadJobPhoto,
  useJobPhotos,
  useJobPayments,
  useRecordPayment,
  useCustomerServiceHistory,
  useJobPhotosGallery,
} from "@/api/hooks/useTechPortal.ts";
import type { ServiceHistoryItem, PhotoGalleryItem } from "@/api/hooks/useTechPortal.ts";
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
import { getRequiredPhotos, SYSTEM_TYPE_INFO } from "./photoCategories.ts";
import type { PhotoCategory } from "./photoCategories.ts";
import { InspectionChecklist } from "./components/InspectionChecklist.tsx";
import { NextJobCard } from "./components/NextJobCard.tsx";
import { JobInfoTab } from "./components/JobInfoTab.tsx";
import { JobPhotosTab } from "./components/JobPhotosTab.tsx";
import { JobPaymentTab } from "./components/JobPaymentTab.tsx";

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

// Photo requirements are now dynamic based on system_type — see photoCategories.ts

type TabKey = "info" | "customer" | "photos" | "history" | "payment" | "complete" | "inspection";

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
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1.5 rounded-xl text-sm font-medium transition-all relative ${
        active
          ? "bg-primary text-white shadow-md"
          : "bg-bg-surface text-text-secondary hover:bg-bg-muted"
      }`}
    >
      <span className="text-lg relative">
        {emoji}
        {badge != null && (
          <span
            className={`absolute -top-2 -right-3 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-0.5 shadow-sm border border-white/50 ${
              badgeColor || "bg-danger text-white"
            }`}
          >
            {badge}
          </span>
        )}
      </span>
      <span className="text-[11px] leading-tight">{label}</span>
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
  const revertStatusMutation = useRevertJobStatus();
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

  // Service history for this customer
  const { data: serviceHistory, isLoading: isLoadingHistory } = useCustomerServiceHistory(customerId);

  // Photo gallery with full-res data
  const { data: galleryPhotos = [] } = useJobPhotosGallery(jobId);

  // Photo lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoGalleryItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  // Dynamic photo requirements based on system type (conventional vs aerobic)
  const requiredPhotos = getRequiredPhotos(job?.system_type);
  const uploadedPhotoTypes = new Set(photos.map((p) => p.photo_type));
  const missingPhotos = requiredPhotos.filter(
    (r) => !uploadedPhotoTypes.has(r.type),
  );
  const photosComplete = missingPhotos.length === 0;
  const photosUploaded = requiredPhotos.length - missingPhotos.length;
  const photoProgressPct = requiredPhotos.length > 0
    ? Math.round((photosUploaded / requiredPhotos.length) * 100)
    : 0;

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
      if (status === "scheduled") {
        toastSuccess("En route! Drive safe.");
      } else {
        toastSuccess("Job started! Let's get it done!");
      }
      refetch();
    } catch {
      toastError("Couldn't start job. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }, [jobId, status, startJobMutation, refetch]);

  const handleRevertStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      await revertStatusMutation.mutateAsync({ jobId });
      toastSuccess("Status reverted.");
      refetch();
    } catch {
      toastError("Couldn't revert status.");
    }
  }, [jobId, revertStatusMutation, refetch]);

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

      await updateWorkOrderMutation.mutateAsync({ id: jobId, data: updates as Partial<import("@/api/types/workOrder").WorkOrderFormData> });
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
      await updateWorkOrderMutation.mutateAsync({ id: jobId, data: updates as Partial<import("@/api/types/workOrder").WorkOrderFormData> });
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

      await updateCustomerMutation.mutateAsync({ id: customerId, data: updates as Partial<import("@/api/types/customer").CustomerFormData> });
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
      <Card className="bg-gradient-to-br from-mac-navy to-mac-dark-blue text-white border-0 shadow-lg">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{jobTypeEmoji}</span>
              <div>
                <h1 className="text-xl font-bold">{jobTypeLabel}</h1>
                {job.work_order_number && (
                  <p className="text-white/70 text-sm">
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
          <div className="flex items-center gap-2 text-white/80">
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
          {/* System type badge */}
          {job.system_type && SYSTEM_TYPE_INFO[job.system_type] && (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${SYSTEM_TYPE_INFO[job.system_type].color}`}>
                {SYSTEM_TYPE_INFO[job.system_type].emoji} {SYSTEM_TYPE_INFO[job.system_type].label} System
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── System Info Card (from permit/customer data) ──── */}
      {(customer?.system_type || customer?.tank_size_gallons || customer?.manufacturer || customer?.system_issued_date) && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-3">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">System Info</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {customer.system_type && (
                <div>
                  <span className="text-text-muted">Type:</span>{" "}
                  <span className="font-medium">{customer.system_type}</span>
                </div>
              )}
              {customer.tank_size_gallons && (
                <div>
                  <span className="text-text-muted">Tank:</span>{" "}
                  <span className="font-medium">{customer.tank_size_gallons} gal</span>
                </div>
              )}
              {customer.manufacturer && (
                <div>
                  <span className="text-text-muted">Mfr:</span>{" "}
                  <span className="font-medium">{customer.manufacturer}</span>
                </div>
              )}
              {customer.installer_name && (
                <div>
                  <span className="text-text-muted">Installer:</span>{" "}
                  <span className="font-medium">{customer.installer_name}</span>
                </div>
              )}
              {customer.system_issued_date && (
                <div className="col-span-2">
                  <span className="text-text-muted">Age:</span>{" "}
                  {(() => {
                    const issued = new Date(customer.system_issued_date);
                    const age = Math.floor((Date.now() - issued.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                    const color = age < 10 ? "text-green-600" : age < 20 ? "text-yellow-600" : "text-red-600";
                    return <span className={`font-bold ${color}`}>{age} years</span>;
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Status Action Buttons ──── */}
      {canStart && (
        <div className="space-y-2">
          <Button
            onClick={handleStartJob}
            disabled={isStarting}
            className={`w-full h-14 text-lg font-bold rounded-xl text-white shadow-lg ${
              status === "scheduled"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-cta hover:bg-cta-hover"
            }`}
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> {status === "scheduled" ? "Heading out..." : "Starting..."}
              </span>
            ) : status === "scheduled" ? (
              <span className="flex items-center gap-2">
                <span className="text-xl">🚛</span> EN ROUTE
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">▶️</span> START JOB
              </span>
            )}
          </Button>
          {/* Undo button — only show for en_route (accidental tap of En Route) */}
          {status === "en_route" && (
            <button
              onClick={handleRevertStatus}
              disabled={revertStatusMutation.isPending}
              className="w-full py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {revertStatusMutation.isPending ? "Reverting..." : "↩ Undo — go back to Scheduled"}
            </button>
          )}
        </div>
      )}
      {/* Undo for in_progress — small link below the tab bar */}
      {status === "in_progress" && (
        <button
          onClick={handleRevertStatus}
          disabled={revertStatusMutation.isPending}
          className="w-full py-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          {revertStatusMutation.isPending ? "Reverting..." : "↩ Accidentally started? Go back to En Route"}
        </button>
      )}

      {/* ── Completed / Cancelled Banner ──────────────────────────────── */}
      {isCompleted && (
        <>
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
          <NextJobCard currentJobId={jobId!} />
        </>
      )}
      {isCancelled && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-4 text-center">
            <p className="text-lg font-bold text-red-700">Job Cancelled</p>
          </CardContent>
        </Card>
      )}

      {/* ── Tab Navigation ────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
        <TabButton
          label="Info"
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
          label="History"
          emoji="📜"
          active={activeTab === "history"}
          badge={serviceHistory ? String(serviceHistory.total_jobs) : undefined}
          badgeColor="bg-primary text-white"
          onClick={() => setActiveTab("history")}
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
        {(job?.system_type === "aerobic" || job?.system_type === "conventional" || job?.job_type?.toLowerCase()?.includes("inspection")) && (
          <TabButton
            label="Inspect"
            emoji="🔍"
            active={activeTab === "inspection"}
            onClick={() => setActiveTab("inspection")}
          />
        )}
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
        <JobInfoTab
          job={job}
          fullAddress={fullAddress}
          mapsUrl={mapsUrl}
          directionsUrl={directionsUrl}
          timeWindow={timeWindow}
          jobTypeEmoji={jobTypeEmoji}
          jobTypeLabel={jobTypeLabel}
          priorityEmoji={priorityEmoji}
          priorityLabel={priorityLabel}
          amount={amount}
          isEditing={isEditing}
          editStatus={editStatus}
          editPriority={editPriority}
          editNotes={editNotes}
          editInternalNotes={editInternalNotes}
          editDuration={editDuration}
          isSavingEdit={isSavingEdit}
          setEditStatus={setEditStatus}
          setEditPriority={setEditPriority}
          setEditNotes={setEditNotes}
          setEditInternalNotes={setEditInternalNotes}
          setEditDuration={setEditDuration}
          onEnterEdit={handleEnterEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          showQuickText={showQuickText}
          quickTextMsg={quickTextMsg}
          sendSMSPending={sendSMS.isPending}
          setShowQuickText={setShowQuickText}
          setQuickTextMsg={setQuickTextMsg}
          onSendSMS={(msg) => {
            if (!msg.trim()) { toastError("Type a message first"); return; }
            sendSMS.mutate(
              { to: job.customer_phone!, body: msg.trim(), customer_id: job.customer_id || undefined },
              {
                onSuccess: () => { toastSuccess("Text sent to customer!"); setQuickTextMsg(""); setShowQuickText(false); },
                onError: () => { toastError("Failed to send text. Try the direct Text button instead."); },
              },
            );
          }}
          initiateCallPending={initiateCall.isPending}
          onInitiateCall={(phoneNumber) => {
            initiateCall.mutate(
              { phoneNumber },
              {
                onSuccess: () => toastSuccess("Calling customer via RingCentral..."),
                onError: () => toastError("RingCentral call failed. Use the direct dial button instead."),
              },
            );
          }}
        />
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
              <Card className="bg-gradient-to-br from-mac-navy to-primary text-white border-0 shadow-lg">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                      {(customer.first_name || "?")[0]}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {customer.first_name} {customer.last_name}
                      </h2>
                      <p className="text-white/70 text-sm">
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-light text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
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
                          className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
                          className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
                        <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary/15 transition-colors">
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
                          className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
                            className="w-full h-12 px-3 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
                            className="w-full h-12 px-3 rounded-xl border border-border bg-bg-surface text-base text-center focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
                            className="w-full h-12 px-3 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
                      className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
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
        <JobPhotosTab
          systemType={job.system_type}
          photos={photos}
          galleryPhotos={galleryPhotos}
          requiredPhotos={requiredPhotos}
          uploadedPhotoTypes={uploadedPhotoTypes}
          missingPhotos={missingPhotos}
          photosComplete={photosComplete}
          photosUploaded={photosUploaded}
          photoProgressPct={photoProgressPct}
          uploadIsPending={uploadPhotoMutation.isPending}
          uploadingPhotoType={uploadingPhotoType}
          lightboxPhoto={lightboxPhoto}
          lightboxIndex={lightboxIndex}
          onPhotoCapture={handlePhotoCapture}
          onSetLightboxPhoto={setLightboxPhoto}
          onSetLightboxIndex={setLightboxIndex}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: SERVICE HISTORY
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <>
          {/* Customer Stats Summary */}
          {serviceHistory && (
            <Card className="bg-gradient-to-r from-primary/10 to-mac-navy/10 border-primary/30">
              <CardContent className="pt-5 pb-5">
                <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                  <span className="text-xl">📊</span> Customer Stats
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-mac-navy">{serviceHistory.total_jobs}</p>
                    <p className="text-xs text-text-muted">Total Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-700">{serviceHistory.completed_jobs}</p>
                    <p className="text-xs text-text-muted">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {serviceHistory.last_service_date
                        ? (() => {
                            const d = new Date(serviceHistory.last_service_date);
                            const now = new Date();
                            const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                            return diff === 0 ? "Today" : `${diff}d`;
                          })()
                        : "—"}
                    </p>
                    <p className="text-xs text-text-muted">Last Service</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service History List */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                <span className="text-xl">📜</span> Service History
              </h2>

              {isLoadingHistory && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              )}

              {!isLoadingHistory && (!serviceHistory || serviceHistory.work_orders.length === 0) && (
                <div className="py-8 text-center">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-text-secondary font-medium">No previous service history</p>
                  <p className="text-sm text-text-muted">This appears to be a new customer</p>
                </div>
              )}

              {serviceHistory && serviceHistory.work_orders.length > 0 && (
                <div className="space-y-3">
                  {serviceHistory.work_orders.map((wo) => {
                    const isCurrent = wo.id === jobId;
                    const woStatusColor = STATUS_COLORS[wo.status || ""] || "gray";
                    const woStatusLabel = STATUS_LABELS[wo.status || ""] || wo.status || "Unknown";
                    const woTypeEmoji = JOB_TYPE_EMOJIS[wo.job_type || "other"] || "📦";
                    const woTypeLabel = JOB_TYPE_LABELS[wo.job_type || "other"] || wo.job_type || "Other";

                    return (
                      <button
                        key={wo.id}
                        onClick={() => {
                          if (!isCurrent) navigate(`/portal/jobs/${wo.id}`);
                        }}
                        disabled={isCurrent}
                        className={`w-full text-left rounded-xl border p-4 transition-all ${
                          isCurrent
                            ? "border-primary/40 bg-primary/10 ring-2 ring-primary/20"
                            : "border-border-default bg-bg-surface hover:bg-bg-muted hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg flex-shrink-0">{woTypeEmoji}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary truncate">
                                {woTypeLabel}
                                {isCurrent && (
                                  <span className="ml-2 text-xs text-primary font-bold">(Current Job)</span>
                                )}
                              </p>
                              {wo.work_order_number && (
                                <p className="text-xs text-text-muted">#{wo.work_order_number}</p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={STATUS_BADGE_VARIANT[woStatusColor] || "default"}
                            size="sm"
                            className="flex-shrink-0"
                          >
                            {woStatusLabel}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                          {wo.scheduled_date && (
                            <span className="flex items-center gap-1">
                              📅 {formatDate(wo.scheduled_date)}
                            </span>
                          )}
                          {wo.total_amount != null && wo.total_amount > 0 && (
                            <span className="flex items-center gap-1">
                              💰 {formatCurrency(wo.total_amount)}
                            </span>
                          )}
                          {wo.photo_count > 0 && (
                            <span className="flex items-center gap-1">
                              📸 {wo.photo_count}
                            </span>
                          )}
                          {wo.total_labor_minutes != null && wo.total_labor_minutes > 0 && (
                            <span className="flex items-center gap-1">
                              ⏱️ {Math.round(wo.total_labor_minutes / 60 * 10) / 10}h
                            </span>
                          )}
                        </div>

                        {wo.notes && (
                          <p className="mt-2 text-sm text-text-secondary line-clamp-2">{wo.notes}</p>
                        )}

                        {wo.assigned_technician && (
                          <p className="mt-1 text-xs text-text-muted">
                            👷 {wo.assigned_technician}
                          </p>
                        )}
                      </button>
                    );
                  })}
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
        <JobPaymentTab
          payments={payments}
          paymentMethod={paymentMethod}
          paymentAmount={paymentAmount}
          checkNumber={checkNumber}
          paymentNotes={paymentNotes}
          paymentRecorded={paymentRecorded}
          totalPaid={totalPaid}
          estimatedAmount={amount}
          isSubmitting={recordPaymentMutation.isPending}
          setPaymentMethod={setPaymentMethod}
          setPaymentAmount={setPaymentAmount}
          setCheckNumber={setCheckNumber}
          setPaymentNotes={setPaymentNotes}
          onSubmit={handleRecordPayment}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: INSPECTION (Aerobic + Conventional Systems)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "inspection" && (
        <Card>
          <CardContent className="p-4">
            <InspectionChecklist
              jobId={jobId!}
              systemType={job?.system_type || "conventional"}
              jobType={job?.job_type || undefined}
              customerPhone={customer?.phone || undefined}
              customerName={customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : undefined}
              customerEmail={customer?.email || undefined}
              onPhotoUploaded={() => refetchPhotos()}
            />
          </CardContent>
        </Card>
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
                {/* Required Photos — dynamic based on system type */}
                {requiredPhotos.map((req) => {
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
                          : req.aerobicOnly
                            ? "border-purple-300 bg-purple-50 hover:bg-purple-100"
                            : "border-red-300 bg-red-50 hover:bg-red-100"
                      }`}
                    >
                      <span className="text-2xl">
                        {done ? "✅" : "❌"}
                      </span>
                      <div className="flex-1 text-left">
                        <p
                          className={`font-medium ${done ? "text-green-700" : req.aerobicOnly ? "text-purple-700" : "text-red-700"}`}
                        >
                          {req.emoji} {req.label} Photo
                        </p>
                        <p className="text-xs text-text-muted">
                          {done ? "Uploaded" : req.guidance}
                        </p>
                      </div>
                      {!done && (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          req.aerobicOnly ? "text-purple-500 bg-purple-100" : "text-red-500 bg-red-100"
                        }`}>
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
                    {photosUploaded + (paymentRecorded ? 1 : 0)}
                    /{requiredPhotos.length + 1}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      completionReady ? "bg-green-500" : "bg-primary"
                    }`}
                    style={{
                      width: `${
                        ((photosUploaded + (paymentRecorded ? 1 : 0)) /
                          (requiredPhotos.length + 1)) *
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
          className="flex items-center justify-center gap-2 w-full h-14 text-lg font-bold rounded-xl bg-primary/10 text-primary hover:bg-primary/15 transition-colors border border-primary/30"
        >
          <span className="text-xl">🗺️</span> Get Directions
        </a>
      )}
    </div>
  );
}
