/**
 * SMS Notification Templates
 *
 * Pre-defined message templates for all notification triggers.
 * Templates use merge fields that are replaced with actual values at send time.
 *
 * Merge Fields Available:
 * - {{customer_name}} - Full customer name
 * - {{customer_first_name}} - Customer's first name
 * - {{appointment_date}} - Date of appointment (e.g., "January 15, 2026")
 * - {{appointment_time}} - Time of appointment (e.g., "2:00 PM")
 * - {{appointment_window}} - Time window (e.g., "2:00 PM - 4:00 PM")
 * - {{technician_name}} - Assigned technician's name
 * - {{eta_minutes}} - Minutes until arrival (e.g., "15")
 * - {{eta_time}} - Formatted ETA (e.g., "15 minutes")
 * - {{service_type}} - Type of service
 * - {{service_address}} - Service location
 * - {{invoice_amount}} - Invoice total (e.g., "$350.00")
 * - {{invoice_link}} - Link to view/pay invoice
 * - {{tracking_link}} - Real-time technician tracking link
 * - {{company_name}} - Company name
 * - {{company_phone}} - Company phone number
 * - {{work_order_number}} - Work order reference
 */

import type { NotificationTrigger, SMSNotificationTemplate } from '@/api/types/sms';

/**
 * Default notification templates for each trigger type
 */
export const DEFAULT_NOTIFICATION_TEMPLATES: Record<
  NotificationTrigger,
  Omit<SMSNotificationTemplate, 'id' | 'created_at' | 'updated_at'>
