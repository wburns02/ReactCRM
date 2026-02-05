import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
} from "@/components/ui/Tabs.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useWorkOrder,
  useUpdateWorkOrder,
  useDeleteWorkOrder,
} from "@/api/hooks/useWorkOrders.ts";
import { useWorkOrderPhotoOperations } from "@/api/hooks/useWorkOrderPhotos.ts";
import { WorkOrderForm } from "./components/WorkOrderForm.tsx";
import { StatusWorkflow } from "./components/StatusWorkflow.tsx";
import { WorkOrderTimeline } from "./components/WorkOrderTimeline.tsx";
import { DialButton } from "@/features/phone/components/DialButton.tsx";
import { formatDate } from "@/lib/utils.ts";
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
  type WorkOrderFormData,
  type WorkOrderStatus,
  type JobType,
  type Priority,
  type PhotoType,
  type WorkOrderSignature,
  type ActivityLogEntry,
} from "@/api/types/workOrder.ts";

// Documentation components
import {
  PhotoCapture,
  type CapturedPhoto,
} from "./Documentation/PhotoCapture.tsx";
import { PhotoGallery } from "./Documentation/PhotoGallery.tsx";
import {
  SignatureCapture,
  type SignatureData,
} from "./Documentation/SignatureCapture.tsx";
import { SignaturePairDisplay } from "./Documentation/SignatureDisplay.tsx";

// Communication components
import { SMSConversation } from "./Communications/SMSConversation.tsx";
import { NotificationCenter } from "./Communications/NotificationCenter.tsx";
import { TwilioSMSPanel } from "./Communications/TwilioSMSPanel.tsx";

// Payment components
import { PaymentProcessor } from "./Payments/PaymentProcessor.tsx";
import {
  InvoiceGenerator,
  type CustomerInfo,
  type WorkOrderReference,
} from "./Payments/InvoiceGenerator.tsx";

/**
 * Get badge variant based on status
 */
function getStatusVariant(
  status: WorkOrderStatus,
): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case "completed":
      return "success";
    case "canceled":
      return "danger";
    case "enroute":
    case "on_site":
    case "in_progress":
    case "requires_followup":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Get badge variant based on priority
 */
function getPriorityVariant(
  priority: Priority,
): "default" | "success" | "warning" | "danger" {
  switch (priority) {
    case "low":
      return "default";
    case "normal":
      return "success";
    case "high":
      return "warning";
    case "urgent":
    case "emergency":
      return "danger";
    default:
      return "default";
  }
}

/**
 * Work Order detail page - shows full work order info with edit/delete
 */
