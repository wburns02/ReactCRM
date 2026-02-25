/**
 * WorkOrderEditModal - Tabbed Work Order Form Modal
 *
 * A comprehensive tabbed dialog for creating and editing work orders.
 * Matches legacy system functionality with modern UX.
 *
 * Tabs:
 * 1. Details - Customer, Job Type, Priority, Status, Notes
 * 2. Schedule - Date, Time, Technician, Duration, Smart Scheduling
 * 3. Documentation - Required photos, Gallery, Signatures
 * 4. Communication - Notification buttons, SMS thread
 * 5. Payment - Invoice preview, Payment processing
 * 6. History - Activity timeline
 */

import { useState, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { toastInfo } from "@/components/ui/Toast";

// Feature components
import PhotoCapture, {
  type CapturedPhoto,
} from "../Documentation/PhotoCapture";
import PhotoGallery from "../Documentation/PhotoGallery";
import SignatureCapture, {
  type SignatureData,
} from "../Documentation/SignatureCapture";
import SMSConversation from "../Communications/SMSConversation";
import NotificationCenter from "../Communications/NotificationCenter";
import PaymentProcessor from "../Payments/PaymentProcessor";
import InvoiceGenerator from "../Payments/InvoiceGenerator";
import WorkOrderTimeline from "./WorkOrderTimeline";

// Hooks and types
import { useCustomers } from "@/api/hooks/useCustomers";
import { useTechnicians } from "@/api/hooks/useTechnicians";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { useWorkOrderPhotoOperations } from "@/api/hooks/useWorkOrderPhotos";
import {
  workOrderFormSchema,
  type WorkOrderFormData,
  type WorkOrder,
  type WorkOrderExtended,
  type WorkOrderPhoto,
  type PhotoType,
  type ActivityLogEntry,
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
  type WorkOrderStatus,
  type JobType,
  type Priority,
} from "@/api/types/workOrder";

// ============================================================================
// TYPES
// ============================================================================

export interface WorkOrderEditModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (data: WorkOrderFormData) => Promise<void>;
  /** Existing work order for editing (null for create) */
  workOrder?: WorkOrder | WorkOrderExtended | null;
  /** Whether form submission is in progress */
  isLoading?: boolean;
}

type TabValue =
  | "details"
  | "schedule"
  | "documentation"
  | "communication"
  | "payment"
  | "history";

interface RequiredPhoto {
  type: PhotoType;
  label: string;
  required: boolean;
  captured: boolean;
}

// ============================================================================
// QUICK NOTIFICATION BUTTONS
// ============================================================================

interface QuickNotificationButtonsProps {
  workOrderId: string;
  customerId: string;
  customerPhone?: string;
  disabled?: boolean;
}

