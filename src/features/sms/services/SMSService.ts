/**
 * SMS Service
 *
 * Core service for SMS notification functionality.
 * Provides template processing, message formatting, merge field replacement,
 * and utility functions for the SMS notification system.
 */

import type {
  NotificationTrigger,
  CustomerSMSPreferences,
  SendNotificationRequest,
} from '@/api/types/sms';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum characters for a single SMS segment
 */
export const SMS_SEGMENT_LENGTH = 160;

/**
 * Maximum characters for concatenated SMS
 */
export const SMS_CONCAT_SEGMENT_LENGTH = 153; // Headers reduce available chars

/**
 * Maximum total message length
 */
export const SMS_MAX_LENGTH = 1600; // 10 segments max

/**
 * Quiet hours default configuration
 */
export const DEFAULT_QUIET_HOURS = {
  start: '21:00',
  end: '08:00',
};

/**
 * Trigger display names
 */
export const TRIGGER_LABELS: Record<NotificationTrigger, string> = {
  booking_confirmation: 'Booking Confirmation',
  reminder_48h: '48-Hour Reminder',
  reminder_24h: '24-Hour Reminder',
  reminder_2h: '2-Hour Reminder',
  on_my_way: 'On My Way',
  service_complete: 'Service Complete',
  invoice_sent: 'Invoice Sent',
  payment_received: 'Payment Received',
  payment_reminder: 'Payment Reminder',
  reschedule_confirmation: 'Reschedule Confirmation',
  cancellation_confirmation: 'Cancellation Confirmation',
  review_request: 'Review Request',
  custom: 'Custom Message',
};

/**
 * Trigger descriptions for UI
 */
export const TRIGGER_DESCRIPTIONS: Record<NotificationTrigger, string> = {
  booking_confirmation: 'Sent immediately when an appointment is booked',
  reminder_48h: 'Sent 48 hours before the scheduled appointment',
  reminder_24h: 'Sent 24 hours before the scheduled appointment',
  reminder_2h: 'Sent 2 hours before the scheduled appointment',
  on_my_way: 'Sent when technician marks en route with dynamic ETA',
  service_complete: 'Sent when service is marked complete with invoice link',
  invoice_sent: 'Sent when an invoice is created',
  payment_received: 'Sent to confirm payment received',
  payment_reminder: 'Sent for overdue invoices',
  reschedule_confirmation: 'Sent when appointment is rescheduled',
  cancellation_confirmation: 'Sent when appointment is cancelled',
  review_request: 'Sent after service to request a review',
  custom: 'Manually composed message',
};

/**
 * Default timing for reminder triggers (in hours)
 */
export const DEFAULT_TRIGGER_TIMING: Record<string, number> = {
  reminder_48h: 48,
  reminder_24h: 24,
  reminder_2h: 2,
  payment_reminder: 168, // 7 days
};

// =============================================================================
// SMS Service Class
// =============================================================================

export class SMSService {
  /**
   * Process a template by replacing merge fields with actual values
   */
  static processTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    let processed = template;

    // Replace all variables in the template
    for (const [key, value] of Object.entries(variables)) {
      // Support both {{key}} and {key} formats
      const doubleBracePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      const singleBracePattern = new RegExp(`\\{${key}\\}`, 'gi');

      processed = processed.replace(doubleBracePattern, value || '');
      processed = processed.replace(singleBracePattern, value || '');
    }

