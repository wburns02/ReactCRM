import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PhotoCapture } from "./PhotoCapture";
import type { PhotoData } from "./PhotoCapture";
import { CustomerSignaturePad, TechnicianSignaturePad } from "./SignaturePad";
import { LocationCapture } from "./LocationCapture";
import type { LocationData } from "./LocationCapture";
import { InlineOfflineStatus } from "./OfflineIndicator";
import { formatDate } from "@/lib/utils";
import type { WorkOrder } from "@/api/types/workOrder";
import { JOB_TYPE_LABELS } from "@/api/types/workOrder";

/**
 * Work order field data collected on mobile
 */
export interface MobileWorkOrderData {
  work_order_id: string;
  before_photos: PhotoData[];
  after_photos: PhotoData[];
  manifest_photos: PhotoData[];
  customer_signature?: string;
  technician_signature?: string;
  arrival_location?: LocationData;
  completion_location?: LocationData;
  arrival_time?: string;
  completion_time?: string;
  notes?: string;
}

/**
 * Workflow steps
 */
type WorkflowStep =
  | "overview"
  | "navigate"
  | "arrive"
  | "before_photos"
  | "work"
  | "after_photos"
  | "customer_signature"
  | "technician_signature"
  | "complete";

interface MobileWorkOrderViewProps {
  workOrder: WorkOrder;
  onComplete: (data: MobileWorkOrderData) => void;
  onCancel?: () => void;
}

/**
 * Mobile work order view with step-by-step workflow
 * Optimized for field technicians
 */
