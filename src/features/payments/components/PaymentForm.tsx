import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox.tsx";
import {
  paymentFormSchema,
  type PaymentFormData,
  type Payment,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type PaymentMethod,
  type PaymentStatus,
} from "@/api/types/payment.ts";
import { useInvoices } from "@/api/hooks/useInvoices.ts";

export interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  payment?: Payment | null;
  isLoading?: boolean;
  prefilledInvoiceId?: string;
  prefilledCustomerId?: string;
}

/**
 * Payment record form modal
 */
export function PaymentForm({
  open,
  onClose,
  onSubmit,
  payment,
  isLoading,
  prefilledInvoiceId,
  prefilledCustomerId,
}: PaymentFormProps) {
  const isEdit = !!payment;

  // Fetch invoices for dropdown
  const { data: invoicesData } = useInvoices({ page: 1, page_size: 100 });

  const invoices = invoicesData?.items || [];

  // Get today's date for default payment_date
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: payment
      ? {
          invoice_id: payment.invoice_id || "",
          customer_id: String(payment.customer_id),
          amount: payment.amount,
          payment_method: payment.payment_method as PaymentMethod,
          status: payment.status as PaymentStatus,
          transaction_id: payment.transaction_id || "",
          reference_number: payment.reference_number || "",
          notes: payment.notes || "",
          payment_date: payment.payment_date || today,
        }
      : {
          invoice_id: prefilledInvoiceId || "",
          customer_id: prefilledCustomerId || "",
          amount: 0,
          payment_method: "card" as PaymentMethod,
          status: "completed" as PaymentStatus,
          transaction_id: "",
          reference_number: "",
          notes: "",
          payment_date: today,
        },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: PaymentFormData) => {
    // Clean up empty strings to undefined
    const cleanedData: PaymentFormData = {
      ...data,
      invoice_id: data.invoice_id || undefined,
      transaction_id: data.transaction_id || undefined,
      reference_number: data.reference_number || undefined,
      notes: data.notes || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="md">
        <DialogHeader onClose={handleClose}>
          {isEdit ? "Edit Payment" : "Record Payment"}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit as (data: PaymentFormData) => void)}>
          <DialogBody className="space-y-6">
            {/* Customer & Invoice */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Payment Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <CustomerCombobox
                    value={watch("customer_id") || ""}
                    onChange={(id) => setValue("customer_id", id, { shouldValidate: true })}
                    disabled={isLoading}
                    error={errors.customer_id?.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_id">Invoice (Optional)</Label>
                  <Select id="invoice_id" {...register("invoice_id")}>
                    <option value="">None</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number || inv.id.slice(0, 8)} -{" "}
                        {inv.customer_name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" required>
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("amount")}
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-sm text-danger">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_date" required>
                    Payment Date
                  </Label>
                  <Input
                    id="payment_date"
                    type="date"
                    {...register("payment_date")}
                  />
                  {errors.payment_date && (
                    <p className="text-sm text-danger">
                      {errors.payment_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method" required>
                    Payment Method
                  </Label>
                  <Select id="payment_method" {...register("payment_method")}>
                    {(
                      Object.entries(PAYMENT_METHOD_LABELS) as [
                        PaymentMethod,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" {...register("status")}>
                    {(
                      Object.entries(PAYMENT_STATUS_LABELS) as [
                        PaymentStatus,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Transaction Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_id">Transaction ID</Label>
                  <Input
                    id="transaction_id"
                    {...register("transaction_id")}
                    placeholder="TXN-12345"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    {...register("reference_number")}
                    placeholder="REF-67890"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Additional Notes
              </h4>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Payment notes or details..."
                  rows={3}
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
