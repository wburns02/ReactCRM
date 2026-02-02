import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
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
  useSendInvoice,
  useMarkInvoicePaid,
  invoiceKeys,
} from "@/api/hooks/useInvoices.ts";
import { InvoiceForm } from "./components/InvoiceForm.tsx";
import { InvoiceStatusBadge } from "./components/InvoiceStatusBadge.tsx";
import { LineItemsTable } from "./components/LineItemsTable.tsx";
import { CustomerFinancingCard } from "@/features/financing";
import { StripeCheckout } from "@/features/payments/components/StripeCheckout.tsx";
import { formatDate, formatCurrency, isValidId } from "@/lib/utils.ts";
import type { Invoice, InvoiceFormData } from "@/api/types/invoice.ts";
import { useAIAnalyze } from "@/hooks/useAI";
import { CreditCard } from "lucide-react";

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
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, error } = useInvoice(id);
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();
  const sendMutation = useSendInvoice();
  const markPaidMutation = useMarkInvoicePaid();

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Handle successful payment
  const handlePaymentSuccess = useCallback(() => {
    setIsPaymentOpen(false);
    // Refresh invoice data
    queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id!) });
  }, [id, queryClient]);

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

  const handleSend = useCallback(async () => {
    if (id) {
      await sendMutation.mutateAsync(id);
    }
  }, [id, sendMutation]);

  const handleMarkPaid = useCallback(async () => {
    if (id) {
      await markPaidMutation.mutateAsync(id);
    }
  }, [id, markPaidMutation]);

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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
        <div className="flex items-center gap-2">
          {invoice.status === "draft" && (
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? "Sending..." : "Send Invoice"}
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "void" && (
            <>
              <Button
                variant="primary"
                onClick={() => setIsPaymentOpen(true)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Now
              </Button>
              <Button
                variant="secondary"
                onClick={handleMarkPaid}
                disabled={markPaidMutation.isPending}
              >
                {markPaidMutation.isPending ? "Processing..." : "Mark as Paid"}
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </Button>
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
                {(invoice.customer?.id || isValidId(invoice.customer_id)) && (
                  <Link
                    to={`/customers/${invoice.customer?.id || invoice.customer_id}`}
                  >
                    <Button variant="ghost" size="sm">
                      View Customer
                    </Button>
                  </Link>
                )}
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

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-text-secondary">Subtotal:</span>
                  <span className="text-text-primary font-medium">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-text-secondary">
                    Tax ({invoice.tax_rate}%):
                  </span>
                  <span className="text-text-primary font-medium">
                    {formatCurrency(invoice.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-semibold border-t border-border pt-3">
                  <span className="text-text-primary">Total:</span>
                  <span className="text-text-primary">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
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
            invoice.total >= 500 &&
            isValidId(invoice.customer_id) && (
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

      {/* Payment Modal */}
      <Dialog open={isPaymentOpen} onClose={() => setIsPaymentOpen(false)}>
        <DialogContent size="md">
          <StripeCheckout
            invoiceId={invoice.id}
            amount={invoice.total}
            customerEmail={invoice.customer?.email}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setIsPaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
