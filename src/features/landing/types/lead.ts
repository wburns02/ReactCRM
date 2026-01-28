import { z } from "zod";

// UTM tracking parameters from URL
export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
}

// Service type values
const SERVICE_TYPES = [
  "pumping",
  "inspection",
  "repair",
  "installation",
  "emergency",
  "other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// Preferred time values
const PREFERRED_TIMES = [
  "asap",
  "today",
  "tomorrow",
  "this_week",
  "flexible",
] as const;

export type PreferredTime = (typeof PREFERRED_TIMES)[number];

// Preferred time options for quick select
export const PREFERRED_TIME_OPTIONS = [
  { value: "asap", label: "ASAP / Emergency", icon: "⚡" },
  { value: "today", label: "Today", icon: "📅" },
  { value: "tomorrow", label: "Tomorrow", icon: "📆" },
  { value: "this_week", label: "This Week", icon: "🗓️" },
  { value: "flexible", label: "I'm Flexible", icon: "✓" },
] as const;

// Lead form validation schema
export const leadFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.union([z.string().email("Please enter a valid email"), z.literal("")]).optional(),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[\d\s\-()]+$/, "Please enter a valid phone number"),
  service_type: z.enum(SERVICE_TYPES, { message: "Please select a service" }),
  preferred_time: z.enum(PREFERRED_TIMES).optional(),
  address: z.string().optional(),
  message: z.string().optional(),
  sms_consent: z.boolean().optional().default(false),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

// Full lead submission data (form + tracking)
export interface LeadSubmitData {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  service_type: ServiceType;
  preferred_time?: PreferredTime;
  address?: string;
  message?: string;
  sms_consent?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  landing_page?: string;
  lead_source?: string;
  prospect_stage?: string;
}

// Service options for dropdown
export const SERVICE_OPTIONS = [
  { value: "pumping", label: "Septic Tank Pumping" },
  { value: "inspection", label: "Septic Inspection" },
  { value: "repair", label: "Repair Service" },
  { value: "installation", label: "New Installation" },
  { value: "emergency", label: "Emergency Service (24/7)" },
  { value: "other", label: "Other / Not Sure" },
] as const;
