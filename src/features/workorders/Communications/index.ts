/**
 * Communications Feature Index
 *
 * Export all communication components and hooks.
 */

// Main components
export { NotificationCenter } from './NotificationCenter.tsx';
export { SMSConversation } from './SMSConversation.tsx';
export { EmailComposer } from './EmailComposer.tsx';
export { AutomatedReminders } from './AutomatedReminders.tsx';
export { CustomerPortalLink } from './CustomerPortalLink.tsx';
export { VoiceCallLog } from './VoiceCallLog.tsx';
export { NotificationTemplates } from './NotificationTemplates.tsx';

// Hooks
export {
  useSendSMS,
  useSendEmail,
  useNotificationHistory,
  useConversation,
  useCommunications,
  useResendNotification,
  useScheduledNotifications,
  useCancelScheduledNotification,
  useCustomerSMSPreferences,
  useUpdateSMSPreferences,
  useSMSDeliveryStats,
  useGeneratePortalLink,
  useVoiceCallLog,
  useAddCallNote,
  useSendTestNotification,
  communicationKeys,
  type VoiceCall,
} from './hooks/useCommunications.ts';

// Templates
export {
  ALL_TEMPLATES,
  getTemplateById,
  renderTemplate,
  extractVariables,
  validateVariables,
  appointmentConfirmationTemplate,
  technicianEnrouteTemplate,
  serviceCompleteTemplate,
  paymentReminderTemplate,
  type NotificationTemplate,
} from './templates/index.ts';
