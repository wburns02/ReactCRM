/**
 * Service Complete Template
 *
 * Sent when a work order is marked as completed.
 */

export const serviceCompleteTemplate = {
  id: "service-complete",
  name: "Service Complete",
  subject: "Your MAC Septic Service is Complete",
  smsTemplate: `Hi {{customer_first_name}}, your septic service is complete! View invoice: {{invoice_link}}. Total: {{invoice_amount}}. Thank you for choosing MAC Septic! {{company_phone}}`,
  emailTemplate: `Dear {{customer_name}},

Your septic service has been completed successfully!

Service Summary:
- Work Order: {{work_order_number}}
- Service Type: {{service_type}}
- Service Address: {{service_address}}
- Technician: {{technician_name}}
- Completed: {{completion_date}}

Invoice Details:
- Amount Due: {{invoice_amount}}
- View/Pay Invoice: {{invoice_link}}

What Happens Next:
1. Review your invoice at the link above
2. Pay online or call us to arrange payment
3. Your service records are stored in our system for future reference

Maintenance Recommendations:
Based on your service, we recommend scheduling your next pumping in approximately 2-3 years. We'll send you a reminder when it's time!

Questions about your service?
Call us at {{company_phone}} or reply to this email.

We Value Your Feedback:
Please take a moment to leave us a review: {{review_link}}

Thank you for your business!

Best regards,
MAC Septic
{{company_phone}}`,
  variables: [
    "customer_name",
    "customer_first_name",
    "work_order_number",
    "service_type",
    "service_address",
    "technician_name",
    "completion_date",
    "invoice_amount",
    "invoice_link",
    "company_phone",
    "review_link",
  ],
};

export type ServiceCompleteVariables = {
  customer_name: string;
  customer_first_name: string;
  work_order_number: string;
  service_type: string;
  service_address: string;
  technician_name: string;
  completion_date: string;
  invoice_amount: string;
  invoice_link: string;
  company_phone: string;
  review_link: string;
};