> = {
  // =========================================================================
  // Booking & Confirmation Templates
  // =========================================================================

  booking_confirmation: {
    name: 'Booking Confirmation',
    trigger: 'booking_confirmation',
    content: `Hi {{customer_first_name}}! Your appointment with {{company_name}} is confirmed for {{appointment_date}} at {{appointment_time}}.

Service: {{service_type}}
Location: {{service_address}}

Reply HELP for assistance or call {{company_phone}}.`,
    variables: [
      'customer_first_name',
      'company_name',
      'appointment_date',
      'appointment_time',
      'service_type',
      'service_address',
      'company_phone',
    ],
    is_active: true,
    is_system: true,
    character_count: 246,
    segment_count: 2,
  },

  reschedule_confirmation: {
    name: 'Reschedule Confirmation',
    trigger: 'reschedule_confirmation',
    content: `Hi {{customer_first_name}}, your {{company_name}} appointment has been rescheduled to {{appointment_date}} at {{appointment_time}}.

We look forward to serving you!

Questions? Call {{company_phone}}.`,
    variables: [
      'customer_first_name',
      'company_name',
      'appointment_date',
      'appointment_time',
      'company_phone',
    ],
    is_active: true,
    is_system: true,
    character_count: 185,
    segment_count: 2,
  },

  cancellation_confirmation: {
    name: 'Cancellation Confirmation',
    trigger: 'cancellation_confirmation',
    content: `Hi {{customer_first_name}}, your {{company_name}} appointment scheduled for {{appointment_date}} has been cancelled.

To reschedule, call us at {{company_phone}} or visit our website.

We hope to serve you soon!`,
    variables: [
      'customer_first_name',
      'company_name',
      'appointment_date',
      'company_phone',
    ],
    is_active: true,
    is_system: true,
    character_count: 195,
    segment_count: 2,
  },

  // =========================================================================
  // Reminder Templates
  // =========================================================================

  reminder_48h: {
    name: '48-Hour Reminder',
    trigger: 'reminder_48h',
    content: `Reminder: {{customer_first_name}}, your {{company_name}} appointment is coming up in 2 days!

Date: {{appointment_date}}
Time: {{appointment_time}}
Service: {{service_type}}

Need to reschedule? Call {{company_phone}}.`,
    variables: [
      'customer_first_name',
      'company_name',
      'appointment_date',
      'appointment_time',
      'service_type',
      'company_phone',
    ],
    is_active: true,
    is_system: true,
    character_count: 223,
    segment_count: 2,
  },

  reminder_24h: {
    name: '24-Hour Reminder',
    trigger: 'reminder_24h',
    content: `Hi {{customer_first_name}}, just a reminder - your {{company_name}} appointment is TOMORROW!

Date: {{appointment_date}}
Time: {{appointment_time}}

Please ensure access to the service area. Reply CONFIRM to confirm or call {{company_phone}} to reschedule.`,
    variables: [
      'customer_first_name',
      'company_name',
      'appointment_date',
      'appointment_time',
      'company_phone',
    ],
    is_active: true,
    is_system: true,
    character_count: 245,
    segment_count: 2,
  },

  reminder_2h: {
    name: '2-Hour Reminder',
    trigger: 'reminder_2h',
    content: `{{customer_first_name}}, your {{company_name}} technician will arrive in approximately 2 hours ({{appointment_time}}).

Please ensure the service area is accessible. We'll send another message when our tech is on the way.`,
    variables: [
      'customer_first_name',
      'company_name',
      'appointment_time',
    ],
    is_active: true,
    is_system: true,
    character_count: 209,
    segment_count: 2,
  },

  // =========================================================================
  // On My Way / ETA Template
  // =========================================================================

  on_my_way: {
    name: 'On My Way with ETA',
    trigger: 'on_my_way',
    content: `{{customer_first_name}}, your technician {{technician_name}} is on the way!

Estimated arrival: {{eta_time}} (approx. {{eta_minutes}} min)

Track your technician in real-time:
{{tracking_link}}

Questions? Call {{company_phone}}.`,
    variables: [
      'customer_first_name',
      'technician_name',
      'eta_time',
      'eta_minutes',
      'tracking_link',
      'company_phone',
    ],
    is_active: true,
    is_system: true,
    character_count: 228,
    segment_count: 2,
  },

  // =========================================================================
  // Service Complete Template
  // =========================================================================

  service_complete: {
    name: 'Service Complete',
    trigger: 'service_complete',
    content: `Thank you, {{customer_first_name}}! Your {{service_type}} service has been completed by {{technician_name}}.

Invoice Total: {{invoice_amount}}

View and pay your invoice:
{{invoice_link}}

Thank you for choosing {{company_name}}!`,
    variables: [
      'customer_first_name',
      'service_type',
      'technician_name',
      'invoice_amount',
      'invoice_link',
      'company_name',
    ],
    is_active: true,
    is_system: true,
    character_count: 232,
    segment_count: 2,
  },

  // =========================================================================
  // Invoice & Payment Templates
  // =========================================================================

  invoice_sent: {
    name: 'Invoice Sent',
    trigger: 'invoice_sent',
    content: `Hi {{customer_first_name}}, your invoice from {{company_name}} is ready.

Invoice #: {{work_order_number}}
Amount Due: {{invoice_amount}}

Pay online securely:
{{invoice_link}}

Questions? Call {{company_phone}}.`,
    variables: [
      'customer_first_name',
      'company_name',
      'work_order_number',
      'invoice_amount',
      'invoice_link',
      'company_phone',
    ],
    is_active: true,
    is_system: true,
    character_count: 211,
    segment_count: 2,
  },

  payment_received: {
    name: 'Payment Received',
    trigger: 'payment_received',
    content: `Thank you, {{customer_first_name}}! We've received your payment of {{invoice_amount}}.

Invoice #: {{work_order_number}}
Status: PAID

Thank you for your business!
- {{company_name}}`,
    variables: [
      'customer_first_name',
      'invoice_amount',
      'work_order_number',
      'company_name',
    ],
    is_active: true,
    is_system: true,
    character_count: 172,
    segment_count: 2,
  },

  payment_reminder: {
    name: 'Payment Reminder',
    trigger: 'payment_reminder',
    content: `Hi {{customer_first_name}}, this is a friendly reminder that your invoice from {{company_name}} is past due.

Invoice #: {{work_order_number}}
Amount Due: {{invoice_amount}}

Pay now:
{{invoice_link}}

Questions? Call {{company_phone}}.`,
    variables: [
      'customer_first_name',
      'company_name',
      'work_order_number',
      'invoice_amount',
      'invoice_link',
      'company_phone',
    ],
    is_active: true,
    is_system: true,
    character_count: 227,
    segment_count: 2,
  },

  // =========================================================================
  // Review Request Template
  // =========================================================================

  review_request: {
    name: 'Review Request',
    trigger: 'review_request',
    content: `Hi {{customer_first_name}}, thank you for choosing {{company_name}}!

We'd love to hear about your experience. Would you mind leaving us a quick review?

It only takes a minute and helps us serve you better!

Leave a review: https://g.page/r/macseptic/review`,
    variables: [
      'customer_first_name',
      'company_name',
    ],
    is_active: true,
    is_system: true,
    character_count: 247,
    segment_count: 2,
  },

  // =========================================================================
  // Custom Template (placeholder)
  // =========================================================================

  custom: {
    name: 'Custom Message',
    trigger: 'custom',
    content: `Hi {{customer_first_name}}, this is a message from {{company_name}}.

{{message}}

Questions? Call {{company_phone}}.`,
    variables: [
      'customer_first_name',
      'company_name',
      'message',
      'company_phone',
    ],
    is_active: true,
    is_system: false,
    character_count: 120,
    segment_count: 1,
  },
};

