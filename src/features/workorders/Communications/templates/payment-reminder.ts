/**
 * Payment Reminder Template
 *
 * Sent when an invoice is overdue or approaching due date.
 */

export const paymentReminderTemplate = {
  id: 'payment-reminder',
  name: 'Payment Reminder',
  subject: 'Payment Reminder - Invoice {{invoice_number}}',
  smsTemplate: `Hi {{customer_first_name}}, friendly reminder: Invoice #{{invoice_number}} for {{invoice_amount}} is due {{due_date}}. Pay online: {{invoice_link}} - MAC Septic {{company_phone}}`,
  emailTemplate: `Dear {{customer_name}},

This is a friendly reminder about your outstanding invoice.

Invoice Details:
- Invoice Number: {{invoice_number}}
- Amount Due: {{invoice_amount}}
- Due Date: {{due_date}}
- Days Overdue: {{days_overdue}}

Service Information:
- Work Order: {{work_order_number}}
- Service Date: {{service_date}}
- Service Type: {{service_type}}

Payment Options:
1. Pay Online: {{invoice_link}}
2. Call us to pay by phone: {{company_phone}}
3. Mail a check to: MAC Septic, 123 Main St, City, TX 12345

Payment Plans Available:
If you need to set up a payment plan, please contact us at {{company_phone}}.

Already Paid?
If you've already made this payment, please disregard this reminder. Payments can take 1-2 business days to process.

Questions?
Contact our billing department at {{company_phone}} or reply to this email.

Thank you for your prompt attention to this matter.

Best regards,
MAC Septic Billing Department
{{company_phone}}`,
  variables: [
    'customer_name',
    'customer_first_name',
    'invoice_number',
    'invoice_amount',
    'due_date',
    'days_overdue',
    'work_order_number',
    'service_date',
    'service_type',
    'invoice_link',
    'company_phone',
  ],
};

export type PaymentReminderVariables = {
  customer_name: string;
  customer_first_name: string;
  invoice_number: string;
  invoice_amount: string;
  due_date: string;
  days_overdue: string;
  work_order_number: string;
  service_date: string;
  service_type: string;
  invoice_link: string;
  company_phone: string;
};
