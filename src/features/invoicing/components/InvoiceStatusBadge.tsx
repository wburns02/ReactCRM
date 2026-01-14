import { Badge } from "@/components/ui/Badge.tsx";
import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/api/types/invoice.ts";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

/**
 * Get badge variant based on invoice status
 */
function getStatusVariant(
  status: InvoiceStatus,
): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case "paid":
      return "success";
    case "sent":
      return "default";
    case "draft":
      return "warning";
    case "overdue":
      return "danger";
    case "void":
      return "danger";
    default:
      return "default";
  }
}

/**
 * Invoice status badge component
 */
export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return (
    <Badge variant={getStatusVariant(status)}>
      {INVOICE_STATUS_LABELS[status] || status}
    </Badge>
  );
}