function QuickNotificationButtons({
  workOrderId: _workOrderId,
  customerId: _customerId,
  customerPhone,
  disabled,
}: QuickNotificationButtonsProps) {
  const [sendingType, setSendingType] = useState<string | null>(null);

  const handleSend = async (type: "reminder" | "enroute" | "complete") => {
    if (!customerPhone) return;
    setSendingType(type);

    // Simulate sending - in production this would call an API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSendingType(null);
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <Button
        variant="outline"
        onClick={() => handleSend("reminder")}
        disabled={disabled || !customerPhone || sendingType !== null}
        className="flex flex-col items-center gap-1 h-auto py-3"
      >
        {sendingType === "reminder" ? (
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span className="text-xs">Reminder</span>
      </Button>

      <Button
        variant="outline"
        onClick={() => handleSend("enroute")}
        disabled={disabled || !customerPhone || sendingType !== null}
        className="flex flex-col items-center gap-1 h-auto py-3"
      >
        {sendingType === "enroute" ? (
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
            />
          </svg>
        )}
        <span className="text-xs">En Route</span>
      </Button>

      <Button
        variant="outline"
        onClick={() => handleSend("complete")}
        disabled={disabled || !customerPhone || sendingType !== null}
        className="flex flex-col items-center gap-1 h-auto py-3"
      >
        {sendingType === "complete" ? (
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span className="text-xs">Complete</span>
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkOrderEditModal({
  open,
  onClose,
  onSubmit,
  workOrder,
  isLoading,
}: WorkOrderEditModalProps) {
  const isEdit = !!workOrder;
  const [activeTab, setActiveTab] = useState<TabValue>("details");

  // Photo capture state
  const [capturePhotoType, setCapturePhotoType] = useState<PhotoType | null>(
    null,
  );

  // Photos from API when editing existing work order
  const {
    photos: apiPhotos,
    uploadPhoto,
    isUploading: _isUploading,
    deletePhoto,
    isDeleting: _isDeleting,
  } = useWorkOrderPhotoOperations(workOrder?.id);

  // Note: isUploading and isDeleting are available for UI feedback if needed
  void _isUploading;
  void _isDeleting;

  // Local photos for new work orders (will be uploaded after creation)
  const [localPhotos, setLocalPhotos] = useState<WorkOrderPhoto[]>([]);

  // Combine API photos with local photos
  const photos = isEdit ? apiPhotos : localPhotos;

  // Signature state
  const [signatures, setSignatures] = useState<{
    customer?: SignatureData;
    technician?: SignatureData;
  }>({});

  // Fetch technicians for dropdown
  const { data: techniciansData } = useTechnicians({
    page: 1,
    page_size: 100,
    active_only: true,
  });
  const technicians = techniciansData?.items || [];

  // Get extended work order data if available
  const extendedWorkOrder = workOrder as WorkOrderExtended | undefined;

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: workOrder
      ? {
          customer_id: String(workOrder.customer_id),
          job_type: workOrder.job_type as JobType,
          status: workOrder.status as WorkOrderStatus,
          priority: workOrder.priority as Priority,
          scheduled_date: workOrder.scheduled_date || "",
          time_window_start: workOrder.time_window_start?.slice(0, 5) || "",
          time_window_end: workOrder.time_window_end?.slice(0, 5) || "",
          estimated_duration_hours:
            workOrder.estimated_duration_hours || undefined,
          assigned_technician: workOrder.assigned_technician || "",
          assigned_vehicle: workOrder.assigned_vehicle || "",
          service_address_line1: workOrder.service_address_line1 || "",
          service_address_line2: workOrder.service_address_line2 || "",
          service_city: workOrder.service_city || "",
          service_state: workOrder.service_state || "",
          service_postal_code: workOrder.service_postal_code || "",
          system_type: workOrder.system_type || "conventional",
          notes: workOrder.notes || "",
        }
      : {
          customer_id: "",
          job_type: "pumping" as JobType,
          status: "draft" as WorkOrderStatus,
          priority: "normal" as Priority,
          scheduled_date: "",
          time_window_start: "",
          time_window_end: "",
          estimated_duration_hours: 1,
          assigned_technician: "",
          assigned_vehicle: "",
          service_address_line1: "",
          service_address_line2: "",
          service_city: "",
          service_state: "",
          service_postal_code: "",
          system_type: "conventional",
          notes: "",
        },
  });

  const customerId = watch("customer_id");

  // Note: Photos are now fetched via useWorkOrderPhotoOperations hook for edit mode
  // No need to load from extendedWorkOrder.photos as the hook handles this

  // Required photos checklist based on job type
  const requiredPhotos: RequiredPhoto[] = useMemo(() => {
    const jobType = watch("job_type");
    const base: RequiredPhoto[] = [
      {
        type: "before",
        label: "Before Photo",
        required: true,
        captured: photos.some((p) => p.metadata.photoType === "before"),
      },
      {
        type: "after",
        label: "After Photo",
        required: true,
        captured: photos.some((p) => p.metadata.photoType === "after"),
      },
      {
        type: "lid",
        label: "Lid Photo",
        required: false,
        captured: photos.some((p) => p.metadata.photoType === "lid"),
      },
    ];

    if (jobType === "pumping" || jobType === "grease_trap") {
      base.push({
        type: "manifest",
        label: "Manifest Photo",
        required: true,
        captured: photos.some((p) => p.metadata.photoType === "manifest"),
      });
    }

    if (jobType === "camera_inspection") {
      base.push({
        type: "tank",
        label: "Tank Photo",
        required: true,
        captured: photos.some((p) => p.metadata.photoType === "tank"),
      });
    }

    return base;
  }, [watch, photos]);

  // Handle photo capture
  const handlePhotoCapture = useCallback(
    async (photo: CapturedPhoto) => {
      setCapturePhotoType(null);

      if (isEdit && workOrder?.id) {
        // For existing work orders, upload directly to API
        try {
          await uploadPhoto({
            data: photo.data,
            thumbnail: photo.thumbnail,
            metadata: photo.metadata,
          });
        } catch (err) {
          console.error("[WorkOrderEditModal] Photo upload failed:", err);
        }
      } else {
        // For new work orders, store locally until work order is created
        const newPhoto: WorkOrderPhoto = {
          id: photo.id,
          workOrderId: "new",
          data: photo.data,
          thumbnail: photo.thumbnail,
          metadata: photo.metadata,
          uploadStatus: "pending",
          createdAt: new Date().toISOString(),
        };
        setLocalPhotos((prev) => [...prev, newPhoto]);
      }
    },
    [isEdit, workOrder?.id, uploadPhoto],
  );

  // Handle photo delete
  const handlePhotoDelete = useCallback(
    async (photoId: string) => {
      if (isEdit && workOrder?.id) {
        // For existing work orders, delete via API
        try {
          await deletePhoto(photoId);
        } catch (err) {
          console.error("[WorkOrderEditModal] Photo delete failed:", err);
        }
      } else {
        // For new work orders, remove from local state
        setLocalPhotos((prev) => prev.filter((p) => p.id !== photoId));
      }
    },
    [isEdit, workOrder?.id, deletePhoto],
  );

  // Handle signature save
  const handleSignatureSave = useCallback(
    (type: "customer" | "technician", signature: SignatureData) => {
      setSignatures((prev) => ({
        ...prev,
        [type]: signature,
      }));
    },
    [],
  );

  const handleClose = () => {
    reset();
    setActiveTab("details");
    setLocalPhotos([]);
    setSignatures({});
    setCapturePhotoType(null);
    onClose();
  };

  const handleFormSubmit = async (data: WorkOrderFormData) => {
    // Clean up empty strings to undefined
    const cleanedData: WorkOrderFormData = {
      ...data,
      scheduled_date: data.scheduled_date || undefined,
      time_window_start: data.time_window_start || undefined,
      time_window_end: data.time_window_end || undefined,
      estimated_duration_hours: data.estimated_duration_hours || undefined,
      assigned_technician: data.assigned_technician || undefined,
      assigned_vehicle: data.assigned_vehicle || undefined,
      service_address_line1: data.service_address_line1 || undefined,
      service_address_line2: data.service_address_line2 || undefined,
      service_city: data.service_city || undefined,
      service_state: data.service_state || undefined,
      service_postal_code: data.service_postal_code || undefined,
      notes: data.notes || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  // Get customer info for child components
  const { data: customersData } = useCustomers({ page: 1, page_size: 200 });
  const selectedCustomer = customersData?.items?.find(
    (c) => String(c.id) === String(customerId),
  );

  // Sample activity log for history tab (would come from API in production)
  const activities: ActivityLogEntry[] = extendedWorkOrder?.activityLog || [
    {
      id: "1",
      type: "created",
      description: "Work order created",
      userName: "System",
      timestamp: workOrder?.created_at || new Date().toISOString(),
    },
  ];

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="xl" className="max-w-5xl">
        <DialogHeader onClose={handleClose}>
          <div className="flex items-center gap-3">
            <span>{isEdit ? "Edit Work Order" : "Create Work Order"}</span>
            {workOrder?.id && (
              <Badge variant="outline" className="font-mono">
                #{workOrder.id}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="p-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabValue)}
            >
              <TabList className="px-6 pt-4 border-b-0">
                <TabTrigger value="details">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Details
                </TabTrigger>
                <TabTrigger value="schedule">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Schedule
                </TabTrigger>
                <TabTrigger value="documentation">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                  Documentation
                </TabTrigger>
                <TabTrigger value="communication">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Communication
                </TabTrigger>
                <TabTrigger value="payment">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Payment
                </TabTrigger>
                <TabTrigger value="history">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  History
                </TabTrigger>
              </TabList>

              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {/* ==================== DETAILS TAB ==================== */}
                <TabContent value="details" className="mt-0">
                  <div className="space-y-6">
                    {/* Customer Selection */}
                    <Controller
                      name="customer_id"
                      control={control}
                      render={({ field }) => (
                        <CustomerCombobox
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isEdit}
                          error={errors.customer_id?.message}
                          onCustomerCreated={(c) => {
                            // Auto-fill service address from new customer
                            if (c.address_line1) setValue("service_address_line1", c.address_line1);
                            if (c.city) setValue("service_city", c.city);
                            if (c.state) setValue("service_state", c.state);
                            if (c.postal_code) setValue("service_postal_code", c.postal_code);
                          }}
                        />
                      )}
                    />

                    {/* Job Type & Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="job_type" required>
                          Job Type
                        </Label>
                        <Select id="job_type" {...register("job_type")}>
                          {(
                            Object.entries(JOB_TYPE_LABELS) as [
                              JobType,
                              string,
                            ][]
                          ).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select id="status" {...register("status")}>
                          {(
                            Object.entries(WORK_ORDER_STATUS_LABELS) as [
                              WorkOrderStatus,
                              string,
                            ][]
                          ).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select id="priority" {...register("priority")}>
                        {(
                          Object.entries(PRIORITY_LABELS) as [
                            Priority,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* System Type */}
                    <div className="space-y-2">
                      <Label htmlFor="system_type">System Type</Label>
                      <Select id="system_type" {...register("system_type")}>
                        <option value="conventional">🏗️ Conventional</option>
                        <option value="aerobic">💨 Aerobic</option>
                      </Select>
                    </div>

                    {/* Service Address */}
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                        Service Address
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="service_address_line1">
                            Street Address
                          </Label>
                          <Input
                            id="service_address_line1"
                            {...register("service_address_line1")}
                            placeholder="123 Main St"
                          />
                        </div>

                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="service_address_line2">
                            Address Line 2
                          </Label>
                          <Input
                            id="service_address_line2"
                            {...register("service_address_line2")}
                            placeholder="Apt 4B"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="service_city">City</Label>
                          <Input
                            id="service_city"
                            {...register("service_city")}
                            placeholder="Tampa"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="service_state">State</Label>
                            <Input
                              id="service_state"
                              {...register("service_state")}
                              placeholder="FL"
                              maxLength={2}
                            />
                            {errors.service_state && (
                              <p className="text-sm text-danger">
                                {errors.service_state.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="service_postal_code">
                              ZIP Code
                            </Label>
                            <Input
                              id="service_postal_code"
                              {...register("service_postal_code")}
                              placeholder="33601"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        {...register("notes")}
                        placeholder="Additional notes about this work order..."
                        rows={4}
                      />
                    </div>
                  </div>
                </TabContent>

                {/* ==================== SCHEDULE TAB ==================== */}
                <TabContent value="schedule" className="mt-0">
                  <div className="space-y-6">
                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduled_date">Scheduled Date</Label>
                        <Input
                          id="scheduled_date"
                          type="date"
                          {...register("scheduled_date")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimated_duration_hours">
                          Duration (hours)
                        </Label>
                        <Input
                          id="estimated_duration_hours"
                          type="number"
                          min="0"
                          step="0.5"
                          {...register("estimated_duration_hours")}
                          placeholder="2"
                        />
                      </div>
                    </div>

                    {/* Time Window */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="time_window_start">Start Time</Label>
                        <Input
                          id="time_window_start"
                          type="time"
                          {...register("time_window_start")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time_window_end">End Time</Label>
                        <Input
                          id="time_window_end"
                          type="time"
                          {...register("time_window_end")}
                        />
                      </div>
                    </div>

                    {/* Technician Assignment */}
                    <div className="space-y-2">
                      <Label htmlFor="assigned_technician">
                        Assigned Technician
                      </Label>
                      <Select
                        id="assigned_technician"
                        {...register("assigned_technician")}
                      >
                        <option value="">Select technician...</option>
                        {technicians.map((t) => (
                          <option
                            key={t.id}
                            value={`${t.first_name} ${t.last_name}`}
                          >
                            {t.first_name} {t.last_name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Vehicle */}
                    <div className="space-y-2">
                      <Label htmlFor="assigned_vehicle">Vehicle</Label>
                      <Input
                        id="assigned_vehicle"
                        {...register("assigned_vehicle")}
                        placeholder="Truck #1"
                      />
                    </div>

                    {/* Smart Scheduling Button */}
                    <Card className="p-4 border-dashed">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Smart Scheduling</h4>
                          <p className="text-sm text-text-muted">
                            Let the system suggest the optimal time slot and
                            technician
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            toastInfo("Coming Soon", "Smart scheduling feature is under development.");
                          }}
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                          Suggest Best Slot
                        </Button>
                      </div>
                    </Card>
                  </div>
                </TabContent>

                {/* ==================== DOCUMENTATION TAB ==================== */}
                <TabContent value="documentation" className="mt-0">
                  <div className="space-y-6">
                    {/* Photo Capture Mode */}
                    {capturePhotoType && (
                      <PhotoCapture
                        workOrderId={workOrder?.id || "new"}
                        photoType={capturePhotoType}
                        onCapture={handlePhotoCapture}
                        onCancel={() => setCapturePhotoType(null)}
                        required={
                          requiredPhotos.find(
                            (p) => p.type === capturePhotoType,
                          )?.required
                        }
                      />
                    )}

                    {/* Required Photos Checklist */}
                    {!capturePhotoType && (
                      <>
                        <div>
                          <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                            Required Photos
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {requiredPhotos.map((photo) => (
                              <button
                                key={photo.type}
                                type="button"
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                                  photo.captured
                                    ? "border-success bg-success/10"
                                    : "border-border hover:border-primary",
                                )}
                                onClick={() => setCapturePhotoType(photo.type)}
                              >
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    photo.captured
                                      ? "bg-success text-white"
                                      : "bg-bg-muted text-text-muted",
                                  )}
                                >
                                  {photo.captured ? (
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    {photo.label}
                                  </span>
                                  {photo.required && !photo.captured && (
                                    <span className="text-xs text-danger ml-2">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Photo Gallery */}
                        {photos.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                              Captured Photos
                            </h4>
                            <PhotoGallery
                              photos={photos}
                              onDelete={handlePhotoDelete}
                              editable
                            />
                          </div>
                        )}

                        {/* Signatures */}
                        <div>
                          <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                            Signatures
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Customer Signature */}
                            <div>
                              {signatures.customer ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium">
                                      Customer Signature
                                    </h5>
                                    <Badge variant="success">Captured</Badge>
                                  </div>
                                  <div className="p-4 bg-white rounded-lg border">
                                    <img
                                      src={signatures.customer.data}
                                      alt="Customer signature"
                                      className="max-h-32 mx-auto"
                                    />
                                    <p className="text-center text-sm text-text-muted mt-2">
                                      {signatures.customer.signerName}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <SignatureCapture
                                  type="customer"
                                  onSave={(sig) =>
                                    handleSignatureSave("customer", sig)
                                  }
                                  signerName={
                                    selectedCustomer
                                      ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                                      : ""
                                  }
                                />
                              )}
                            </div>

                            {/* Technician Signature */}
                            <div>
                              {signatures.technician ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium">
                                      Technician Signature
                                    </h5>
                                    <Badge variant="success">Captured</Badge>
                                  </div>
                                  <div className="p-4 bg-white rounded-lg border">
                                    <img
                                      src={signatures.technician.data}
                                      alt="Technician signature"
                                      className="max-h-32 mx-auto"
                                    />
                                    <p className="text-center text-sm text-text-muted mt-2">
                                      {signatures.technician.signerName}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <SignatureCapture
                                  type="technician"
                                  onSave={(sig) =>
                                    handleSignatureSave("technician", sig)
                                  }
                                  signerName={
                                    watch("assigned_technician") || ""
                                  }
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabContent>

                {/* ==================== COMMUNICATION TAB ==================== */}
                <TabContent value="communication" className="mt-0">
                  <div className="space-y-6">
                    {/* Quick Notification Buttons */}
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                        Quick Notifications
                      </h4>
                      <QuickNotificationButtons
                        workOrderId={workOrder?.id || "new"}
                        customerId={String(customerId)}
                        customerPhone={selectedCustomer?.phone ?? undefined}
                        disabled={!isEdit || !selectedCustomer?.phone}
                      />
                      {!selectedCustomer?.phone && (
                        <p className="text-sm text-warning mt-2">
                          Customer phone number required to send notifications
                        </p>
                      )}
                    </div>

                    {/* SMS Conversation */}
                    {isEdit && customerId ? (
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                          SMS Conversation
                        </h4>
                        <SMSConversation
                          customerId={String(customerId)}
                          workOrderId={workOrder?.id}
                          customerName={
                            selectedCustomer
                              ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                              : undefined
                          }
                          customerPhone={selectedCustomer?.phone ?? undefined}
                        />
                      </div>
                    ) : (
                      <Card className="p-8 text-center text-text-muted">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        <p>Save the work order to enable SMS communication</p>
                      </Card>
                    )}

                    {/* Notification Center */}
                    {isEdit && (
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                          Notification History
                        </h4>
                        <NotificationCenter
                          workOrderId={workOrder?.id}
                          customerId={String(customerId)}
                        />
                      </div>
                    )}
                  </div>
                </TabContent>

                {/* ==================== PAYMENT TAB ==================== */}
                <TabContent value="payment" className="mt-0">
                  <div className="space-y-6">
                    {isEdit && selectedCustomer && workOrder ? (
                      <>
                        {/* Invoice Generator */}
                        <InvoiceGenerator
                          customer={{
                            id: String(selectedCustomer.id),
                            firstName: selectedCustomer.first_name || "",
                            lastName: selectedCustomer.last_name || "",
                            email: selectedCustomer.email || undefined,
                            phone: selectedCustomer.phone || undefined,
                          }}
                          workOrder={{
                            id: workOrder.id,
                            jobType: workOrder.job_type,
                            scheduledDate:
                              workOrder.scheduled_date || undefined,
                            status: workOrder.status,
                          }}
                          initialItems={extendedWorkOrder?.lineItems?.map(
                            (item) => ({
                              id: item.id,
                              service: item.category || "service",
                              description: item.description,
                              quantity: item.quantity,
                              unitPrice: item.unitPrice,
                              taxable: item.taxable,
                            }),
                          )}
                          onInvoiceCreated={(_invoiceId) => {
                            // Invoice creation triggers cache invalidation via the mutation hook
                          }}
                        />

                        {/* Payment Processor */}
                        <PaymentProcessor
                          workOrderId={workOrder.id}
                          amount={extendedWorkOrder?.total || 0}
                          customerName={`${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
                          onSuccess={(_transactionId) => {
                            // Payment processing triggers cache invalidation via the mutation hook
                          }}
                        />
                      </>
                    ) : (
                      <Card className="p-8 text-center text-text-muted">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <p>
                          Save the work order and select a customer to enable
                          payments
                        </p>
                      </Card>
                    )}
                  </div>
                </TabContent>

                {/* ==================== HISTORY TAB ==================== */}
                <TabContent value="history" className="mt-0">
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                      Activity Timeline
                    </h4>
                    {activities.length > 0 ? (
                      <WorkOrderTimeline
                        activities={activities}
                        initialVisibleCount={10}
                        collapsible
                        showUserNames
                      />
                    ) : (
                      <Card className="p-8 text-center text-text-muted">
                        <svg
                          className="w-12 h-12 mx-auto mb-3 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p>No activity recorded yet</p>
                      </Card>
                    )}
                  </div>
                </TabContent>
              </div>
            </Tabs>
          </DialogBody>

          <DialogFooter className="border-t">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-text-muted">
                {isEdit && workOrder?.updated_at && (
                  <>
                    Last updated:{" "}
                    {new Date(workOrder.updated_at).toLocaleString()}
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Saving..."
                    : isEdit
                      ? "Save Changes"
                      : "Create Work Order"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WorkOrderEditModal;
