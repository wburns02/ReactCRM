import { useState, useCallback, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PricingCard } from "./PricingCard";
import { AvailabilityPicker } from "./AvailabilityPicker";
import {
  useCreateBooking,
  formatBookingDate,
  formatTimeSlot,
  type BookingCreateData,
} from "../hooks/useBooking";
import type { TimeSlot } from "../types/lead";
import { toastWarning } from "@/components/ui/Toast";

const API_URL = import.meta.env.VITE_API_URL || "https://react-crm-api-production.up.railway.app/api/v2";

interface TankEstimate {
  estimated_gallons: number;
  confidence: string;
  source: string;
  message: string;
  overage_gallons: number;
  estimated_overage_cost: number;
  estimated_total: number;
  address_matched?: string;
  county?: string;
  sqft?: number;
}

const bookingSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z
    .union([z.string().email("Please enter a valid email"), z.literal("")])
    .optional(),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[\d\s\-()]+$/, "Please enter a valid phone number"),
  service_address: z.string().optional(),
  overage_acknowledged: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge the overage pricing policy",
  }),
  sms_consent: z.boolean().optional(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface NashvilleBookingFormProps {
  testMode?: boolean;
}

export function NashvilleBookingForm({ testMode = true }: NashvilleBookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | undefined>();
  const [isAsap, setIsAsap] = useState(false);

  // Tank size estimation
  const [tankEstimate, setTankEstimate] = useState<TankEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchTankEstimate = useCallback((address: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!address || address.length < 5) {
      setTankEstimate(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setEstimateLoading(true);
      try {
        const resp = await fetch(
          `${API_URL}/properties/estimate-tank?address=${encodeURIComponent(address)}`
        );
        if (resp.ok) {
          const data: TankEstimate = await resp.json();
          setTankEstimate(data);
        }
      } catch {
        // Silently fail — estimate is a nice-to-have
      } finally {
        setEstimateLoading(false);
      }
    }, 600);
  }, []);

  const {
    mutate: createBooking,
    isPending,
    isSuccess,
    isError,
    error,
    data: bookingResult,
  } = useCreateBooking();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      service_address: "",
      overage_acknowledged: false,
      sms_consent: false,
      notes: "",
    },
  });

  const onSubmit: SubmitHandler<BookingFormData> = (data) => {
    if (!selectedDate && !isAsap) {
      toastWarning("Date Required", "Please select a date for your service.");
      return;
    }

    const serviceDate = isAsap
      ? new Date(Date.now() + 86400000).toISOString().split("T")[0]
      : selectedDate!;

    const bookingData: BookingCreateData = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || undefined,
      phone: data.phone,
      service_address: data.service_address || undefined,
      service_type: "pumping",
      scheduled_date: serviceDate,
      time_slot: isAsap ? "morning" : selectedTimeSlot,
      overage_acknowledged: data.overage_acknowledged,
      sms_consent: data.sms_consent ?? false,
      notes: `[Nashville] ${isAsap ? "ASAP/Emergency Request. " : ""}${data.notes || ""}`.trim(),
      test_mode: testMode,
    };

    createBooking(bookingData, {
      onSuccess: () => {
        reset();
        setSelectedDate(undefined);
        setSelectedTimeSlot(undefined);
        setIsAsap(false);
      },
    });
  };

  // Success state
  if (isSuccess && bookingResult) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center" role="status">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h3>
        <p className="text-green-700 mb-4">
          Your septic tank pumping service has been scheduled.
        </p>
        <div className="bg-white rounded-lg p-4 text-left mb-4 max-w-md mx-auto">
          <div className="space-y-2 text-sm">
            <p><strong>Confirmation #:</strong> {bookingResult.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> {formatBookingDate(bookingResult.scheduled_date)}</p>
            {bookingResult.time_slot && (
              <p><strong>Time:</strong> {formatTimeSlot(bookingResult.time_slot)}</p>
            )}
            <p><strong>Service:</strong> Septic Tank Pumping</p>
            <p><strong>Amount:</strong> $625 (due at time of service)</p>
            {bookingResult.is_test && (
              <p className="text-orange-600 font-medium">(Test booking)</p>
            )}
          </div>
        </div>
        <p className="text-sm text-green-600">
          A confirmation has been sent to your phone.
          {bookingResult.customer_email && " Check your email for details."}
        </p>
        <p className="text-sm text-gray-500 mt-2">Payment will be collected at the time of service.</p>
        <p className="text-sm text-gray-600 mt-4">
          Questions? Call us at{" "}
          <a href="tel:+16155550175" className="font-bold text-primary underline">
            (615) 555-0175
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Nashville Pricing Card */}
      <PricingCard
        basePrice={625}
        includedGallons={1000}
        overageRate={0.45}
        serviceName="Septic Tank Pumping"
      />

      {/* No payment badge */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 text-center">
        <strong>No payment required to book.</strong> Payment collected at time of service.
      </div>

      {testMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
          <strong>Test Mode:</strong> This is for testing the booking flow.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Name fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nash-first-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("first_name")}
              id="nash-first-name"
              type="text"
              placeholder="John"
              autoComplete="given-name"
              aria-required="true"
              aria-invalid={!!errors.first_name}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.first_name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.first_name && (
              <p className="text-red-500 text-sm mt-1" role="alert">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="nash-last-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("last_name")}
              id="nash-last-name"
              type="text"
              placeholder="Smith"
              autoComplete="family-name"
              aria-required="true"
              aria-invalid={!!errors.last_name}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.last_name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.last_name && (
              <p className="text-red-500 text-sm mt-1" role="alert">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* Contact fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nash-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              {...register("phone")}
              id="nash-phone"
              type="tel"
              placeholder="(615) 555-1234"
              autoComplete="tel"
              aria-required="true"
              aria-invalid={!!errors.phone}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.phone ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1" role="alert">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="nash-email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            <input
              {...register("email")}
              id="nash-email"
              type="email"
              placeholder="john@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1" role="alert">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Service Address */}
        <div>
          <label htmlFor="nash-address" className="block text-sm font-medium text-gray-700 mb-1.5">
            Service Address
          </label>
          <input
            {...register("service_address", {
              onBlur: (e) => fetchTankEstimate(e.target.value),
            })}
            id="nash-address"
            type="text"
            placeholder="123 Main St, Nashville, TN"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />

          {/* Tank Size Estimate Display */}
          {estimateLoading && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Looking up your property...
            </div>
          )}
          {tankEstimate && !estimateLoading && (
            <div className={`mt-2 rounded-lg p-3 text-sm ${
              tankEstimate.overage_gallons > 0
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : "bg-green-50 border border-green-200 text-green-800"
            }`}>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  {tankEstimate.overage_gallons > 0 ? (
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  )}
                </svg>
                <div>
                  <p className="font-medium">{tankEstimate.message}</p>
                  {tankEstimate.overage_gallons > 0 && (
                    <p className="mt-1 font-semibold">
                      Estimated total: ${tankEstimate.estimated_total.toFixed(0)}
                      <span className="font-normal"> ($625 base + ~${tankEstimate.estimated_overage_cost.toFixed(0)} overage)</span>
                    </p>
                  )}
                  {tankEstimate.confidence !== "low" && tankEstimate.county && (
                    <p className="mt-0.5 text-xs opacity-75">
                      Source: {tankEstimate.county} County property records
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Date/Time Selection */}
        <AvailabilityPicker
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          isAsap={isAsap}
          onDateChange={setSelectedDate}
          onTimeSlotChange={setSelectedTimeSlot}
          onAsapChange={setIsAsap}
          serviceType="pumping"
        />

        {/* Notes */}
        <div>
          <label htmlFor="nash-notes" className="block text-sm font-medium text-gray-700 mb-1.5">
            Special Instructions <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            {...register("notes")}
            id="nash-notes"
            rows={2}
            placeholder="Gate code, directions to tank, etc."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
          />
        </div>

        {/* Overage Acknowledgment */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              {...register("overage_acknowledged")}
              id="nash-overage"
              aria-required="true"
              aria-invalid={!!errors.overage_acknowledged}
              className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="nash-overage" className="text-sm text-gray-700 leading-tight">
              <strong>I understand</strong> that if my tank exceeds 1,000
              gallons, I will be charged{" "}
              <strong>$0.45 for each additional gallon</strong>. Payment is due
              at the time of service.
            </label>
          </div>
          {errors.overage_acknowledged && (
            <p className="text-red-500 text-sm mt-2" role="alert">{errors.overage_acknowledged.message}</p>
          )}
        </div>

        {/* SMS Consent */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            {...register("sms_consent")}
            id="nash-sms"
            className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="nash-sms" className="text-sm text-gray-600 leading-tight">
            I agree to receive SMS updates about my service appointment. Message
            and data rates may apply.
          </label>
        </div>

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center" role="alert">
            <p className="text-red-700 text-sm">
              {(error as Error)?.message || "Something went wrong. Please try again or call us at "}
              <a href="tel:+16155550175" className="font-bold underline">(615) 555-0175</a>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-cta hover:bg-cta-hover text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Scheduling...
            </span>
          ) : testMode ? (
            "Schedule Service (Test Mode)"
          ) : (
            "Schedule Service — $625"
          )}
        </button>

        <p className="text-center text-xs text-gray-500">
          No payment required now. Pay at time of service.
        </p>
      </form>
    </div>
  );
}