export function MobileWorkOrderView({
  workOrder,
  onComplete,
  onCancel,
}: MobileWorkOrderViewProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("overview");
  const [data, setData] = useState<MobileWorkOrderData>({
    work_order_id: workOrder.id,
    before_photos: [],
    after_photos: [],
    manifest_photos: [],
  });

  /**
   * Get progress percentage
   */
  const getProgress = (): number => {
    const steps: WorkflowStep[] = [
      "overview",
      "navigate",
      "arrive",
      "before_photos",
      "work",
      "after_photos",
      "customer_signature",
      "technician_signature",
      "complete",
    ];
    const currentIndex = steps.indexOf(currentStep);
    return Math.round((currentIndex / (steps.length - 1)) * 100);
  };

  /**
   * Navigate to next step
   */
  const nextStep = () => {
    const stepFlow: Record<WorkflowStep, WorkflowStep> = {
      overview: "navigate",
      navigate: "arrive",
      arrive: "before_photos",
      before_photos: "work",
      work: "after_photos",
      after_photos: "customer_signature",
      customer_signature: "technician_signature",
      technician_signature: "complete",
      complete: "complete",
    };
    setCurrentStep(stepFlow[currentStep]);
  };

  /**
   * Navigate to previous step
   */
  const prevStep = () => {
    const stepFlow: Record<WorkflowStep, WorkflowStep> = {
      overview: "overview",
      navigate: "overview",
      arrive: "navigate",
      before_photos: "arrive",
      work: "before_photos",
      after_photos: "work",
      customer_signature: "after_photos",
      technician_signature: "customer_signature",
      complete: "technician_signature",
    };
    setCurrentStep(stepFlow[currentStep]);
  };

  /**
   * Skip optional step
   */
  const skipStep = () => {
    nextStep();
  };

  /**
   * Complete workflow
   */
  const handleComplete = () => {
    onComplete(data);
  };

  /**
   * Render current step
   */
  const renderStep = () => {
    switch (currentStep) {
      case "overview":
        return (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">
                    {workOrder.customer_name ||
                      (workOrder.customer
                        ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
                        : `Customer #${workOrder.customer_id}`)}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Work Order #{workOrder.id}
                  </p>
                </div>
                <Badge variant="default">
                  {
                    JOB_TYPE_LABELS[
                      workOrder.job_type as keyof typeof JOB_TYPE_LABELS
                    ]
                  }
                </Badge>
              </div>

              {workOrder.scheduled_date && (
                <div className="text-sm">
                  <span className="text-text-secondary">Scheduled:</span>
                  <span className="ml-2 text-text-primary font-medium">
                    {formatDate(workOrder.scheduled_date)}
                  </span>
                  {workOrder.time_window_start && (
                    <span className="ml-1 text-text-secondary">
                      {workOrder.time_window_start.slice(0, 5)}
                      {workOrder.time_window_end &&
                        ` - ${workOrder.time_window_end.slice(0, 5)}`}
                    </span>
                  )}
                </div>
              )}

              {(workOrder.service_address_line1 || workOrder.service_city) && (
                <div className="text-sm text-text-secondary">
                  <div>{workOrder.service_address_line1}</div>
                  {workOrder.service_address_line2 && (
                    <div>{workOrder.service_address_line2}</div>
                  )}
                  <div>
                    {workOrder.service_city}
                    {workOrder.service_state && `, ${workOrder.service_state}`}
                    {workOrder.service_postal_code &&
                      ` ${workOrder.service_postal_code}`}
                  </div>
                </div>
              )}

              {workOrder.notes && (
                <div className="text-sm">
                  <div className="text-text-secondary font-medium mb-1">
                    Notes:
                  </div>
                  <div className="text-text-primary bg-bg-muted rounded p-2">
                    {workOrder.notes}
                  </div>
                </div>
              )}
            </Card>

            <InlineOfflineStatus />

            <Button
              variant="primary"
              onClick={nextStep}
              className="w-full h-12 text-lg"
            >
              Start Work Order
            </Button>
          </div>
        );

      case "navigate":
        return (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-lg font-medium text-text-primary">
                Navigate to Location
              </h3>
              {workOrder.service_latitude && workOrder.service_longitude ? (
                <div className="space-y-3">
                  <p className="text-text-secondary text-sm">
                    Use GPS navigation to reach the work site
                  </p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${workOrder.service_latitude},${workOrder.service_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="primary" className="w-full h-12 text-lg">
                      🗺️ Open in Google Maps
                    </Button>
                  </a>
                  {(workOrder.service_address_line1 ||
                    workOrder.service_city) && (
                    <div className="text-sm text-text-secondary bg-bg-muted rounded p-3">
                      <div>{workOrder.service_address_line1}</div>
                      {workOrder.service_address_line2 && (
                        <div>{workOrder.service_address_line2}</div>
                      )}
                      <div>
                        {workOrder.service_city}
                        {workOrder.service_state &&
                          `, ${workOrder.service_state}`}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">
                    No GPS coordinates available for this location
                  </p>
                  {(workOrder.service_address_line1 ||
                    workOrder.service_city) && (
                    <div className="text-sm text-text-secondary bg-bg-muted rounded p-3 mb-4">
                      <div>{workOrder.service_address_line1}</div>
                      {workOrder.service_address_line2 && (
                        <div>{workOrder.service_address_line2}</div>
                      )}
                      <div>
                        {workOrder.service_city}
                        {workOrder.service_state &&
                          `, ${workOrder.service_state}`}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button variant="primary" onClick={nextStep} className="flex-1">
                I've Arrived
              </Button>
            </div>
          </div>
        );

      case "arrive":
        return (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-lg font-medium text-text-primary mb-3">
                Mark Arrival
              </h3>
              <LocationCapture
                onCapture={(location) => {
                  setData((prev) => ({
                    ...prev,
                    arrival_location: location,
                    arrival_time: new Date().toISOString(),
                  }));
                  nextStep();
                }}
                onCancel={prevStep}
                autoCapture
              />
            </Card>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button variant="ghost" onClick={skipStep} className="flex-1">
                Skip Location
              </Button>
            </div>
          </div>
        );

      case "before_photos":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">
              Before Photos
            </h3>
            <p className="text-sm text-text-secondary">
              Take photos of the work site before starting (recommended)
            </p>

            {data.before_photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {data.before_photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden"
                  >
                    <img
                      src={photo.image_data}
                      alt={`Before photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          before_photos: prev.before_photos.filter(
                            (_, i) => i !== index,
                          ),
                        }));
                      }}
                      className="absolute top-2 right-2 bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <PhotoCapture
              type="before"
              onCapture={(photo) => {
                setData((prev) => ({
                  ...prev,
                  before_photos: [...prev.before_photos, photo],
                }));
              }}
            />

            <div className="flex gap-2">
              <Button variant="secondary" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button variant="primary" onClick={nextStep} className="flex-1">
                {data.before_photos.length > 0 ? "Continue" : "Skip Photos"}
              </Button>
            </div>
          </div>
        );

      case "work":
        return (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-lg font-medium text-text-primary">
                Complete Work
              </h3>
              <p className="text-text-secondary">
                Perform the service and complete any required tasks
              </p>

              <div className="bg-bg-muted rounded-lg p-3 text-sm">
                <div className="font-medium text-text-primary mb-2">
                  Service Type:
                </div>
                <div className="text-text-secondary">
                  {
                    JOB_TYPE_LABELS[
                      workOrder.job_type as keyof typeof JOB_TYPE_LABELS
                    ]
                  }
                </div>
              </div>

              {workOrder.notes && (
                <div className="bg-bg-muted rounded-lg p-3 text-sm">
                  <div className="font-medium text-text-primary mb-2">
                    Notes:
                  </div>
                  <div className="text-text-secondary">{workOrder.notes}</div>
                </div>
              )}

              <textarea
                placeholder="Add work notes (optional)..."
                className="w-full min-h-[100px] px-3 py-2 border border-border rounded-md text-sm"
                value={data.notes || ""}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </Card>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button variant="primary" onClick={nextStep} className="flex-1">
                Work Complete
              </Button>
            </div>
          </div>
        );

      case "after_photos":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">
              After Photos
            </h3>
            <p className="text-sm text-text-secondary">
              Take photos of the completed work (recommended)
            </p>

            {data.after_photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {data.after_photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden"
                  >
                    <img
                      src={photo.image_data}
                      alt={`After photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          after_photos: prev.after_photos.filter(
                            (_, i) => i !== index,
                          ),
                        }));
                      }}
                      className="absolute top-2 right-2 bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <PhotoCapture
              type="after"
              onCapture={(photo) => {
                setData((prev) => ({
                  ...prev,
                  after_photos: [...prev.after_photos, photo],
                }));
              }}
            />

            <div className="flex gap-2">
              <Button variant="secondary" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button variant="primary" onClick={nextStep} className="flex-1">
                {data.after_photos.length > 0 ? "Continue" : "Skip Photos"}
              </Button>
            </div>
          </div>
        );

      case "customer_signature":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">
              Customer Signature
            </h3>
            <p className="text-sm text-text-secondary">
              Get customer signature to confirm work completion
            </p>

            {data.customer_signature ? (
              <div className="space-y-3">
                <div className="border-2 border-border rounded-lg p-2 bg-white">
                  <img
                    src={data.customer_signature}
                    alt="Customer signature"
                    className="w-full"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      customer_signature: undefined,
                    }))
                  }
                  className="w-full"
                >
                  Clear Signature
                </Button>
              </div>
            ) : (
              <CustomerSignaturePad
                onSave={(signature) => {
                  setData((prev) => ({
                    ...prev,
                    customer_signature: signature,
                  }));
                }}
              />
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button
                variant="primary"
                onClick={nextStep}
                disabled={!data.customer_signature}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case "technician_signature":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-text-primary">
              Technician Signature
            </h3>
            <p className="text-sm text-text-secondary">
              Sign to confirm work completion
            </p>

            {data.technician_signature ? (
              <div className="space-y-3">
                <div className="border-2 border-border rounded-lg p-2 bg-white">
                  <img
                    src={data.technician_signature}
                    alt="Technician signature"
                    className="w-full"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      technician_signature: undefined,
                    }))
                  }
                  className="w-full"
                >
                  Clear Signature
                </Button>
              </div>
            ) : (
              <TechnicianSignaturePad
                onSave={(signature) => {
                  setData((prev) => ({
                    ...prev,
                    technician_signature: signature,
                    completion_time: new Date().toISOString(),
                  }));
                }}
              />
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button
                variant="primary"
                onClick={nextStep}
                disabled={!data.technician_signature}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-medium text-text-primary mb-2">
                  Work Order Complete
                </h3>
                <p className="text-text-secondary">
                  Review the information below and submit
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Before Photos:</span>
                  <span className="font-medium">
                    {data.before_photos.length}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">After Photos:</span>
                  <span className="font-medium">
                    {data.after_photos.length}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">
                    Customer Signature:
                  </span>
                  <span className="font-medium">
                    {data.customer_signature ? "✓" : "✗"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">
                    Technician Signature:
                  </span>
                  <span className="font-medium">
                    {data.technician_signature ? "✓" : "✗"}
                  </span>
                </div>
                {data.notes && (
                  <div className="py-2">
                    <div className="text-text-secondary mb-1">Notes:</div>
                    <div className="bg-bg-muted rounded p-2">{data.notes}</div>
                  </div>
                )}
              </div>
            </Card>

            <InlineOfflineStatus />

            <div className="flex gap-2">
              <Button variant="secondary" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleComplete}
                className="flex-1 h-12 text-lg"
              >
                Submit Work Order
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg-body pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-text-primary">
              Work Order #{workOrder.id}
            </h2>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>
                Step {getProgress() === 0 ? 1 : Math.ceil(getProgress() / 12.5)}
                /8
              </span>
              <span>{getProgress()}%</span>
            </div>
            <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">{renderStep()}</div>
    </div>
  );
}
