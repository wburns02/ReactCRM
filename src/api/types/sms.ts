/**
 * SMS Notification System Types
 *
 * Comprehensive TypeScript types for the SMS notification system
 * supporting Twilio integration, templates, delivery tracking, and compliance.
 */

/**
 * Notification trigger types - events that can trigger SMS notifications
 */
export type NotificationTrigger =
  | "booking_confirmation" // Immediate - when appointment is booked
  | "reminder_48h" // 48 hours before appointment
  | "reminder_24h" // 24 hours before appointment
  | "reminder_2h" // 2 hours before appointment
  | "on_my_way" // Technician en route with dynamic ETA
  | "service_complete" // Service completed with invoice link
  | "invoice_sent" // Invoice created and sent
  | "payment_received" // Payment confirmation
  | "payment_reminder" // Overdue payment reminder
  | "reschedule_confirmation" // Appointment rescheduled
  | "cancellation_confirmation" // Appointment cancelled
  | "review_request" // Post-service review request
  | "custom"; // Manual/custom message

/**
 * SMS delivery status from Twilio
 */
export type SMSDeliveryStatus =
  | "queued" // Message queued for sending
  | "sending" // Message is being sent
  | "sent" // Message sent to carrier
  | "delivered" // Confirmed delivery to device
  | "undelivered" // Message could not be delivered
  | "failed" // Message failed to send
  | "read"; // Message read (if supported)

/**
 * SMS message direction
 */
export type SMSDirection = "inbound" | "outbound";

/**
 * Opt-out status for compliance
 */
export type OptOutStatus = "opted_in" | "opted_out" | "pending";

/**
 * Template merge field definitions
 */
export interface MergeField {
  key: string;
  description: string;
  example: string;
  required: boolean;
}

/**
 * Available merge fields for SMS templates
 */
export const SMS_MERGE_FIELDS: MergeField[] = [
  {
    key: "{{customer_name}}",
    description: "Customer full name",
    example: "John Smith",
    required: true,
  },
  {
    key: "{{customer_first_name}}",
    description: "Customer first name",
    example: "John",
    required: false,
  },
  {
    key: "{{appointment_date}}",
    description: "Appointment date",
    example: "January 15, 2026",
    required: false,
  },
  {
    key: "{{appointment_time}}",
    description: "Appointment time",
    example: "2:00 PM",
    required: false,
  },
  {
    key: "{{appointment_window}}",
    description: "Appointment time window",
    example: "2:00 PM - 4:00 PM",
    required: false,
  },
  {
    key: "{{technician_name}}",
    description: "Assigned technician name",
    example: "Mike Johnson",
    required: false,
  },
  {
    key: "{{eta_minutes}}",
    description: "Estimated minutes until arrival",
    example: "15",
    required: false,
  },
  {
    key: "{{eta_time}}",
    description: "Estimated arrival time",
    example: "2:15 PM",
    required: false,
  },
  {
    key: "{{service_type}}",
    description: "Type of service",
    example: "Septic Pumping",
    required: false,
  },
  {
    key: "{{service_address}}",
    description: "Service location address",
    example: "123 Main St",
    required: false,
  },
  {
    key: "{{invoice_amount}}",
    description: "Invoice total amount",
    example: "$350.00",
    required: false,
  },
  {
    key: "{{invoice_link}}",
    description: "Link to view/pay invoice",
    example: "https://...",
    required: false,
  },
  {
    key: "{{tracking_link}}",
    description: "Real-time technician tracking link",
    example: "https://...",
    required: false,
  },
  {
    key: "{{company_name}}",
    description: "Company name",
    example: "MAC Septic",
    required: false,
  },
  {
    key: "{{company_phone}}",
    description: "Company phone number",
    example: "(555) 123-4567",
    required: false,
  },
  {
    key: "{{work_order_number}}",
    description: "Work order reference number",
    example: "WO-2026-001234",
    required: false,
  },
];

/**
 * SMS notification template
 */
export interface SMSNotificationTemplate {
  id: string;
  name: string;
  trigger: NotificationTrigger;
  content: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean; // System templates cannot be deleted
  character_count: number;
  segment_count: number; // Number of SMS segments (160 chars each)
  created_at: string;
  updated_at: string;
}

/**
 * SMS message record
 */
export interface SMSNotification {
  id: string;
  to_phone: string;
  from_phone: string;
  content: string;
  status: SMSDeliveryStatus;
  direction: SMSDirection;
  trigger: NotificationTrigger;

  // Twilio tracking
  twilio_sid?: string;
  twilio_status?: string;
  error_code?: string;
  error_message?: string;

  // Related entities
  customer_id?: number;
  customer_name?: string;
  work_order_id?: string;
  appointment_id?: string;
  invoice_id?: string;

  // Timestamps
  queued_at: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;

  // Template info
  template_id?: string;
  template_variables?: Record<string, string>;
}

/**
 * Customer SMS preferences
 */
export interface CustomerSMSPreferences {
  customer_id: number;
  sms_enabled: boolean;
  opt_out_status: OptOutStatus;
  opt_out_date?: string;
  opt_in_date?: string;