    // Clean up any remaining unprocessed variables
    processed = processed.replace(/\{\{[^}]+\}\}/g, '');
    processed = processed.replace(/\{[^}]+\}/g, '');

    // Clean up extra whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  }

  /**
   * Extract variables from a template string
   */
  static extractVariables(template: string): string[] {
    const variables: string[] = [];

    // Match {{variable_name}} patterns
    const doubleBraceMatches = template.matchAll(/\{\{(\w+)\}\}/g);
    for (const match of doubleBraceMatches) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    // Match {variable_name} patterns (legacy support)
    const singleBraceMatches = template.matchAll(/\{(\w+)\}/g);
    for (const match of singleBraceMatches) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Calculate the number of SMS segments for a message
   */
  static calculateSegments(message: string): number {
    const length = message.length;

    if (length === 0) return 0;
    if (length <= SMS_SEGMENT_LENGTH) return 1;

    // For concatenated messages, each segment is slightly smaller
    return Math.ceil(length / SMS_CONCAT_SEGMENT_LENGTH);
  }

  /**
   * Format a phone number for display
   */
  static formatPhoneForDisplay(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Handle US format
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Handle with country code
    if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // Return as-is for other formats
    return phone;
  }

  /**
   * Normalize a phone number to E.164 format for Twilio
   */
  static normalizePhoneForTwilio(phone: string): string {
    // Remove all non-digits
    let digits = phone.replace(/\D/g, '');

    // Add US country code if not present
    if (digits.length === 10) {
      digits = '1' + digits;
    }

    // Format as E.164
    return '+' + digits;
  }

  /**
   * Validate a phone number
   */
  static isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    // Valid US phone: 10 digits or 11 with country code
    return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
  }

  /**
   * Check if message contains opt-out keyword
   */
  static isOptOutMessage(message: string): boolean {
    const normalizedMessage = message.toUpperCase().trim();
    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
    return optOutKeywords.some((keyword) => normalizedMessage === keyword);
  }

  /**
   * Check if message contains opt-in keyword
   */
  static isOptInMessage(message: string): boolean {
    const normalizedMessage = message.toUpperCase().trim();
    const optInKeywords = ['START', 'SUBSCRIBE', 'YES', 'UNSTOP'];
    return optInKeywords.some((keyword) => normalizedMessage === keyword);
  }

  /**
   * Check if current time is within quiet hours
   */
  static isWithinQuietHours(
    quietStart: string,
    quietEnd: string,
    currentTime?: Date
  ): boolean {
    const now = currentTime || new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [startHours, startMinutes] = quietStart.split(':').map(Number);
    const [endHours, endMinutes] = quietEnd.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    // Handle overnight quiet hours (e.g., 21:00 to 08:00)
    if (startTotalMinutes > endTotalMinutes) {
      return (
        currentTotalMinutes >= startTotalMinutes ||
        currentTotalMinutes < endTotalMinutes
      );
    }

    // Same-day quiet hours
    return (
      currentTotalMinutes >= startTotalMinutes &&
      currentTotalMinutes < endTotalMinutes
    );
  }

  /**
   * Calculate when a reminder should be sent based on appointment time
   */
  static calculateReminderTime(
    appointmentTime: Date,
    trigger: NotificationTrigger
  ): Date | null {
    const hours = DEFAULT_TRIGGER_TIMING[trigger];
    if (!hours) return null;

    const reminderTime = new Date(appointmentTime);
    reminderTime.setHours(reminderTime.getHours() - hours);

    return reminderTime;
  }

  /**
   * Format date for display in SMS
   */
  static formatDateForSMS(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Format time for display in SMS
   */
  static formatTimeForSMS(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Format currency for display in SMS
   */
  static formatCurrencyForSMS(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Calculate ETA from minutes
   */
  static formatETA(etaMinutes: number): string {
    if (etaMinutes < 60) {
      return `${etaMinutes} minutes`;
    }

    const hours = Math.floor(etaMinutes / 60);
    const minutes = etaMinutes % 60;

    if (minutes === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }

    return `${hours}h ${minutes}m`;
  }

  /**
   * Generate a tracking link for the customer
   */
  static generateTrackingLink(workOrderId: string, token: string): string {
    return `https://react.ecbtx.com/track/${workOrderId}?t=${token}`;
  }

  /**
   * Generate an invoice payment link
   */
  static generateInvoiceLink(invoiceId: string, token: string): string {
    return `https://react.ecbtx.com/pay/${invoiceId}?t=${token}`;
  }

  /**
   * Check if a customer can receive SMS based on preferences
   */
  static canReceiveSMS(
    preferences: CustomerSMSPreferences,
    trigger: NotificationTrigger
  ): boolean {
    // Check if SMS is enabled and customer is opted in
    if (!preferences.sms_enabled || preferences.opt_out_status === 'opted_out') {
      return false;
    }

    // Check trigger-specific preferences
    switch (trigger) {
      case 'booking_confirmation':
        return preferences.booking_confirmation;
      case 'reminder_48h':
      case 'reminder_24h':
      case 'reminder_2h':
        return preferences.appointment_reminders;
      case 'on_my_way':
        return preferences.on_my_way_alerts;
      case 'service_complete':
        return preferences.service_complete;
      case 'invoice_sent':
        return preferences.invoice_notifications;
      case 'payment_reminder':
        return preferences.payment_reminders;
      case 'review_request':
        return preferences.review_requests;
      case 'reschedule_confirmation':
      case 'cancellation_confirmation':
        return preferences.appointment_reminders;
      case 'payment_received':
        return preferences.invoice_notifications;
      case 'custom':
        return true; // Always allow custom messages for opted-in customers
      default:
        return true;
    }
  }

  /**
   * Build common variables for a notification
   */
  static buildCommonVariables(data: {
    customerName?: string;
    customerFirstName?: string;
    appointmentDate?: Date;
    appointmentTime?: Date;
    appointmentWindow?: string;
    technicianName?: string;
    etaMinutes?: number;
    serviceType?: string;
    serviceAddress?: string;
    invoiceAmount?: number;
    invoiceLink?: string;
    trackingLink?: string;
    workOrderNumber?: string;
    companyName?: string;
    companyPhone?: string;
  }): Record<string, string> {
    const variables: Record<string, string> = {};

    if (data.customerName) variables.customer_name = data.customerName;
    if (data.customerFirstName) variables.customer_first_name = data.customerFirstName;
    if (data.appointmentDate) variables.appointment_date = this.formatDateForSMS(data.appointmentDate);
    if (data.appointmentTime) variables.appointment_time = this.formatTimeForSMS(data.appointmentTime);
    if (data.appointmentWindow) variables.appointment_window = data.appointmentWindow;
    if (data.technicianName) variables.technician_name = data.technicianName;
    if (data.etaMinutes !== undefined) {
      variables.eta_minutes = data.etaMinutes.toString();
      variables.eta_time = this.formatETA(data.etaMinutes);
    }
    if (data.serviceType) variables.service_type = data.serviceType;
    if (data.serviceAddress) variables.service_address = data.serviceAddress;
    if (data.invoiceAmount !== undefined) variables.invoice_amount = this.formatCurrencyForSMS(data.invoiceAmount);
    if (data.invoiceLink) variables.invoice_link = data.invoiceLink;
    if (data.trackingLink) variables.tracking_link = data.trackingLink;
    if (data.workOrderNumber) variables.work_order_number = data.workOrderNumber;

    // Company info defaults
    variables.company_name = data.companyName || 'MAC Septic';
    variables.company_phone = data.companyPhone || '(903) 665-0170';

    return variables;
  }

  /**
   * Validate a notification request
   */
  static validateNotificationRequest(
    request: SendNotificationRequest
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.customer_id) {
      errors.push('Customer ID is required');
    }

    if (!request.phone) {
      errors.push('Phone number is required');
    } else if (!this.isValidPhone(request.phone)) {
      errors.push('Invalid phone number format');
    }

    if (!request.template_id && !request.message) {
      errors.push('Either template_id or message is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get the opt-out message to append to SMS
   */
  static getOptOutMessage(): string {
    return '\n\nReply STOP to unsubscribe';
  }

  /**
   * Check if message already contains opt-out instructions
   */
  static hasOptOutMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('stop') &&
      (lowerMessage.includes('reply') || lowerMessage.includes('text'))
    );
  }

  /**
   * Append opt-out message if not already present
   */
  static ensureOptOutMessage(message: string): string {
    if (this.hasOptOutMessage(message)) {
      return message;
    }
    return message + this.getOptOutMessage();
  }

  /**
   * Truncate message to fit within SMS limits while preserving opt-out
   */
  static truncateMessage(message: string, maxLength: number = SMS_MAX_LENGTH): string {
    const optOutMessage = this.getOptOutMessage();

    if (message.length <= maxLength) {
      return message;
    }

    // Reserve space for opt-out message
    const availableLength = maxLength - optOutMessage.length - 3; // 3 for "..."

    return message.slice(0, availableLength) + '...' + optOutMessage;
  }
}

// =============================================================================
// Export singleton instance
// =============================================================================

export default SMSService;
