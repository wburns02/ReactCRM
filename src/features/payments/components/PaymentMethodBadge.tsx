import { Badge } from '@/components/ui/Badge.tsx';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/api/types/payment.ts';

interface PaymentMethodBadgeProps {
  method: PaymentMethod;
}

/**
 * Payment method badge component
 */
export function PaymentMethodBadge({ method }: PaymentMethodBadgeProps) {
  return (
    <Badge variant="default">
      {PAYMENT_METHOD_LABELS[method] || method}
    </Badge>
  );
}