// =============================================================================
// Alternative Templates
// =============================================================================

/**
 * Short-form templates for when character count is critical
 */
export const SHORT_TEMPLATES: Partial<
  Record<NotificationTrigger, string>
> = {
  booking_confirmation: `{{company_name}}: Appt confirmed {{appointment_date}} {{appointment_time}}. {{service_type}} at {{service_address}}. Call {{company_phone}} to reschedule.`,

  reminder_24h: `{{company_name}} reminder: Appt tomorrow {{appointment_time}}. Please ensure access to service area. {{company_phone}}`,

  on_my_way: `{{company_name}}: Tech {{technician_name}} ETA {{eta_minutes}} min. Track: {{tracking_link}}`,

  service_complete: `{{company_name}}: Service complete! Amount: {{invoice_amount}}. Pay: {{invoice_link}}`,
};

/**
 * Friendly/casual templates for customer preference
 */
export const FRIENDLY_TEMPLATES: Partial<
  Record<NotificationTrigger, string>
> = {
  booking_confirmation: `Hey {{customer_first_name}}! Great news - your appointment is all set!

We'll see you on {{appointment_date}} at {{appointment_time}}.

Got questions? Just give us a ring at {{company_phone}}. Can't wait to help you out!

- Your friends at {{company_name}}`,

  on_my_way: `Good news {{customer_first_name}}! Your tech {{technician_name}} just left and will be there in about {{eta_minutes}} minutes.

Track their progress here: {{tracking_link}}

See you soon!`,

  service_complete: `All done, {{customer_first_name}}!

{{technician_name}} has completed your {{service_type}}. Everything looks great!

Your invoice ({{invoice_amount}}) is ready whenever you are:
{{invoice_link}}

Thanks for choosing us!`,
};

// =============================================================================
// Template Utilities
// =============================================================================

/**
 * Get the default template for a trigger type
 */
export function getDefaultTemplate(trigger: NotificationTrigger): string {
  return DEFAULT_NOTIFICATION_TEMPLATES[trigger]?.content || '';
}

/**
 * Get the short template for a trigger type (falls back to default)
 */
export function getShortTemplate(trigger: NotificationTrigger): string {
  return SHORT_TEMPLATES[trigger] || getDefaultTemplate(trigger);
}

/**
 * Get the friendly template for a trigger type (falls back to default)
 */
export function getFriendlyTemplate(trigger: NotificationTrigger): string {
  return FRIENDLY_TEMPLATES[trigger] || getDefaultTemplate(trigger);
}

/**
 * Get all available templates for a trigger type
 */
export function getTemplateOptions(trigger: NotificationTrigger): {
  standard: string;
  short?: string;
  friendly?: string;
} {
  return {
    standard: getDefaultTemplate(trigger),
    short: SHORT_TEMPLATES[trigger],
    friendly: FRIENDLY_TEMPLATES[trigger],
  };
}

/**
 * Get template metadata (variables used, character count, segments)
 */
export function getTemplateMetadata(template: string): {
  variables: string[];
  characterCount: number;
  segmentCount: number;
} {
  // Extract variables
  const variables: string[] = [];
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  for (const match of matches) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  // Calculate character count (approximation with typical variable values)
  let estimatedLength = template.length;
  variables.forEach((v) => {
    // Subtract placeholder length, add typical value length
    const placeholderLength = v.length + 4; // {{variable}}
    let typicalLength = 10; // Default

    switch (v) {
      case 'customer_name':
      case 'customer_first_name':
        typicalLength = 8;
        break;
      case 'appointment_date':
        typicalLength = 20;
        break;
      case 'appointment_time':
        typicalLength = 8;
        break;
      case 'technician_name':
        typicalLength = 12;
        break;
      case 'eta_minutes':
        typicalLength = 2;
        break;
      case 'invoice_amount':
        typicalLength = 8;
        break;
      case 'tracking_link':
      case 'invoice_link':
        typicalLength = 45;
        break;
      case 'service_address':
        typicalLength = 30;
        break;
      case 'company_phone':
        typicalLength = 14;
        break;
      default:
        typicalLength = 15;
    }

    estimatedLength = estimatedLength - placeholderLength + typicalLength;
  });

  // Calculate segments
  const segmentCount =
    estimatedLength <= 160 ? 1 : Math.ceil(estimatedLength / 153);

  return {
    variables,
    characterCount: estimatedLength,
    segmentCount,
  };
}

