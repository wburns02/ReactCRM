import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Communication Type enum
 */
export const CommunicationType = {
  SMS: "sms",
  EMAIL: "email",
} as const;
export type CommunicationType =
  (typeof CommunicationType)[keyof typeof CommunicationType];

export const communicationTypeSchema = z.enum(["sms", "email"]);

/**
 * Communication Status enum
 */
export const CommunicationStatus = {
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  PENDING: "pending",
} as const;
export type CommunicationStatus =
  (typeof CommunicationStatus)[keyof typeof CommunicationStatus];

export const communicationStatusSchema = z.enum([
  "sent",
  "delivered",
  "failed",
  "pending",
]);

/**
 * Communication schema - validates API responses
 */
export const communicationSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  communication_type: communicationTypeSchema,
  recipient: z.string(),
  subject: z.string().nullable(),
  message: z.string(),
  status: communicationStatusSchema,
  sent_at: z.string(),
  delivered_at: z.string().nullable(),
  error_message: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
});

export type Communication = z.infer<typeof communicationSchema>;

/**
 * Paginated communication list response
 */
export const communicationListResponseSchema =
  paginatedResponseSchema(communicationSchema);
export type CommunicationListResponse = z.infer<
  typeof communicationListResponseSchema
>;

/**
 * Communication filters for list queries
 */
export interface CommunicationFilters {
  page?: number;
  page_size?: number;
  customer_id?: string;
  communication_type?: CommunicationType;
}

/**
 * Send SMS request
 */
export const sendSMSSchema = z.object({
  customer_id: z.string().uuid(),
  phone: z.string().min(10, "Phone number is required"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(160, "Message must be 160 characters or less"),
  template_id: z.string().optional(),
});

export type SendSMSData = z.infer<typeof sendSMSSchema>;

/**
 * Send Email request
 * Matches backend SendEmailRequest schema: to, subject, body, customer_id (optional int)
 */
export const sendEmailSchema = z.object({
  customer_id: z.string().optional(),
  to: z.string().email("Invalid email address"), // Backend field name
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"), // Backend field name
  template_id: z.string().optional(),
});

export type SendEmailData = z.infer<typeof sendEmailSchema>;

/**
 * Display labels
 */
export const COMMUNICATION_TYPE_LABELS: Record<CommunicationType, string> = {
  sms: "SMS",
  email: "Email",
};

export const COMMUNICATION_STATUS_LABELS: Record<CommunicationStatus, string> =
  {
    sent: "Sent",
    delivered: "Delivered",
    failed: "Failed",
    pending: "Pending",
  };

/**
 * SMS Templates
 */
export interface SMSTemplate {
  id: string;
  name: string;
  message: string;
}

export const SMS_TEMPLATES: SMSTemplate[] = [
  {
    id: "appointment_reminder",
    name: "Appointment Reminder",
    message:
      "Hi {name}, this is a reminder about your septic service appointment tomorrow at {time}. Reply CONFIRM to confirm.",
  },
  {
    id: "service_complete",
    name: "Service Complete",
    message:
      "Hi {name}, your septic service has been completed. Thank you for choosing MAC Septic!",
  },
  {
    id: "quote_ready",
    name: "Quote Ready",
    message:
      "Hi {name}, your septic service quote is ready. We'll send it to your email shortly.",
  },
  {
    id: "follow_up",
    name: "Follow-up",
    message:
      "Hi {name}, just following up on our recent conversation. Please let us know if you have any questions!",
  },
];

/**
 * Email Templates
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "appointment_confirmation",
    name: "Appointment Confirmation",
    subject: "Your MAC Septic Appointment Confirmation",
    message:
      "Dear {name},\n\nThis email confirms your septic service appointment on {date} at {time}.\n\nService Location:\n{address}\n\nIf you need to reschedule, please contact us at (555) 123-4567.\n\nThank you,\nMAC Septic",
  },
  {
    id: "quote",
    name: "Service Quote",
    subject: "Your MAC Septic Service Quote",
    message:
      "Dear {name},\n\nThank you for your interest in MAC Septic services.\n\nPlease find attached your service quote. This quote is valid for 30 days.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nMAC Septic",
  },
  {
    id: "thank_you",
    name: "Thank You",
    subject: "Thank You for Choosing MAC Septic",
    message:
      "Dear {name},\n\nThank you for choosing MAC Septic for your septic service needs. We appreciate your business!\n\nIf you were satisfied with our service, we would appreciate a review.\n\nBest regards,\nMAC Septic",
  },
];
