import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import {
  useInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useMarkInvoicePaid,
} from "@/api/hooks/useInvoices.ts";
import {
  useGenerateInvoicePDF,
  useSendInvoiceEmail,
  useGeneratePaymentLink,
} from "@/features/workorders/Payments/hooks/usePayments.ts";
import { InvoiceForm } from "./components/InvoiceForm.tsx";
import { InvoiceStatusBadge } from "./components/InvoiceStatusBadge.tsx";
import { LineItemsTable } from "./components/LineItemsTable.tsx";
import { CustomerFinancingCard } from "@/features/financing";
import { formatDate, formatCurrency } from "@/lib/utils.ts";
import type { Invoice, InvoiceFormData } from "@/api/types/invoice.ts";
import { useAIAnalyze } from "@/hooks/useAI";
import { toastSuccess, toastError } from "@/components/ui/Toast";

/**
 * AI Payment Prediction Card
 */
function AIPaymentPrediction({ invoice }: { invoice: Invoice }) {
  const [prediction, setPrediction] = useState<{
    likelihood: number;
    daysToPayment: number;
    riskLevel: "low" | "medium" | "high";
    recommendation: string;
  } | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const analyzeAI = useAIAnalyze();

  const getPrediction = async () => {
    try {
      const result = await analyzeAI.mutateAsync({
        type: "payment_prediction",
        data: {
          invoice_id: invoice.id,
          amount: invoice.total,
          due_date: invoice.due_date,
          customer_id: invoice.customer_id,
          status: invoice.status,
        },
        question: "Predict payment likelihood and timing for this invoice",
      });
      setPrediction(result.prediction || generateDemoPrediction(invoice));
    } catch {
      setPrediction(generateDemoPrediction(invoice));
    }
    setShowPrediction(true);
  };

  function generateDemoPrediction(inv: Invoice) {
    const dueDate = inv.due_date ? new Date(inv.due_date) : new Date();
    const today = new Date();
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const amount = inv.total || 0;

    // Simulate prediction based on invoice data
    let likelihood = 85;
    let riskLevel: "low" | "medium" | "high" = "low";
    let daysToPayment = Math.max(daysUntilDue, 3);

    if (daysUntilDue < 0) {
      likelihood = 60;
      riskLevel = "medium";
      daysToPayment = 7;
    }
    if (daysUntilDue < -30) {
      likelihood = 35;
      riskLevel = "high";
      daysToPayment = 14;
    }
    if (amount > 5000) {
      likelihood -= 10;
      daysToPayment += 5;
    }

    let recommendation = "";
    if (riskLevel === "high") {
      recommendation =
        "Consider sending a personal follow-up call or offering a payment plan.";
    } else if (riskLevel === "medium") {
      recommendation =
        "Send a friendly payment reminder email with payment link.";
    } else {
      recommendation = "Payment expected on time. No action needed.";
    }

    return { likelihood, daysToPayment, riskLevel, recommendation };
  }

  if (invoice.status === "paid" || invoice.status === "void") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>✨</span>
          AI Payment Prediction
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!showPrediction ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              AI can predict when this invoice will be paid and recommend
              actions.
            </p>
            <Button
              size="sm"
              onClick={getPrediction}
              disabled={analyzeAI.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {analyzeAI.isPending ? "Analyzing..." : "Get Prediction"}
            </Button>
          </div>
        ) : prediction ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">
                Payment Likelihood
              </span>
              <span
                className={`font-bold ${
                  prediction.likelihood >= 70
                    ? "text-success"
                    : prediction.likelihood >= 40
                      ? "text-warning"
                      : "text-danger"
                }`}
              >
                {prediction.likelihood}%
              </span>
            </div>
            <div className="w-full bg-bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  prediction.likelihood >= 70
                    ? "bg-success"
                    : prediction.likelihood >= 40
                      ? "bg-warning"
                      : "bg-danger"
                }`}
                style={{ width: `${prediction.likelihood}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Expected in</span>
              <span className="text-text-primary font-medium">
                {prediction.daysToPayment} days
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Risk Level</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  prediction.riskLevel === "low"
                    ? "bg-success/20 text-success"
                    : prediction.riskLevel === "medium"
                      ? "bg-warning/20 text-warning"
                      : "bg-danger/20 text-danger"
                }`}
              >
                {prediction.riskLevel.toUpperCase()}
              </span>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-text-muted mb-1">Recommendation:</p>
              <p className="text-sm text-text-secondary">
                {prediction.recommendation}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={getPrediction}
              disabled={analyzeAI.isPending}
              className="w-full"
            >
              Refresh Prediction
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Invoice detail page - shows full invoice info with edit/delete
 */
export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: invoice, isLoading, error } = useInvoice(id);
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();
  const markPaidMutation = useMarkInvoicePaid();

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendEmailAddress, setSendEmailAddress] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Payment/PDF hooks
  const pdfMutation = useGenerateInvoicePDF();
  const emailMutation = useSendInvoiceEmail();
  const paymentLinkMutation = useGeneratePaymentLink();

  const handleUpdate = useCallback(
    async (data: InvoiceFormData) => {
      if (id) {
        await updateMutation.mutateAsync({ id, data });
        setIsEditOpen(false);
      }
    },
    [id, updateMutation],
  );

  const handleDelete = useCallback(async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate("/invoices");
    }
  }, [id, deleteMutation, navigate]);

  const handleMarkPaid = useCallback(async () => {
    if (id) {
      await markPaidMutation.mutateAsync(id);
    }
  }, [id, markPaidMutation]);

  // Download PDF handler
  const handleDownloadPDF = useCallback(async () => {
    if (!id) return;
    try {
      const result = await pdfMutation.mutateAsync(id);
      const link = document.createElement("a");
      link.href = result.url;
      link.download = `Invoice-${invoice?.invoice_number || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(result.url);
      toastSuccess("PDF Downloaded", "Invoice PDF has been downloaded.");
    } catch {
      toastError("Download Failed", "Could not generate PDF. Please try again.");
    }
  }, [id, pdfMutation, invoice?.invoice_number]);

  // Send email handler
  const handleSendEmail = useCallback(async () => {
    if (!id || !sendEmailAddress) return;
    try {
      await emailMutation.mutateAsync({
        invoiceId: id,
        email: sendEmailAddress,
        includePaymentLink: true,
      });
      setIsEmailModalOpen(false);
      setSendEmailAddress("");
      setEmailMessage("");
      toastSuccess("Invoice Sent", `Invoice sent to ${sendEmailAddress}`);
    } catch {
      toastError("Send Failed", "Could not send invoice. Please try again.");
    }
  }, [id, sendEmailAddress, emailMutation]);

  // Pay online handler
  const handlePayOnline = useCallback(async () => {
    if (!id) return;
    try {
      const result = await paymentLinkMutation.mutateAsync(id);
      window.open(result.url, "_blank");
    } catch {
      toastError("Payment Link Failed", "Could not generate payment link.");
    }
  }, [id, paymentLinkMutation]);

  // Print handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted rounded w-1/4 mb-6" />
          <div className="h-64 bg-bg-muted rounded mb-4" />
          <div className="h-48 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">404</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Invoice Not Found
            </h2>
            <p className="text-text-secondary mb-4">
              The invoice you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/invoices">
              <Button variant="secondary">Back to Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName =
    invoice.customer_name ||
    (invoice.customer
      ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
      : `Customer #${invoice.customer_id}`);

  return (
    <div className="p-6 print:p-0 print:bg-white">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            to="/invoices"
            className="text-text-secondary hover:text-text-primary"
          >
            &larr; Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-text-primary">
                Invoice {invoice.invoice_number || invoice.id.slice(0, 8)}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-text-secondary mt-1">
              For {customerName}
            </p>
          </div>
        </div>

        {/* Premium Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF */}
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={pdfMutation.isPending}
            className="min-h-[44px] sm:min-h-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {pdfMutation.isPending ? "Generating..." : "Download PDF"}
          </Button>

          {/* Send Email */}
          <Button
            variant="outline"
            onClick={() => {
              setSendEmailAddress(invoice.customer?.email || "");
              setIsEmailModalOpen(true);
            }}
            className="min-h-[44px] sm:min-h-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Send Email
          </Button>

          {/* Print */}
          <Button
            variant="ghost"
            onClick={handlePrint}
            className="min-h-[44px] sm:min-h-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </Button>

          {/* Pay Online - only for unpaid invoices */}
          {invoice.status !== "paid" && invoice.status !== "void" && (
            <Button
              variant="primary"
              onClick={handlePayOnline}
              disabled={paymentLinkMutation.isPending}
              className="min-h-[44px] sm:min-h-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              {paymentLinkMutation.isPending ? "Loading..." : "Pay Online"}
            </Button>
          )}

          {/* Mark as Paid */}
          {invoice.status !== "paid" && invoice.status !== "void" && (
            <Button
              variant="secondary"
              onClick={handleMarkPaid}
              disabled={markPaidMutation.isPending}
              className="min-h-[44px] sm:min-h-0"
            >
              {markPaidMutation.isPending ? "Processing..." : "Mark Paid"}
            </Button>
          )}

          {/* Edit */}
          <Button
            variant="secondary"
            onClick={() => setIsEditOpen(true)}
            className="min-h-[44px] sm:min-h-0"
          >
            Edit
          </Button>

          {/* Delete */}
          <Button
            variant="danger"
            onClick={() => setIsDeleteOpen(true)}
            className="min-h-[44px] sm:min-h-0"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Print Header - only visible when printing */}
      <div className="hidden print:block mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-lg text-gray-600 mt-1">
              {invoice.invoice_number || invoice.id.slice(0, 8)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Date: {formatDate(invoice.created_at)}
            </p>
            <p className="text-sm text-gray-600">
              Due: {invoice.due_date ? formatDate(invoice.due_date) : "On Receipt"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary text-lg">
                    {customerName}
                  </p>
                  {invoice.customer?.email && (
                    <a
                      href={"mailto:" + invoice.customer.email}
                      className="text-text-link hover:underline block mt-1"
                    >
                      {invoice.customer.email}
                    </a>
                  )}
                  {invoice.customer?.phone && (
                    <a
                      href={"tel:" + invoice.customer.phone}
                      className="text-text-link hover:underline block"
                    >
                      {invoice.customer.phone}
                    </a>
                  )}
                </div>
                <Link to={`/customers/${invoice.customer_id}`}>
                  <Button variant="ghost" size="sm">
                    View Customer
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <LineItemsTable
                lineItems={invoice.line_items}
                onChange={() => {}}
                readOnly
              />
            </CardContent>
          </Card>

          {/* Premium Totals */}
          <Card className="print:border-gray-300">
            <CardContent className="py-6">
              <div className="w-full sm:w-72 ml-auto space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-text-secondary">Subtotal</span>
                  <span className="text-text-primary font-medium">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>

                {invoice.tax > 0 && (
                  <div className="flex justify-between text-base">
                    <span className="text-text-secondary">
                      Tax ({invoice.tax_rate}%)
                    </span>
                    <span className="text-text-primary font-medium">
                      {formatCurrency(invoice.tax)}
                    </span>
                  </div>
                )}

                <div className="border-t border-border pt-3 mt-3" />

                <div className="flex justify-between text-2xl font-bold">
                  <span className="text-text-primary">Total</span>
                  <span className="text-primary">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>

                {/* Show payment status for paid invoices */}
                {invoice.status === "paid" && invoice.paid_date && (
                  <div className="flex items-center justify-end gap-2 text-success mt-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="font-medium">
                      Paid on {formatDate(invoice.paid_date)}
                    </span>
                  </div>
                )}

                {/* Balance due for unpaid */}
                {invoice.status !== "paid" && invoice.status !== "void" && (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-3">
                    <div className="flex justify-between text-lg font-semibold text-warning">
                      <span>Balance Due</span>
                      <span>{formatCurrency(invoice.total)}</span>
                    </div>
                    {invoice.due_date && (
                      <p className="text-sm text-text-muted mt-1">
                        Due by {formatDate(invoice.due_date)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoice.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">
                      Notes
                    </h4>
                    <p className="text-text-primary whitespace-pre-wrap">
                      {invoice.notes}
                    </p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">
                      Payment Terms
                    </h4>
                    <p className="text-text-primary whitespace-pre-wrap">
                      {invoice.terms}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-6">
          {/* AI Payment Prediction */}
          <AIPaymentPrediction invoice={invoice} />

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-text-muted">Invoice Number</dt>
                  <dd className="text-text-primary font-medium font-mono text-sm">
                    {invoice.invoice_number || invoice.id.slice(0, 8)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Status</dt>
                  <dd>
                    <InvoiceStatusBadge status={invoice.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Due Date</dt>
                  <dd className="text-text-primary font-medium">
                    {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                  </dd>
                </div>
                {invoice.paid_date && (
                  <div>
                    <dt className="text-sm text-text-muted">Paid Date</dt>
                    <dd className="text-text-primary font-medium">
                      {formatDate(invoice.paid_date)}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Related Work Order */}
          {invoice.work_order_id && (
            <Card>
              <CardHeader>
                <CardTitle>Related Work Order</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to={`/work-orders/${invoice.work_order_id}`}>
                  <Button variant="ghost" size="sm" className="w-full">
                    View Work Order
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Financing Options - show for unpaid invoices */}
          {invoice.status !== "paid" &&
            invoice.status !== "void" &&
            invoice.total >= 500 && (
              <CustomerFinancingCard
                customerId={String(invoice.customer_id)}
                customerEmail={invoice.customer?.email ?? undefined}
                invoiceId={invoice.id}
                amount={invoice.total}
                onFinancingApplied={() => {
                  // Optionally refresh invoice or show success message
                }}
              />
            )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Record Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-text-muted">Invoice ID</dt>
                  <dd className="text-text-primary font-mono text-xs break-all">
                    {invoice.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Created</dt>
                  <dd className="text-text-primary">
                    {invoice.created_at ? formatDate(invoice.created_at) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Last Updated</dt>
                  <dd className="text-text-primary">
                    {invoice.updated_at ? formatDate(invoice.updated_at) : "-"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <InvoiceForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        invoice={invoice}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setIsDeleteOpen(false)}>
            Delete Invoice
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete invoice{" "}
              <span className="font-medium text-text-primary">
                {invoice.invoice_number || invoice.id}
              </span>
              ? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Compose Modal */}
      <Dialog open={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)}>
        <DialogContent size="md">
          <DialogHeader onClose={() => setIsEmailModalOpen(false)}>
            Send Invoice via Email
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-to">Recipient Email</Label>
                <Input
                  id="email-to"
                  type="email"
                  value={sendEmailAddress}
                  onChange={(e) => setSendEmailAddress(e.target.value)}
                  placeholder="customer@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email-message">Personal Message (optional)</Label>
                <Textarea
                  id="email-message"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Add a personal note to include with the invoice..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="bg-bg-muted/50 rounded-lg p-3 text-sm text-text-muted">
                <p className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  A secure payment link will be included in the email.
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsEmailModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSendEmail}
              disabled={!sendEmailAddress || emailMutation.isPending}
            >
              {emailMutation.isPending ? (
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
                  Sending...
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
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22,2 15,22 11,13 2,9 22,2" />
                  </svg>
                  Send Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