  // Notification preferences by type
  booking_confirmation: boolean;
  appointment_reminders: boolean;
  on_my_way_alerts: boolean;
  service_complete: boolean;
  invoice_notifications: boolean;
  payment_reminders: boolean;
  review_requests: boolean;
  marketing_messages: boolean;

  // Timing preferences
  preferred_reminder_hours: number; // Hours before appointment
  quiet_hours_enabled: boolean;
  quiet_start: string; // e.g., "21:00"
  quiet_end: string; // e.g., "08:00"

  // Contact info
  primary_phone: string;
  alternate_phone?: string;

  updated_at: string;
}

/**
 * Scheduled notification
 */
export interface ScheduledNotification {
  id: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  template_id: string;
  template_name: string;
  trigger: NotificationTrigger;
  scheduled_for: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  work_order_id?: string;
  appointment_id?: string;
  variables: Record<string, string>;
  created_at: string;
}

/**
 * Inbound SMS message (two-way SMS)
 */
export interface InboundSMS {
  id: string;
  from_phone: string;
  to_phone: string;
  body: string;
  twilio_sid: string;

  // Parsed information
  customer_id?: number;
  customer_name?: string;
  is_opt_out: boolean; // Contains STOP, UNSUBSCRIBE, etc.
  is_opt_in: boolean; // Contains START, SUBSCRIBE, etc.
  requires_response: boolean;

  // Routing
  routed_to?: string; // User/department the message was routed to
  response_sent: boolean;
  response_content?: string;

  received_at: string;
  processed_at?: string;
}

/**
 * SMS conversation thread
 */
export interface SMSConversation {
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  last_message: string;
  last_message_at: string;
  last_direction: SMSDirection;
  unread_count: number;
  messages: SMSNotification[];
}

/**
 * Opt-out keywords for TCPA compliance
 */
export const OPT_OUT_KEYWORDS = [
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
];
export const OPT_IN_KEYWORDS = ["START", "SUBSCRIBE", "YES", "UNSTOP"];

/**
 * SMS delivery statistics
 */
export interface SMSDeliveryStats {
  period: "today" | "week" | "month" | "all_time";
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_queued: number;
  delivery_rate: number; // Percentage
  average_delivery_time_seconds: number;

  // By trigger type
  by_trigger: Record<
    NotificationTrigger,
    {
      sent: number;
      delivered: number;
      failed: number;
    }
  >;

  // Compliance
  opt_outs_count: number;
  opt_ins_count: number;
  inbound_messages: number;
  responses_sent: number;
}

/**
 * Send notification request
 */
export interface SendNotificationRequest {
  customer_id: number;
  phone: string;
  template_id?: string;
  trigger: NotificationTrigger;
  message?: string; // Override template content
  variables?: Record<string, string>;
  work_order_id?: string;
  appointment_id?: string;
  invoice_id?: string;
  schedule_for?: string; // ISO date for scheduled sending
}

/**
 * Send bulk notifications request
 */
export interface SendBulkNotificationRequest {
  customer_ids: number[];
  template_id: string;
  trigger: NotificationTrigger;
  variables?: Record<string, string>; // Shared variables
  schedule_for?: string;
}

/**
 * Notification trigger configuration
 */
export interface NotificationTriggerConfig {
  trigger: NotificationTrigger;
  enabled: boolean;
  template_id?: string;
  timing_hours?: number; // For reminders, hours before event
  timing_days?: number; // For payment reminders, days after due
}

/**
 * SMS settings/configuration
 */
export interface SMSNotificationSettings {
  // Twilio configuration
  twilio_enabled: boolean;
  twilio_phone_number?: string;
  twilio_account_status?: "active" | "suspended" | "pending";

  // Trigger configurations
  triggers: NotificationTriggerConfig[];

  // Global settings
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  max_messages_per_day: number;

  // Compliance
  include_opt_out_message: boolean;
  opt_out_message: string; // e.g., "Reply STOP to unsubscribe"

  // Default templates
  default_templates: Record<NotificationTrigger, string>;
}

/**
 * Webhook payload from Twilio for status updates
 */
export interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus: SMSDeliveryStatus;
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

/**
 * Webhook payload from Twilio for inbound messages
 */
export interface TwilioInboundCallback {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
}

/**
 * ETA notification data
 */
export interface ETANotificationData {
  work_order_id: string;
  technician_id: string;
  technician_name: string;
  customer_id: number;
  customer_phone: string;
  current_location: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  eta_minutes: number;
  eta_time: string;
  tracking_link: string;
}

/**
 * Notification queue item for processing
 */
export interface NotificationQueueItem {
  id: string;
  priority: "high" | "normal" | "low";
  notification: SendNotificationRequest;
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  next_attempt_at: string;
  error_message?: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

/**
 * Response from sending a notification
 */
export interface SendNotificationResponse {
  success: boolean;
  message_id?: string;
  twilio_sid?: string;
  status: SMSDeliveryStatus;
  scheduled_for?: string;
  error?: string;
}

/**
 * Response from bulk send operation
 */
export interface BulkSendResponse {
  total_requested: number;
  sent: number;
  failed: number;
  skipped: number; // Opted-out customers
  errors: Array<{
    customer_id: number;
    error: string;
  }>;
}
