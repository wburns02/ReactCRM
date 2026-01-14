/**
 * Technician En Route Template
 *
 * Sent when a technician marks themselves as en route to the job site.
 */

export const technicianEnrouteTemplate = {
  id: "technician-enroute",
  name: "Technician En Route",
  subject: "Your Technician is On the Way!",
  smsTemplate: `Hi {{customer_first_name}}, {{technician_name}} is on the way! ETA: {{eta_time}} ({{eta_minutes}} min). Track live: {{tracking_link}} - MAC Septic`,
  emailTemplate: `Dear {{customer_name}},

Great news! Your MAC Septic technician is on the way to your location.

Arrival Details:
- Technician: {{technician_name}}
- Estimated Arrival: {{eta_time}}
- ETA: Approximately {{eta_minutes}} minutes

Service Information:
- Work Order: {{work_order_number}}
- Service Type: {{service_type}}
- Service Address: {{service_address}}

Track Your Technician in Real-Time:
{{tracking_link}}

Please ensure access to the service area is available when our technician arrives.

Questions? Call us at {{company_phone}}

Thank you for choosing MAC Septic!

Best regards,
MAC Septic Team`,
  variables: [
    "customer_name",
    "customer_first_name",
    "technician_name",
    "eta_time",
    "eta_minutes",
    "tracking_link",
    "work_order_number",
    "service_type",
    "service_address",
    "company_phone",
  ],
};

export type TechnicianEnrouteVariables = {
  customer_name: string;
  customer_first_name: string;
  technician_name: string;
  eta_time: string;
  eta_minutes: string;
  tracking_link: string;
  work_order_number: string;
  service_type: string;
  service_address: string;
  company_phone: string;
};
