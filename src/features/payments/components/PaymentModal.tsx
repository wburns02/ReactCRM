import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
} from "@/components/ui/Dialog";
import { StripeCheckout } from "./StripeCheckout";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  customerEmail?: string;
  onSuccess?: () => void;
}

/**
 * Payment Modal - wraps Stripe Checkout in a modal dialog
 */
export function PaymentModal({
  open,
  onClose,
  invoiceId,
  invoiceNumber,
  amount,
  customerEmail,
  onSuccess,
}: PaymentModalProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="md">
        <DialogHeader onClose={onClose}>
          Pay Invoice #{invoiceNumber}
        </DialogHeader>
        <DialogBody>
          <StripeCheckout
            invoiceId={invoiceId}
            amount={amount}
            customerEmail={customerEmail}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
