import { Badge } from "@/components/ui/Badge.tsx";
import { getPaymentMethodLabel } from "@/api/types/payment.ts";

interface PaymentMethodBadgeProps {
  method: string;
}

/**
 * Payment method badge component — normalizes Clover and legacy method names
 */
export function PaymentMethodBadge({ method }: PaymentMethodBadgeProps) {
  return (
    <Badge variant="default">{getPaymentMethodLabel(method)}</Badge>
  );
}
