import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLeadSubmit } from "../hooks/useLeadSubmit";
import { AvailabilityPicker } from "./AvailabilityPicker";
import {
  leadFormSchema,
  SERVICE_OPTIONS,
  type UTMParams,
  type LeadSubmitData,
  type TimeSlot,
} from "../types/lead";

// Form input types (match the schema)
interface FormInputs {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  service_type:
    | "pumping"
    | "inspection"
    | "repair"
    | "installation"
    | "emergency"
    | "other";
  preferred_date?: string;
  preferred_time_slot?: TimeSlot;
  is_asap?: boolean;
  address?: string;
  message?: string;
  sms_consent?: boolean;
}

interface LeadCaptureFormProps {
  utmParams: UTMParams;
}

export function LeadCaptureForm({ utmParams }: LeadCaptureFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormInputs>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      preferred_date: undefined,
      preferred_time_slot: undefined,
      is_asap: false,
      address: "",
      message: "",
      sms_consent: false,
    },
  });

  // Watch for form state changes
  const selectedDate = watch("preferred_date");
  const selectedTimeSlot = watch("preferred_time_slot");
  const isAsap = watch("is_asap") ?? false;
  const serviceType = watch("service_type");

  const { mutate: submitLead, isPending, isSuccess, isError } = useLeadSubmit();

  const onSubmit: SubmitHandler<FormInputs> = (data) => {
    const submitData: LeadSubmitData = {
      ...data,
      ...utmParams,
      landing_page: "/home",
      lead_source: "website",
      prospect_stage: "new_lead",
    };
    submitLead(submitData, {
      onSuccess: () => {
        reset();
      },
    });
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
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
        </div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">Thank You!</h3>
        <p className="text-green-700 mb-4">
          We've received your request. A team member will contact you within 1
          business hour.
        </p>
        <p className="text-sm text-green-600">
          Need immediate assistance? Call us at{" "}
          <a href="tel:+19365641440" className="font-bold underline">
            (936) 564-1440
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("first_name")}
            type="text"
            placeholder="John"
            autoComplete="given-name"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
              errors.first_name ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.first_name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.first_name.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("last_name")}
            type="text"
            placeholder="Smith"
            autoComplete="family-name"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
              errors.last_name ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.last_name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.last_name.message}
            </p>
          )}
        </div>
      </div>

      {/* Contact fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            {...register("phone")}
            type="tel"
            placeholder="(555) 123-4567"
            autoComplete="tel"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
              errors.phone ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="john@example.com"
            autoComplete="email"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Service type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Service Needed <span className="text-red-500">*</span>
        </label>
        <select
          {...register("service_type")}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white ${
            errors.service_type ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select a service...</option>
          {SERVICE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.service_type && (
          <p className="text-red-500 text-sm mt-1">
            {errors.service_type.message}
          </p>
        )}
      </div>

      {/* Availability Picker - Date & Time Selection */}
      <AvailabilityPicker
        selectedDate={selectedDate}
        selectedTimeSlot={selectedTimeSlot}
        isAsap={isAsap}
        onDateChange={(date) => setValue("preferred_date", date)}
        onTimeSlotChange={(slot) => setValue("preferred_time_slot", slot)}
        onAsapChange={(asap) => setValue("is_asap", asap)}
        serviceType={serviceType}
      />

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Service Address{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          {...register("address")}
          type="text"
          placeholder="123 Main St, City, TX"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Additional Details{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          {...register("message")}
          rows={3}
          placeholder="Tell us more about your septic needs..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* SMS Consent */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          {...register("sms_consent")}
          id="sms_consent"
          className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <label
          htmlFor="sms_consent"
          className="text-sm text-gray-600 leading-tight"
        >
          I agree to receive SMS updates about my service request. Message and
          data rates may apply. Reply STOP to opt out.
        </label>
      </div>

      {/* Error message */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 text-sm">
            Something went wrong. Please try again or call us directly at{" "}
            <a href="tel:+19365641440" className="font-bold underline">
              (936) 564-1440
            </a>
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-cta hover:bg-cta-hover text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Submitting...
          </span>
        ) : (
          "Get My Free Quote"
        )}
      </button>

      {/* Privacy note */}
      <p className="text-xs text-gray-500 text-center">
        By submitting, you agree to our{" "}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        . We never share your information.
      </p>
    </form>
  );
}
