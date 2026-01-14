/**
 * InvoiceGenerator Component
 *
 * Create and view invoices with line items editor, totals, PDF preview, and send functionality.
 */

import { useState, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import { cn } from "@/lib/utils.ts";
import {
  type PricingLineItem,
  type Discount,
  formatCurrency,
  calculateInvoiceTotals,
  getTaxRate,
} from "./utils/pricingEngine.ts";
import { PriceCalculator } from "./PriceCalculator.tsx";
import { DiscountManager } from "./DiscountManager.tsx";
import {
  useCreateInvoice,
  useSendInvoiceEmail,
  useGenerateInvoicePDF,
} from "./hooks/usePayments.ts";

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface WorkOrderReference {
  id: string;
  jobType: string;
  scheduledDate?: string;
  status: string;
}

export interface InvoiceGeneratorProps {
  /** Customer information */
  customer: CustomerInfo;
  /** Work order reference */
  workOrder: WorkOrderReference;
  /** Initial line items */
  initialItems?: PricingLineItem[];
  /** Customer loyalty tier */
  loyaltyTier?: "bronze" | "silver" | "gold" | "platinum" | null;
  /** Callback after invoice is created */
  onInvoiceCreated?: (invoiceId: string) => void;
  /** Callback after invoice is sent */
  onInvoiceSent?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvoiceGenerator({
  customer,
  workOrder,
  initialItems = [],
  loyaltyTier,
  onInvoiceCreated,
  onInvoiceSent,
  className,
}: InvoiceGeneratorProps) {
  const [items, setItems] = useState<PricingLineItem[]>(initialItems);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "Payment due within 30 days of invoice date.",
  );
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendEmail, setSendEmail] = useState(customer.email || "");

  const createInvoiceMutation = useCreateInvoice();
  const sendInvoiceMutation = useSendInvoiceEmail();
  const generatePDFMutation = useGenerateInvoicePDF();

  // Calculate tax rate based on customer state
  const taxRate = customer.address?.state
    ? getTaxRate(customer.address.state)
    : getTaxRate("TX");

  // Calculate totals
  const totals = useMemo(() => {
    return calculateInvoiceTotals(items, taxRate, discount ?? undefined);
  }, [items, taxRate, discount]);

  // Handle items change from PriceCalculator
  const handleItemsChange = useCallback((newItems: PricingLineItem[]) => {
    setItems(newItems);
  }, []);

  // Handle discount change from DiscountManager
  const handleDiscountChange = useCallback((newDiscount: Discount | null) => {
    setDiscount(newDiscount);
  }, []);

  // Create invoice
  const handleCreateInvoice = async () => {
    if (items.length === 0) {
      return;
    }

    try {
      const invoice = await createInvoiceMutation.mutateAsync({
        workOrderId: workOrder.id,
        customerId: customer.id,
        lineItems: items,
        taxRate,
        dueDate,
        notes,
        terms,
      });

      setCreatedInvoiceId(invoice.id);
      onInvoiceCreated?.(invoice.id);
    } catch (error) {
      console.error("Failed to create invoice:", error);
    }
  };

  // Generate PDF preview
  const handlePreviewPDF = async () => {
    if (!createdInvoiceId) {
      // Create invoice first
      await handleCreateInvoice();
    }

    if (createdInvoiceId) {
      try {
        const result = await generatePDFMutation.mutateAsync(createdInvoiceId);
        window.open(result.url, "_blank");
      } catch (error) {
        console.error("Failed to generate PDF:", error);
      }
    }

    setShowPreview(true);
  };

  // Send invoice via email
  const handleSendInvoice = async () => {
    if (!createdInvoiceId || !sendEmail) {
      return;
    }

    try {
      await sendInvoiceMutation.mutateAsync({
        invoiceId: createdInvoiceId,
        email: sendEmail,
        includePaymentLink: true,
      });

      setShowSendDialog(false);
      onInvoiceSent?.();
    } catch (error) {
      console.error("Failed to send invoice:", error);
    }
  };

  // Format customer display name
  const customerName = `${customer.firstName} ${customer.lastName}`;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Customer & Work Order Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Bill To
              </h4>
              <div className="p-4 bg-bg-hover/50 rounded-lg">
                <p className="font-semibold">{customerName}</p>
                {customer.address && (
                  <div className="text-sm text-text-secondary mt-1">
                    <p>{customer.address.line1}</p>
                    {customer.address.line2 && <p>{customer.address.line2}</p>}
                    <p>
                      {customer.address.city}, {customer.address.state}{" "}
                      {customer.address.postalCode}
                    </p>
                  </div>
                )}
                {customer.email && (
                  <p className="text-sm text-text-secondary mt-2">
                    {customer.email}
                  </p>
                )}
                {customer.phone && (
                  <p className="text-sm text-text-secondary">
                    {customer.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Work Order Reference */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Work Order Reference
              </h4>
              <div className="p-4 bg-bg-hover/50 rounded-lg">
                <p className="font-semibold">WO #{workOrder.id}</p>
                <p className="text-sm text-text-secondary mt-1">
                  Type:{" "}
                  <span className="capitalize">
                    {workOrder.jobType.replace(/_/g, " ")}
                  </span>
                </p>
                {workOrder.scheduledDate && (
                  <p className="text-sm text-text-secondary">
                    Date:{" "}
                    {new Date(workOrder.scheduledDate).toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm text-text-secondary">
                  Status:{" "}
                  <span className="capitalize">
                    {workOrder.status.replace(/_/g, " ")}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div className="mt-6 max-w-xs">
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <PriceCalculator
        initialItems={items}
        stateCode={customer.address?.state || "TX"}
        discount={discount}
        onItemsChange={handleItemsChange}
      />

      {/* Discounts */}
      <DiscountManager
        subtotal={totals.subtotal}
        appliedDiscount={discount}
        loyaltyTier={loyaltyTier}
        onDiscountApplied={handleDiscountChange}
      />

      {/* Notes & Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for the customer..."
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Summary & Actions */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Summary */}
            <div className="space-y-1">
              <p className="text-sm text-text-secondary">
                {items.length} line item{items.length !== 1 ? "s" : ""}
              </p>
              <p className="text-2xl font-bold">
                Total:{" "}
                <span className="text-primary">
                  {formatCurrency(totals.total)}
                </span>
              </p>
              {totals.discountAmount > 0 && (
                <p className="text-sm text-success">
                  Savings: {formatCurrency(totals.discountAmount)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handlePreviewPDF}
                disabled={items.length === 0 || generatePDFMutation.isPending}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Preview PDF
              </Button>

              {!createdInvoiceId && (
                <Button
                  variant="secondary"
                  onClick={handleCreateInvoice}
                  disabled={
                    items.length === 0 || createInvoiceMutation.isPending
                  }
                >
                  {createInvoiceMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          opacity="0.25"
                        />
                        <path
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                        <polyline points="17,21 17,13 7,13 7,21" />
                        <polyline points="7,3 7,8 15,8" />
                      </svg>
                      Save Invoice
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="primary"
                onClick={() => setShowSendDialog(true)}
                disabled={!createdInvoiceId && items.length === 0}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22,2 15,22 11,13 2,9 22,2" />
                </svg>
                Send Invoice
              </Button>
            </div>
          </div>

          {createdInvoiceId && (
            <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-sm text-success flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
                Invoice #{createdInvoiceId} created successfully
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)}>
        <DialogContent size="xl">
          <DialogHeader onClose={() => setShowPreview(false)}>
            Invoice Preview
          </DialogHeader>
          <DialogBody>
            <div className="bg-white p-8 min-h-[600px] border rounded-lg">
              {/* Simple invoice preview */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
                {createdInvoiceId && (
                  <p className="text-gray-600">#{createdInvoiceId}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-700">Bill To:</h3>
                  <p className="text-gray-900">{customerName}</p>
                  {customer.address && (
                    <div className="text-gray-600 text-sm">
                      <p>{customer.address.line1}</p>
                      <p>
                        {customer.address.city}, {customer.address.state}{" "}
                        {customer.address.postalCode}
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gray-600">
                    Date: {new Date().toLocaleDateString()}
                  </p>
                  <p className="text-gray-600">
                    Due: {new Date(dueDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600">WO: #{workOrder.id}</p>
                </div>
              </div>

              {/* Line items table */}
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 text-gray-700">
                      Description
                    </th>
                    <th className="text-right py-2 text-gray-700">Qty</th>
                    <th className="text-right py-2 text-gray-700">Rate</th>
                    <th className="text-right py-2 text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2 text-gray-900">
                        {item.description || item.service}
                      </td>
                      <td className="text-right py-2 text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="text-right py-2 text-gray-600">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="text-right py-2 text-gray-900">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(totals.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Tax ({(taxRate * 100).toFixed(2)}%):</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {notes && (
                <div className="mt-8 pt-4 border-t">
                  <h4 className="font-semibold text-gray-700 mb-2">Notes</h4>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">
                    {notes}
                  </p>
                </div>
              )}

              {/* Terms */}
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">
                  Terms & Conditions
                </h4>
                <p className="text-gray-600 text-sm">{terms}</p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Dialog */}
      <Dialog open={showSendDialog} onClose={() => setShowSendDialog(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setShowSendDialog(false)}>
            Send Invoice
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-text-secondary">
                Send invoice to customer via email. A payment link will be
                included.
              </p>
              <div>
                <Label htmlFor="send-email">Email Address</Label>
                <Input
                  id="send-email"
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="mt-1"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowSendDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!createdInvoiceId) {
                  await handleCreateInvoice();
                }
                await handleSendInvoice();
              }}
              disabled={!sendEmail || sendInvoiceMutation.isPending}
            >
              {sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvoiceGenerator;
