/**
 * Appointment Confirmation Template
 *
 * Sent immediately when an appointment is booked or confirmed.
 */

export const appointmentConfirmationTemplate = {
  id: 'appointment-confirmation',
  name: 'Appointment Confirmation',
  subject: 'Your MAC Septic Appointment is Confirmed',
  smsTemplate: `Hi {{customer_first_name}}, your septic service appointment is confirmed for {{appointment_date}} between {{appointment_window}}. Reply CONFIRM to confirm or call us at {{company_phone}} to reschedule. - MAC Septic`,
  emailTemplate: `Dear {{customer_name}},

Thank you for scheduling your septic service with MAC Septic!

Your appointment details:
- Date: {{appointment_date}}
- Time Window: {{appointment_window}}
- Service Type: {{service_type}}
- Service Address: {{service_address}}

What to Expect:
1. Our technician will arrive within your scheduled time window
2. You'll receive an "On My Way" notification when they're en route
3. If you need access arrangements, please let us know in advance

Need to reschedule?
Call us at {{company_phone}} or reply to this email.

Track your appointment:
{{tracking_link}}

We look forward to serving you!

Best regards,
MAC Septic
{{company_phone}}`,
  variables: [
    'customer_name',
    'customer_first_name',
    'appointment_date',
    'appointment_window',
    'service_type',
    'service_address',
    'company_phone',
    'tracking_link',
    'work_order_number',
  ],
};

export type AppointmentConfirmationVariables = {
  customer_name: string;
  customer_first_name: string;
  appointment_date: string;
  appointment_window: string;
  service_type: string;
  service_address: string;
  company_phone: string;
  tracking_link: string;
  work_order_number: string;
};