/**
 * Validate a template string
 */
export function validateTemplate(template: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template || template.trim().length === 0) {
    errors.push('Template cannot be empty');
    return { valid: false, errors, warnings };
  }

  if (template.length > 1600) {
    errors.push('Template exceeds maximum length of 1600 characters');
  }

  // Check for unclosed variables
  const openBraces = (template.match(/\{\{/g) || []).length;
  const closeBraces = (template.match(/\}\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Template has unclosed variable brackets');
  }

  // Check for invalid variable names
  const invalidVars = template.match(/\{\{[^a-z_}]+\}\}/gi);
  if (invalidVars) {
    errors.push(`Invalid variable names: ${invalidVars.join(', ')}`);
  }

  // Warnings
  const metadata = getTemplateMetadata(template);

  if (metadata.segmentCount > 1) {
    warnings.push(
      `Message will be sent as ${metadata.segmentCount} SMS segments (may increase cost)`
    );
  }

  if (!template.toLowerCase().includes('stop')) {
    warnings.push(
      'Consider including opt-out instructions (Reply STOP to unsubscribe)'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Pre-built Notification Content
// =============================================================================

/**
 * Generate complete notification content for common scenarios
 */
export const NotificationContent = {
  /**
   * Generate booking confirmation message
   */
  bookingConfirmation: (data: {
    customerFirstName: string;
    appointmentDate: string;
    appointmentTime: string;
    serviceType: string;
    serviceAddress: string;
    companyName?: string;
    companyPhone?: string;
  }): string => {
    return `Hi ${data.customerFirstName}! Your appointment with ${data.companyName || 'MAC Septic'} is confirmed for ${data.appointmentDate} at ${data.appointmentTime}.

Service: ${data.serviceType}
Location: ${data.serviceAddress}

Reply HELP for assistance or call ${data.companyPhone || '(903) 665-0170'}.`;
  },

  /**
   * Generate "on my way" message with ETA
   */
  onMyWay: (data: {
    customerFirstName: string;
    technicianName: string;
    etaMinutes: number;
    trackingLink: string;
    companyPhone?: string;
  }): string => {
    const etaText =
      data.etaMinutes < 60
        ? `${data.etaMinutes} minutes`
        : `${Math.floor(data.etaMinutes / 60)}h ${data.etaMinutes % 60}m`;

    return `${data.customerFirstName}, your technician ${data.technicianName} is on the way!

Estimated arrival: ${etaText}

Track your technician in real-time:
${data.trackingLink}

Questions? Call ${data.companyPhone || '(903) 665-0170'}.`;
  },

  /**
   * Generate service complete message
   */
  serviceComplete: (data: {
    customerFirstName: string;
    serviceType: string;
    technicianName: string;
    invoiceAmount: string;
    invoiceLink: string;
    companyName?: string;
  }): string => {
    return `Thank you, ${data.customerFirstName}! Your ${data.serviceType} service has been completed by ${data.technicianName}.

Invoice Total: ${data.invoiceAmount}

View and pay your invoice:
${data.invoiceLink}

Thank you for choosing ${data.companyName || 'MAC Septic'}!`;
  },

  /**
   * Generate payment reminder message
   */
  paymentReminder: (data: {
    customerFirstName: string;
    invoiceNumber: string;
    invoiceAmount: string;
    invoiceLink: string;
    companyName?: string;
    companyPhone?: string;
  }): string => {
    return `Hi ${data.customerFirstName}, this is a friendly reminder that your invoice from ${data.companyName || 'MAC Septic'} is past due.

Invoice #: ${data.invoiceNumber}
Amount Due: ${data.invoiceAmount}

Pay now:
${data.invoiceLink}

Questions? Call ${data.companyPhone || '(903) 665-0170'}.`;
  },
};

export default DEFAULT_NOTIFICATION_TEMPLATES;
