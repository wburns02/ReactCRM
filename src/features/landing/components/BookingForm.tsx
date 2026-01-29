import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PricingCard } from "./PricingCard";
import { AvailabilityPicker } from "./AvailabilityPicker";
import {
  useCreateBooking,
  usePricing,
  formatBookingDate,
  formatTimeSlot,
  type BookingCreateData,
} from "../hooks/useBooking";
import type { TimeSlot } from "../types/lead";

// Form validation schema
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

interface BookingFormProps {
  testMode?: boolean;
}

export function BookingForm({ testMode = true }: BookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<
    TimeSlot | undefined
  >();
  const [isAsap, setIsAsap] = useState(false);

  const { data: pricing } = usePricing("pumping");
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
      alert("Please select a date for your service");
      return;
    }

    // For ASAP, use tomorrow's date
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
      notes: isAsap
        ? "ASAP/Emergency Request. " + (data.notes || "")
        : data.notes,
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
        <h3 className="text-2xl font-bold text-green-800 mb-2">
          Booking Confirmed!
        </h3>
        <p className="text-green-700 mb-4">
          Your septic tank pumping service has been scheduled.
        </p>
        <div className="bg-white rounded-lg p-4 text-left mb-4 max-w-md mx-auto">
          <div className="space-y-2 text-sm">
            <p>
              <strong>Confirmation #:</strong>{" "}
              {bookingResult.id.slice(0, 8).toUpperCase()}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {formatBookingDate(bookingResult.scheduled_date)}
            </p>
            {bookingResult.time_slot && (
              <p>
                <strong>Time:</strong> {formatTimeSlot(bookingResult.time_slot)}
              </p>
            )}
            <p>
              <strong>Service:</strong> Septic Tank Pumping
            </p>
            <p>
              <strong>Amount:</strong> ${bookingResult.base_price}
            </p>
            {bookingResult.is_test && (
              <p className="text-orange-600 font-medium">
                (Test booking - no payment charged)
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-green-600">
          A confirmation has been sent to your phone.
          {bookingResult.customer_email && " Check your email for details."}
        </p>
        <p className="text-sm text-gray-600 mt-4">
          Questions? Call us at{" "}
          <a
            href="tel:+19365641440"
            className="font-bold text-primary underline"
          >
            (936) 564-1440
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pricing Card */}
      <PricingCard
        basePrice={pricing?.base_price ?? 575}
        includedGallons={pricing?.included_gallons ?? 1750}
        overageRate={pricing?.overage_rate ?? 0.45}
      />

      {/* Test Mode Banner */}
      {testMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
          <strong>Test Mode:</strong> No real payment will be charged. This is
          for testing the booking flow.
        </div>
      )}

      {/* Booking Form */}
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
              <p className="text-red-500 text-sm mt-1">
                {errors.phone.message}
              </p>
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
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* Service Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Service Address
          </label>
          <input
            {...register("service_address")}
            type="text"
            placeholder="123 Main St, City, TX"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Special Instructions{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            {...register("notes")}
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
              id="overage_acknowledged"
              className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label
              htmlFor="overage_acknowledged"
              className="text-sm text-gray-700 leading-tight"
            >
              <strong>I understand</strong> that if my tank exceeds 1,750
              gallons, I will be charged{" "}
              <strong>$0.45 for each additional gallon</strong>.
              {!testMode && (
                <>
                  {" "}
                  My card will be pre-authorized for <strong>$775</strong> and
                  the final amount will be captured after service.
                </>
              )}
            </label>
          </div>
          {errors.overage_acknowledged && (
            <p className="text-red-500 text-sm mt-2">
              {errors.overage_acknowledged.message}
            </p>
          )}
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
            I agree to receive SMS updates about my service appointment. Message
            and data rates may apply.
          </label>
        </div>

        {/* Error message */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700 text-sm">
              {(error as Error)?.message ||
                "Something went wrong. Please try again or call us directly at "}
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
              Processing...
            </span>
          ) : testMode ? (
            "Book Now (Test Mode)"
          ) : (
            "Book & Pay $575"
          )}
        </button>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Secure payment powered by Clover</span>
        </div>
      </form>
    </div>
  );
}