export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: workOrder, isLoading, error } = useWorkOrder(id);
  const updateMutation = useUpdateWorkOrder();
  const deleteMutation = useDeleteWorkOrder();

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("overview");

  // Documentation state - Photos now use API hook
  const {
    photos,
    isLoading: _photosLoading,
    uploadPhoto,
    isUploading: _isUploading,
    deletePhoto,
    isDeleting: _isDeleting,
  } = useWorkOrderPhotoOperations(id);

  // Note: Loading states available for UI feedback if needed
  void _photosLoading;
  void _isUploading;
  void _isDeleting;

  const [customerSignature, setCustomerSignature] = useState<
    WorkOrderSignature | undefined
  >();
  const [technicianSignature, setTechnicianSignature] = useState<
    WorkOrderSignature | undefined
  >();
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [capturePhotoType, setCapturePhotoType] = useState<PhotoType>("before");

  // Activity log (mock data for now - would come from API)
  const [activityLog] = useState<ActivityLogEntry[]>([
    {
      id: "1",
      type: "created",
      description: "Work order created",
      userName: "System",
      timestamp: workOrder?.created_at || new Date().toISOString(),
    },
  ]);

  const handleUpdate = useCallback(
    async (data: WorkOrderFormData) => {
      if (id) {
        await updateMutation.mutateAsync({ id, data });
        setIsEditOpen(false);
      }
    },
    [id, updateMutation],
  );

  const handleDelete = useCallback(async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate("/work-orders");
    }
  }, [id, deleteMutation, navigate]);

  // Photo handlers
  const handleStartPhotoCapture = useCallback((type: PhotoType) => {
    setCapturePhotoType(type);
    setIsCapturingPhoto(true);
  }, []);

  const handlePhotoCapture = useCallback(
    async (photo: CapturedPhoto) => {
      setIsCapturingPhoto(false);

      // Upload photo to API
      try {
        await uploadPhoto({
          data: photo.data,
          thumbnail: photo.thumbnail,
          metadata: photo.metadata,
        });
      } catch (err) {
        console.error("[WorkOrderDetail] Photo upload failed:", err);
      }
    },
    [uploadPhoto],
  );

  const handleDeletePhoto = useCallback(
    async (photoId: string) => {
      try {
        await deletePhoto(photoId);
      } catch (err) {
        console.error("[WorkOrderDetail] Photo delete failed:", err);
      }
    },
    [deletePhoto],
  );

  // Signature handlers
  const handleCustomerSignature = useCallback(
    (signature: SignatureData) => {
      setCustomerSignature({
        id: crypto.randomUUID(),
        workOrderId: id || "",
        type: "customer",
        signerName: signature.signerName,
        data: signature.data,
        timestamp: signature.timestamp,
        uploadStatus: "pending",
      });
    },
    [id],
  );

  const handleTechnicianSignature = useCallback(
    (signature: SignatureData) => {
      setTechnicianSignature({
        id: crypto.randomUUID(),
        workOrderId: id || "",
        type: "technician",
        signerName: signature.signerName,
        data: signature.data,
        timestamp: signature.timestamp,
        uploadStatus: "pending",
      });
    },
    [id],
  );

  // Notification handlers
  const handleSendNotification = useCallback(
    (type: "reminder" | "enroute" | "complete") => {
      // Would integrate with communication API
      // TODO: Integrate with notification/communication API
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted rounded w-1/4 mb-6" />
          <div className="h-64 bg-bg-muted rounded mb-4" />
          <div className="h-48 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">404</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Work Order Not Found
            </h2>
            <p className="text-text-secondary mb-4">
              The work order you're looking for doesn't exist or has been
              removed.
            </p>
            <Link to="/work-orders">
              <Button variant="secondary">Back to Work Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName =
    workOrder.customer_name ||
    (workOrder.customer
      ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
      : `Customer #${workOrder.customer_id}`);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/work-orders"
            className="text-text-secondary hover:text-text-primary"
          >
            &larr; Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-text-primary">
                Work Order
              </h1>
              <Badge
                variant={getStatusVariant(workOrder.status as WorkOrderStatus)}
              >
                {WORK_ORDER_STATUS_LABELS[
                  workOrder.status as WorkOrderStatus
                ] || workOrder.status}
              </Badge>
              <Badge
                variant={getPriorityVariant(workOrder.priority as Priority)}
              >
                {PRIORITY_LABELS[workOrder.priority as Priority] ||
                  workOrder.priority}
              </Badge>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {JOB_TYPE_LABELS[workOrder.job_type as JobType] ||
                workOrder.job_type}{" "}
              for {customerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabList>
          <TabTrigger value="overview">Overview</TabTrigger>
          <TabTrigger value="documentation">Documentation</TabTrigger>
          <TabTrigger value="communication">Communication</TabTrigger>
          <TabTrigger value="payment">Payment</TabTrigger>
          <TabTrigger value="history">History</TabTrigger>
        </TabList>

        {/* Overview Tab Content */}
        <TabContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-text-primary text-lg">
                        {customerName}
                      </p>
                      {workOrder.customer?.email && (
                        <a
                          href={"mailto:" + workOrder.customer.email}
                          className="text-text-link hover:underline block mt-1"
                        >
                          {workOrder.customer.email}
                        </a>
                      )}
                      {workOrder.customer?.phone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={"tel:" + workOrder.customer.phone}
                            className="text-text-link hover:underline"
                          >
                            {workOrder.customer.phone}
                          </a>
                          <DialButton
                            phoneNumber={workOrder.customer.phone}
                            customerId={workOrder.customer_id}
                          />
                        </div>
                      )}
                    </div>
                    <Link to={`/customers/${workOrder.customer_id}`}>
                      <Button variant="ghost" size="sm">
                        View Customer
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Service Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Location</CardTitle>
                </CardHeader>
                <CardContent>
                  {workOrder.service_address_line1 ? (
                    <div>
                      <p className="text-text-primary">
                        {workOrder.service_address_line1}
                      </p>
                      {workOrder.service_address_line2 && (
                        <p className="text-text-primary">
                          {workOrder.service_address_line2}
                        </p>
                      )}
                      <p className="text-text-secondary">
                        {[
                          workOrder.service_city,
                          workOrder.service_state,
                          workOrder.service_postal_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {workOrder.service_latitude &&
                        workOrder.service_longitude && (
                          <a
                            href={`https://maps.google.com/?q=${workOrder.service_latitude},${workOrder.service_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-link hover:underline text-sm mt-2 inline-block"
                          >
                            View on Google Maps
                          </a>
                        )}
                    </div>
                  ) : (
                    <p className="text-text-muted">
                      No service address specified
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {workOrder.notes ? (
                    <p className="text-text-secondary whitespace-pre-wrap">
                      {workOrder.notes}
                    </p>
                  ) : (
                    <p className="text-text-muted italic">No notes added</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button
                      variant="secondary"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => setActiveTab("documentation")}
                    >
                      <svg
                        className="w-6 h-6"
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
                      <span className="text-xs">Photos</span>
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => setActiveTab("communication")}
                    >
                      <svg
                        className="w-6 h-6"
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
                      <span className="text-xs">SMS</span>
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => setActiveTab("payment")}
                    >
                      <svg
                        className="w-6 h-6"
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
                      <span className="text-xs">Payment</span>
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => {
                        if (
                          workOrder.service_latitude &&
                          workOrder.service_longitude
                        ) {
                          window.open(
                            `https://maps.google.com/maps?daddr=${workOrder.service_latitude},${workOrder.service_longitude}`,
                            "_blank",
                          );
                        }
                      }}
                      disabled={
                        !workOrder.service_latitude ||
                        !workOrder.service_longitude
                      }
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      <span className="text-xs">Navigate</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Completion Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle>Completion Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {photos.some(
                          (p) => p.metadata.photoType === "before",
                        ) ? (
                          <svg
                            className="w-5 h-5 text-success"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-text-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          </svg>
                        )}
                        <span
                          className={
                            photos.some(
                              (p) => p.metadata.photoType === "before",
                            )
                              ? "text-text-muted line-through"
                              : ""
                          }
                        >
                          Before photo
                        </span>
                      </div>
                      <Badge
                        variant={
                          photos.some((p) => p.metadata.photoType === "before")
                            ? "success"
                            : "default"
                        }
                      >
                        {photos.some((p) => p.metadata.photoType === "before")
                          ? "Done"
                          : "Required"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {photos.some(
                          (p) => p.metadata.photoType === "after",
                        ) ? (
                          <svg
                            className="w-5 h-5 text-success"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-text-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          </svg>
                        )}
                        <span
                          className={
                            photos.some((p) => p.metadata.photoType === "after")
                              ? "text-text-muted line-through"
                              : ""
                          }
                        >
                          After photo
                        </span>
                      </div>
                      <Badge
                        variant={
                          photos.some((p) => p.metadata.photoType === "after")
                            ? "success"
                            : "default"
                        }
                      >
                        {photos.some((p) => p.metadata.photoType === "after")
                          ? "Done"
                          : "Required"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {customerSignature ? (
                          <svg
                            className="w-5 h-5 text-success"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-text-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          </svg>
                        )}
                        <span
                          className={
                            customerSignature
                              ? "text-text-muted line-through"
                              : ""
                          }
                        >
                          Customer signature
                        </span>
                      </div>
                      <Badge
                        variant={customerSignature ? "success" : "default"}
                      >
                        {customerSignature ? "Done" : "Required"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {technicianSignature ? (
                          <svg
                            className="w-5 h-5 text-success"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-text-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          </svg>
                        )}
                        <span
                          className={
                            technicianSignature
                              ? "text-text-muted line-through"
                              : ""
                          }
                        >
                          Tech signature
                        </span>
                      </div>
                      <Badge
                        variant={technicianSignature ? "success" : "default"}
                      >
                        {technicianSignature ? "Done" : "Required"}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-text-secondary">Completion</span>
                      <span className="font-medium">
                        {
                          [
                            photos.some(
                              (p) => p.metadata.photoType === "before",
                            ),
                            photos.some(
                              (p) => p.metadata.photoType === "after",
                            ),
                            !!customerSignature,
                            !!technicianSignature,
                          ].filter(Boolean).length
                        }
                        /4
                      </span>
                    </div>
                    <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success transition-all duration-300"
                        style={{
                          width: `${
                            ([
                              photos.some(
                                (p) => p.metadata.photoType === "before",
                              ),
                              photos.some(
                                (p) => p.metadata.photoType === "after",
                              ),
                              !!customerSignature,
                              !!technicianSignature,
                            ].filter(Boolean).length /
                              4) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mini Map Preview (if GPS coords available) */}
              {workOrder.service_latitude && workOrder.service_longitude && (
                <Card>
                  <CardHeader>
                    <CardTitle>Location</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <a
                      href={`https://maps.google.com/?q=${workOrder.service_latitude},${workOrder.service_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${workOrder.service_latitude},${workOrder.service_longitude}&zoom=15&size=600x200&markers=color:red%7C${workOrder.service_latitude},${workOrder.service_longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`}
                        alt="Service location map"
                        className="w-full h-[200px] object-cover rounded-b-lg"
                        onError={(e) => {
                          // Hide the card if map fails to load
                          (
                            e.target as HTMLImageElement
                          ).parentElement?.parentElement?.parentElement?.classList.add(
                            "hidden",
                          );
                        }}
                      />
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Quick Info */}
            <div className="space-y-6">
              {/* Status Workflow */}
              <StatusWorkflow
                workOrderId={workOrder.id}
                currentStatus={workOrder.status as WorkOrderStatus}
              />

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle>Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-text-muted">Date</dt>
                      <dd className="text-text-primary font-medium">
                        {workOrder.scheduled_date
                          ? formatDate(workOrder.scheduled_date)
                          : "Not scheduled"}
                      </dd>
                    </div>
                    {(workOrder.time_window_start ||
                      workOrder.time_window_end) && (
                      <div>
                        <dt className="text-sm text-text-muted">Time Window</dt>
                        <dd className="text-text-primary">
                          {workOrder.time_window_start?.slice(0, 5) || "?"}
                          {" - "}
                          {workOrder.time_window_end?.slice(0, 5) || "?"}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm text-text-muted">Duration</dt>
                      <dd className="text-text-primary">
                        {workOrder.estimated_duration_hours
                          ? `${workOrder.estimated_duration_hours} hours`
                          : "-"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle>Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-text-muted">Technician</dt>
                      <dd className="text-text-primary font-medium">
                        {workOrder.assigned_technician || "Unassigned"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-muted">Vehicle</dt>
                      <dd className="text-text-primary">
                        {workOrder.assigned_vehicle || "-"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Job Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-text-muted">Job Type</dt>
                      <dd>
                        <Badge variant="default">
                          {JOB_TYPE_LABELS[workOrder.job_type as JobType] ||
                            workOrder.job_type}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-muted">Priority</dt>
                      <dd>
                        <Badge
                          variant={getPriorityVariant(
                            workOrder.priority as Priority,
                          )}
                        >
                          {PRIORITY_LABELS[workOrder.priority as Priority] ||
                            workOrder.priority}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-muted">Status</dt>
                      <dd>
                        <Badge
                          variant={getStatusVariant(
                            workOrder.status as WorkOrderStatus,
                          )}
                        >
                          {WORK_ORDER_STATUS_LABELS[
                            workOrder.status as WorkOrderStatus
                          ] || workOrder.status}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Record Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-text-muted">Work Order ID</dt>
                      <dd className="text-text-primary font-mono text-xs break-all">
                        {workOrder.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-muted">Created</dt>
                      <dd className="text-text-primary">
                        {workOrder.created_at
                          ? formatDate(workOrder.created_at)
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-muted">Last Updated</dt>
                      <dd className="text-text-primary">
                        {workOrder.updated_at
                          ? formatDate(workOrder.updated_at)
                          : "-"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabContent>

        {/* Documentation Tab Content */}
        <TabContent value="documentation">
          <div className="space-y-8">
            {/* Photo Capture Dialog */}
            {isCapturingPhoto && (
              <Dialog
                open={isCapturingPhoto}
                onClose={() => setIsCapturingPhoto(false)}
              >
                <DialogContent size="lg">
                  <DialogHeader onClose={() => setIsCapturingPhoto(false)}>
                    Capture Photo
                  </DialogHeader>
                  <DialogBody className="p-0">
                    <PhotoCapture
                      workOrderId={id || ""}
                      photoType={capturePhotoType}
                      onCapture={handlePhotoCapture}
                      onCancel={() => setIsCapturingPhoto(false)}
                    />
                  </DialogBody>
                </DialogContent>
              </Dialog>
            )}

            {/* Required Photos Section */}
            <Card>
              <CardHeader>
                <CardTitle>Required Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(["before", "after", "lid", "tank"] as PhotoType[]).map(
                    (type) => {
                      const hasPhoto = photos.some(
                        (p) => p.metadata.photoType === type,
                      );
                      return (
                        <button
                          key={type}
                          onClick={() => handleStartPhotoCapture(type)}
                          className={`
                          p-4 rounded-lg border-2 border-dashed text-center transition-colors
                          ${
                            hasPhoto
                              ? "border-success bg-success/10 text-success"
                              : "border-border hover:border-primary hover:bg-bg-hover"
                          }
                        `}
                        >
                          {hasPhoto ? (
                            <svg
                              className="w-8 h-8 mx-auto mb-2"
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
                              className="w-8 h-8 mx-auto mb-2 text-text-muted"
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
                          )}
                          <span className="text-sm font-medium capitalize">
                            {type}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStartPhotoCapture("other")}
                  >
                    Add Additional Photo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Photo Gallery */}
            {photos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Photo Gallery ({photos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhotoGallery
                    photos={photos}
                    onDelete={handleDeletePhoto}
                    editable
                  />
                </CardContent>
              </Card>
            )}

            {/* Signatures Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Signature */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Signature</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerSignature ? (
                    <SignaturePairDisplay
                      customerSignature={customerSignature}
                    />
                  ) : (
                    <SignatureCapture
                      type="customer"
                      onSave={handleCustomerSignature}
                      signerName={customerName}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Technician Signature */}
              <Card>
                <CardHeader>
                  <CardTitle>Technician Signature</CardTitle>
                </CardHeader>
                <CardContent>
                  {technicianSignature ? (
                    <SignaturePairDisplay
                      technicianSignature={technicianSignature}
                    />
                  ) : (
                    <SignatureCapture
                      type="technician"
                      onSave={handleTechnicianSignature}
                      signerName={workOrder.assigned_technician || ""}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabContent>

        {/* Communication Tab Content */}
        <TabContent value="communication">
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => handleSendNotification("reminder")}
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
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    Send Reminder
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleSendNotification("enroute")}
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Tech En Route
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleSendNotification("complete")}
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Service Complete
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Twilio SMS Panel */}
            <TwilioSMSPanel
              customerId={workOrder.customer_id}
              customerName={customerName}
              customerPhone={workOrder.customer?.phone || undefined}
              workOrderId={id}
            />

            {/* SMS Conversation History */}
            <Card>
              <CardHeader>
                <CardTitle>SMS Conversation History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SMSConversation
                  customerId={workOrder.customer_id}
                  workOrderId={id}
                  customerName={customerName}
                  customerPhone={workOrder.customer?.phone || undefined}
                />
              </CardContent>
            </Card>

            {/* Notification History */}
            <Card>
              <CardHeader>
                <CardTitle>Notification History</CardTitle>
              </CardHeader>
              <CardContent>
                <NotificationCenter
                  workOrderId={id}
                  customerId={workOrder.customer_id}
                />
              </CardContent>
            </Card>
          </div>
        </TabContent>

        {/* Payment Tab Content */}
        <TabContent value="payment">
          <div className="space-y-6">
            {/* Invoice Generator */}
            <InvoiceGenerator
              customer={
                {
                  id: workOrder.customer_id,
                  firstName: workOrder.customer?.first_name || "",
                  lastName: workOrder.customer?.last_name || "",
                  email: workOrder.customer?.email || undefined,
                  phone: workOrder.customer?.phone || undefined,
                  address: workOrder.service_address_line1
                    ? {
                        line1: workOrder.service_address_line1,
                        line2: workOrder.service_address_line2 || undefined,
                        city: workOrder.service_city || "",
                        state: workOrder.service_state || "TX",
                        postalCode: workOrder.service_postal_code || "",
                      }
                    : undefined,
                } as CustomerInfo
              }
              workOrder={
                {
                  id: workOrder.id,
                  jobType: workOrder.job_type,
                  scheduledDate: workOrder.scheduled_date || undefined,
                  status: workOrder.status,
                } as WorkOrderReference
              }
              onInvoiceCreated={(_invoiceId) => {
                // TODO: Handle post-invoice-creation logic (e.g., refresh work order)
              }}
            />

            {/* Payment Processor */}
            <PaymentProcessor
              workOrderId={workOrder.id}
              amount={0} // Would come from invoice totals
              customerName={customerName}
              onSuccess={(_transactionId) => {
                // TODO: Handle post-payment logic (e.g., update work order status)
              }}
            />
          </div>
        </TabContent>

        {/* History Tab Content */}
        <TabContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkOrderTimeline
                activities={activityLog}
                showUserNames
                collapsible
                initialVisibleCount={10}
              />
            </CardContent>
          </Card>
        </TabContent>
      </Tabs>

      {/* Edit Modal */}
      <WorkOrderForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        workOrder={workOrder}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setIsDeleteOpen(false)}>
            Delete Work Order
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete this work order for{" "}
              <span className="font-medium text-text-primary">
                {customerName}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
