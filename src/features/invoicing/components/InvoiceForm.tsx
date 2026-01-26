import { useEffect, useState } from "react";
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
import { LineItemsTable } from "./LineItemsTable.tsx";
import {
  invoiceFormSchema,
  type InvoiceFormData,
  type Invoice,
  type LineItemFormData,
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/api/types/invoice.ts";
import { useCustomers } from "@/api/hooks/useCustomers.ts";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { formatCurrency } from "@/lib/utils.ts";

export interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  invoice?: Invoice | null;
  isLoading?: boolean;
}

/**
 * Invoice create/edit form modal
 */
export function InvoiceForm({
  open,
  onClose,
  onSubmit,
  invoice,
  isLoading,
}: InvoiceFormProps) {
  const isEdit = !!invoice;

  // Fetch customers and work orders for dropdowns
  const { data: customersData } = useCustomers({ page: 1, page_size: 200 });
  const { data: workOrdersData } = useWorkOrders({ page: 1, page_size: 200 });

  const customers = customersData?.items || [];
  const workOrders = workOrdersData?.items || [];

  // Local state for line items (needed for real-time calculations)
  const [lineItems, setLineItems] = useState<LineItemFormData[]>(
    invoice?.line_items || [
      { service: "", description: "", quantity: 1, rate: 0 },
    ],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<InvoiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: invoice
      ? {
          customer_id: Number(invoice.customer_id),
          work_order_id: invoice.work_order_id || "",
          status: invoice.status as InvoiceStatus,
          line_items: invoice.line_items,
          tax_rate: invoice.tax_rate || 0,
          due_date: invoice.due_date || "",
          notes: invoice.notes || "",
          terms: invoice.terms || "",
        }
      : {
          customer_id: 0,
          work_order_id: "",
          status: "draft" as InvoiceStatus,
          line_items: [{ service: "", description: "", quantity: 1, rate: 0 }],
          tax_rate: 0,
          due_date: "",
          notes: "",
          terms: "Payment due within 30 days",
        },
  });

  const taxRate = watch("tax_rate") || 0;

  // Update form when line items change
  useEffect(() => {
    setValue("line_items", lineItems, { shouldValidate: true });
  }, [lineItems, setValue]);

  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0,
  );
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleClose = () => {
    reset();
    setLineItems([{ service: "", description: "", quantity: 1, rate: 0 }]);
    onClose();
  };

  const handleFormSubmit = async (data: InvoiceFormData) => {
    // Clean up empty strings to undefined
    const cleanedData: InvoiceFormData = {
      ...data,
      work_order_id: data.work_order_id || undefined,
      due_date: data.due_date || undefined,
      notes: data.notes || undefined,
      terms: data.terms || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="2xl">
        <DialogHeader onClose={handleClose}>
          {isEdit ? "Edit Invoice" : "Create Invoice"}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Customer & Work Order */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Customer Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_id" required>
                    Customer
                  </Label>
                  <Select
                    id="customer_id"
                    {...register("customer_id")}
                    disabled={isEdit}
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </Select>
                  {errors.customer_id && (
                    <p className="text-sm text-danger">
                      {errors.customer_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_order_id">Work Order (Optional)</Label>
                  <Select id="work_order_id" {...register("work_order_id")}>
                    <option value="">None</option>
                    {workOrders.map((wo) => (
                      <option key={wo.id} value={wo.id}>
                        {wo.customer_name} - {wo.job_type} (
                        {wo.scheduled_date || "Unscheduled"})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" {...register("status")}>
                    {(
                      Object.entries(INVOICE_STATUS_LABELS) as [
                        InvoiceStatus,
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
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input id="due_date" type="date" {...register("due_date")} />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Line Items
              </h4>
              <LineItemsTable lineItems={lineItems} onChange={setLineItems} />
              {errors.line_items && (
                <p className="text-sm text-danger mt-2">
                  {errors.line_items.message}
                </p>
              )}
            </div>

            {/* Tax & Totals */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Tax & Totals
              </h4>
              <div className="space-y-3">
                <div className="flex items-end gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      {...register("tax_rate")}
                      placeholder="0"
                      className="w-28 text-center"
                    />
                  </div>
                </div>
                <div className="bg-bg-muted p-4 rounded-md space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Subtotal:</span>
                    <span className="text-text-primary font-medium">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">
                      Tax ({taxRate}%):
                    </span>
                    <span className="text-text-primary font-medium">
                      {formatCurrency(tax)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
                    <span className="text-text-primary">Total:</span>
                    <span className="text-text-primary">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Additional Information
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Internal notes about this invoice..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terms">Payment Terms</Label>
                  <Textarea
                    id="terms"
                    {...register("terms")}
                    placeholder="Payment due within 30 days"
                    rows={2}
                  />
                </div>
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
                  : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
