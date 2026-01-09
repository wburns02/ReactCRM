/**
 * Communication Templates Index
 *
 * Export all notification templates and their types.
 */

export { appointmentConfirmationTemplate, type AppointmentConfirmationVariables } from './appointment-confirmation.ts';
export { technicianEnrouteTemplate, type TechnicianEnrouteVariables } from './technician-enroute.ts';
export { serviceCompleteTemplate, type ServiceCompleteVariables } from './service-complete.ts';
export { paymentReminderTemplate, type PaymentReminderVariables } from './payment-reminder.ts';

/**
 * Template definition interface
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  smsTemplate: string;
  emailTemplate: string;
  variables: string[];
}

/**
 * All available templates
 */
import { appointmentConfirmationTemplate } from './appointment-confirmation.ts';
import { technicianEnrouteTemplate } from './technician-enroute.ts';
import { serviceCompleteTemplate } from './service-complete.ts';
import { paymentReminderTemplate } from './payment-reminder.ts';

export const ALL_TEMPLATES: NotificationTemplate[] = [
  appointmentConfirmationTemplate,
  technicianEnrouteTemplate,
  serviceCompleteTemplate,
  paymentReminderTemplate,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): NotificationTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

/**
 * Replace template variables with actual values
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Extract variable names from a template string
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  template: NotificationTemplate,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing = template.variables.filter(
    (v) => !variables[v] || variables[v].trim() === ''
  );
  return {
    valid: missing.length === 0,
    missing,
  };
}
