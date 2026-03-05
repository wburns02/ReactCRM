export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  work_order_status_changed: "Work Order Status Changed",
  payment_received: "Payment Received",
  invoice_overdue: "Invoice Overdue",
  new_customer_created: "New Customer Created",
  contract_expiring: "Contract Expiring Soon",
  service_interval_due: "Service Interval Due",
  manual_trigger: "Manual Trigger",
  custom_webhook: "Custom Webhook",
  service_completed: "Service Completed",
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  send_sms: "Send SMS",
  send_email: "Send Email",
  create_work_order: "Create Work Order",
  generate_invoice: "Generate Invoice",
  update_field: "Update Field",
  create_task: "Create Task",
  add_note: "Add Note",
  webhook: "Webhook",
};

export const CONDITION_TYPE_LABELS: Record<string, string> = {
  check_field_value: "Check Field Value",
  check_customer_tag: "Check Customer Tag",
  check_service_type: "Check Service Type",
  check_amount: "Check Amount",
  time_window: "Time Window",
};

export const TEMPLATE_VARIABLES = [
  "{{customer_name}}",
  "{{customer_phone}}",
  "{{customer_email}}",
  "{{work_order_id}}",
  "{{invoice_id}}",
  "{{amount}}",
  "{{service_type}}",
  "{{status}}",
];

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-100", text: "text-green-800" },
  paused: { bg: "bg-yellow-100", text: "text-yellow-800" },
  draft: { bg: "bg-gray-100", text: "text-gray-800" },
};

export const CATEGORY_COLORS: Record<string, string> = {
  trigger: "border-l-blue-500",
  condition: "border-l-amber-500",
  action: "border-l-emerald-500",
  delay: "border-l-purple-500",
};

export const CATEGORY_BG: Record<string, string> = {
  trigger: "bg-blue-50",
  condition: "bg-amber-50",
  action: "bg-emerald-50",
  delay: "bg-purple-50",
};
