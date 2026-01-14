import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toastError } from "@/components/ui/Toast";
import {
  useCreateServiceRequest,
  usePortalCustomer,
} from "@/api/hooks/usePortal";
import type { ServiceRequest } from "@/api/types/portal";

/**
 * Customer Portal - Request Service Page
 * Allows customers to submit new service requests
 */
export function PortalRequestServicePage() {
  const navigate = useNavigate();
  const { data: customer } = usePortalCustomer();
  const createRequest = useCreateServiceRequest();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ServiceRequest>({
    defaultValues: {
      service_type: "pumping",
      preferred_time: "morning",
      urgent: false,
      description: "",
    },
  });

  const isUrgent = watch("urgent");

  const onSubmit = async (data: ServiceRequest) => {
    try {
      await createRequest.mutateAsync(data);
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit request:", error);
      toastError("Failed to submit request. Please try again or call us.");
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Service Request Submitted!
            </h2>
            <p className="text-text-secondary mb-6">
              We've received your request and will contact you within 1 business
              day to confirm your appointment.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/portal")}>
                Back to Dashboard
              </Button>
              <Button variant="secondary" onClick={() => setSubmitted(false)}>
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Request Service</CardTitle>
          <CardDescription>
            Fill out the form below to request a service appointment. We'll
            contact you to confirm the details.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Service Type *
              </label>
              <select
                {...register("service_type", {
                  required: "Please select a service type",
                })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="pumping">Septic Tank Pumping</option>
                <option value="inspection">Septic Inspection</option>
                <option value="repair">Septic System Repair</option>
                <option value="installation">New System Installation</option>
                <option value="grease_trap">Grease Trap Cleaning</option>
                <option value="emergency">Emergency Service</option>
                <option value="other">Other</option>
              </select>
              {errors.service_type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.service_type.message}
                </p>
              )}
            </div>

            {/* Preferred Date */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Preferred Date
              </label>
              <Input
                type="date"
                {...register("preferred_date")}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-text-muted mt-1">
                We'll do our best to accommodate your preferred date
              </p>
            </div>

            {/* Preferred Time */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Preferred Time Window
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="morning"
                    {...register("preferred_time")}
                    className="text-primary"
                  />
                  <span className="text-sm">Morning (8am-12pm)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="afternoon"
                    {...register("preferred_time")}
                    className="text-primary"
                  />
                  <span className="text-sm">Afternoon (12pm-5pm)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="evening"
                    {...register("preferred_time")}
                    className="text-primary"
                  />
                  <span className="text-sm">Evening (5pm-8pm)</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description *
              </label>
              <textarea
                {...register("description", {
                  required: "Please describe the service you need",
                  minLength: {
                    value: 10,
                    message: "Please provide more details",
                  },
                })}
                rows={4}
                placeholder="Please describe the service you need, including any symptoms or issues you've noticed..."
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Urgent Toggle */}
            <div
              className={`p-4 rounded-lg border ${isUrgent ? "border-red-300 bg-red-50" : "border-border bg-surface-hover"}`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("urgent")}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-text-primary">
                    This is urgent / emergency
                  </span>
                  <p className="text-sm text-text-secondary mt-1">
                    {isUrgent
                      ? "⚠️ Emergency fee may apply. We will prioritize your request."
                      : "Check this if you need immediate assistance (backup, overflow, etc.)"}
                  </p>
                </div>
              </label>
            </div>

            {/* Service Address */}
            {customer && (
              <div className="p-4 rounded-lg bg-surface-hover">
                <p className="text-sm font-medium text-text-primary mb-1">
                  Service Address
                </p>
                <p className="text-sm text-text-secondary">
                  {customer.address}
                  <br />
                  {customer.city}, {customer.state} {customer.zip}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  Need service at a different address? Please mention it in the
                  description.
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={createRequest.isPending}
              >
                {createRequest.isPending ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/portal")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card className="mt-6 bg-red-50 border-red-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🚨</span>
            <div>
              <p className="font-medium text-red-800">
                For immediate emergencies:
              </p>
              <a
                href="tel:+15125550123"
                className="text-red-700 font-bold text-lg hover:underline"
              >
                Call (512) 555-0123
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
