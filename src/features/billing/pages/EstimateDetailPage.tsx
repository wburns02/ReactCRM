import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  useAcceptQuote,
  useDeclineQuote,
  useSendQuote,
} from "@/api/hooks/useQuotes";
import { type QuoteStatus } from "@/api/types/quote";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { EstimateStatusBar } from "../components/EstimateStatusBar";
import { jsPDF } from "jspdf";

/**
 * Generate and download a PDF for the given estimate data.
 * Uses jsPDF for client-side generation - no backend dependency.
 */
function generateEstimatePDF(estimate: Record<string, unknown>) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // --- Header ---
  doc.setFillColor(79, 70, 229); // indigo
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MAC SEPTIC SERVICES", 15, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Professional Septic Solutions  |  Texas Licensed & Insured",
    15,
    26,
  );

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATE", pageWidth - 15, 18, { align: "right" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const quoteNumber = (estimate.quote_number as string) || `EST-${estimate.id}`;
  doc.text(quoteNumber, pageWidth - 15, 28, { align: "right" });

  doc.setTextColor(0, 0, 0);
  y = 50;

  // --- Estimate Info ---
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("ESTIMATE DATE", 15, y);
  doc.text("VALID UNTIL", 80, y);
  doc.text("STATUS", 145, y);
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");

  let createdDate = "N/A";
  if (estimate.created_at) {
    try {
      createdDate = new Date(estimate.created_at as string).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
    } catch {
      createdDate = String(estimate.created_at).slice(0, 10);
    }
  }

  let validUntil = "N/A";
  if (estimate.valid_until) {
    try {
      validUntil = new Date(estimate.valid_until as string).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
    } catch {
      validUntil = String(estimate.valid_until).slice(0, 10);
    }
  }

  doc.text(createdDate, 15, y);
  doc.text(validUntil, 80, y);
  doc.setFont("helvetica", "bold");
  doc.text(((estimate.status as string) || "draft").toUpperCase(), 145, y);
  doc.setFont("helvetica", "normal");

  y += 14;

  // --- Customer Info ---
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(15, y - 4, pageWidth - 30, 36, 3, 3, "F");

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("BILL TO", 20, y + 2);
  y += 8;

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text((estimate.customer_name as string) || "Customer", 20, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  if (estimate.customer_address) {
    doc.text(estimate.customer_address as string, 20, y);
    y += 5;
  }

  const contactParts: string[] = [];
  if (estimate.customer_email)
    contactParts.push(estimate.customer_email as string);
  if (estimate.customer_phone)
    contactParts.push(estimate.customer_phone as string);
  if (contactParts.length > 0) {
    doc.text(contactParts.join("  |  "), 20, y);
  }

  y += 16;

  // --- Line Items Table ---
  const lineItems =
    (estimate.line_items as Array<Record<string, unknown>>) || [];

  // Table header
  doc.setFillColor(79, 70, 229);
  doc.rect(15, y, pageWidth - 30, 10, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", 20, y + 7);
  doc.text("QTY", 115, y + 7);
  doc.text("RATE", 140, y + 7);
  doc.text("AMOUNT", pageWidth - 20, y + 7, { align: "right" });

  y += 14;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (lineItems.length === 0) {
    doc.setTextColor(150, 150, 150);
    doc.text("No line items", pageWidth / 2, y + 4, { align: "center" });
    y += 12;
  } else {
    for (const item of lineItems) {
      const desc =
        (item.service as string) || (item.description as string) || "";
      const qty = Number(item.quantity || 1);
      const rate = Number(item.rate || 0);
      const amount = Number(item.amount || qty * rate);

      // Zebra stripe
      if (lineItems.indexOf(item) % 2 === 1) {
        doc.setFillColor(250, 250, 252);
        doc.rect(15, y - 4, pageWidth - 30, 10, "F");
      }

      doc.setTextColor(30, 30, 30);
      doc.text(desc, 20, y + 2);
      doc.text(String(qty), 115, y + 2);
      doc.text(`$${rate.toFixed(2)}`, 140, y + 2);
      doc.text(`$${amount.toFixed(2)}`, pageWidth - 20, y + 2, {
        align: "right",
      });

      // Bottom border
      doc.setDrawColor(230, 230, 230);
      doc.line(15, y + 6, pageWidth - 15, y + 6);

      y += 10;

      // Page break if needed
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    }
  }

  y += 6;

  // --- Totals ---
  const totalsX = 130;
  const valuesX = pageWidth - 20;

  const subtotal = Number(estimate.subtotal || 0);
  const taxRate = Number(estimate.tax_rate || 0);
  const tax = Number(estimate.tax || 0);
  const total = Number(estimate.total || 0);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal", totalsX, y);
  doc.setTextColor(30, 30, 30);
  doc.text(`$${subtotal.toFixed(2)}`, valuesX, y, { align: "right" });
  y += 7;

  doc.setTextColor(100, 100, 100);
  doc.text(`Tax (${taxRate}%)`, totalsX, y);
  doc.setTextColor(30, 30, 30);
  doc.text(`$${tax.toFixed(2)}`, valuesX, y, { align: "right" });
  y += 4;

  // Total line
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 5, y, valuesX, y);
  y += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text("TOTAL", totalsX, y);
  doc.text(`$${total.toFixed(2)}`, valuesX, y, { align: "right" });

  y += 16;

  // --- Notes ---
  if (estimate.notes) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(
      estimate.notes as string,
      pageWidth - 40,
    );
    doc.text(noteLines, 15, y);
    y += noteLines.length * 5 + 8;
  }

  if (estimate.terms) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const termLines = doc.splitTextToSize(
      estimate.terms as string,
      pageWidth - 40,
    );
    doc.text(termLines, 15, y);
  }

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "Thank you for considering Mac Septic Services!",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );

  // Save
  const filename = `Estimate_${quoteNumber}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Estimate Detail Page with visual status bar and action buttons
 */
export function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "accept" | "decline" | null;
    open: boolean;
  }>({ type: null, open: false });

  const { data: estimate, isLoading } = useQuery({
    queryKey: ["estimate", id],
    queryFn: async () => {
      const response = await apiClient.get(`/estimates/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const sendMutation = useSendQuote();
  const acceptMutation = useAcceptQuote();
  const declineMutation = useDeclineQuote();

  const convertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        `/estimates/${id}/convert-to-invoice`,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["estimate", id] });
      toastSuccess(
        "Invoice Created",
        "The estimate has been converted to an invoice.",
      );
      if (data?.invoice_id) {
        navigate(`/invoices/${data.invoice_id}`);
      }
    },
    onError: () => {
      toastError("Error", "Failed to convert estimate to invoice.");
    },
  });

  const handleDownloadPDF = () => {
    if (!estimate) {
      toastError("Error", "Estimate data not loaded yet.");
      return;
    }
    setIsDownloading(true);
    try {
      const filename = generateEstimatePDF(estimate);
      toastSuccess("PDF Downloaded", `${filename} has been downloaded.`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      toastError(
        "Download Failed",
        "Failed to generate PDF. Please try again.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSend = () => {
    if (!id) return;
    sendMutation.mutate(id, {
      onSuccess: () => {
        toastSuccess(
          "Estimate Sent",
          "The estimate has been sent to the customer.",
        );
      },
      onError: () => {
        toastError("Error", "Failed to send estimate. Please try again.");
      },
    });
  };

  const handleAccept = () => {
    if (!id) return;
    acceptMutation.mutate(id, {
      onSuccess: () => {
        toastSuccess(
          "Estimate Accepted",
          "The estimate has been marked as accepted.",
        );
        setConfirmDialog({ type: null, open: false });
      },
      onError: () => {
        toastError("Error", "Failed to accept estimate. Please try again.");
        setConfirmDialog({ type: null, open: false });
      },
    });
  };

  const handleDecline = () => {
    if (!id) return;
    declineMutation.mutate(id, {
      onSuccess: () => {
        toastSuccess(
          "Estimate Declined",
          "The estimate has been marked as declined.",
        );
        setConfirmDialog({ type: null, open: false });
      },
      onError: () => {
        toastError("Error", "Failed to decline estimate. Please try again.");
        setConfirmDialog({ type: null, open: false });
      },
    });
  };

  const status = (estimate?.status || "draft") as QuoteStatus;
  const canSend = status === "draft";
  const canAcceptDecline = status === "sent";
  const canConvert = status === "accepted";
  const isTerminal =
    status === "declined" || status === "expired" || status === "invoiced";

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/estimates"
          className="text-text-muted hover:text-text-primary mb-2 inline-block"
        >
          &larr; Back to Estimates
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Estimate #{estimate?.quote_number || estimate?.id || id}
            </h1>
            <p className="text-text-muted">{estimate?.customer_name}</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading || !estimate}
            className="px-4 py-2 border border-border rounded-lg text-text-secondary text-sm font-medium hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Status Progress Bar */}
      <EstimateStatusBar status={status} invoiceId={estimate?.invoice_id} />

      {/* Action Buttons */}
      {!isTerminal && (
        <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-4">
            {canSend && (
              <Button
                variant="primary"
                onClick={handleSend}
                disabled={sendMutation.isPending}
                className="min-w-[160px]"
              >
                {sendMutation.isPending ? "Sending..." : "Send to Customer"}
              </Button>
            )}

            {canAcceptDecline && (
              <>
                <Button
                  variant="primary"
                  onClick={() =>
                    setConfirmDialog({ type: "accept", open: true })
                  }
                  disabled={acceptMutation.isPending}
                  className="min-w-[140px] bg-green-600 hover:bg-green-700"
                >
                  {acceptMutation.isPending ? "..." : "Accept"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setConfirmDialog({ type: "decline", open: true })
                  }
                  disabled={declineMutation.isPending}
                  className="min-w-[140px] text-red-600 border-red-200 hover:bg-red-50"
                >
                  {declineMutation.isPending ? "..." : "Decline"}
                </Button>
              </>
            )}

            {canConvert && (
              <Button
                variant="primary"
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                className="min-w-[180px] bg-purple-600 hover:bg-purple-700"
              >
                {convertMutation.isPending
                  ? "Converting..."
                  : "Convert to Invoice"}
              </Button>
            )}
          </div>
          <p className="text-center text-sm text-text-muted mt-2">
            {canSend && "Ready to send this estimate to the customer"}
            {canAcceptDecline &&
              "Record the customer's response to this estimate"}
            {canConvert && "Customer accepted - ready to create an invoice"}
          </p>
        </div>
      )}

      {/* Customer Info */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-text-primary">Customer</h2>
            {estimate?.customer_id && (
              <Link
                to={`/customers/${estimate.customer_id}`}
                className="text-sm text-primary hover:underline"
              >
                View Customer &rarr;
              </Link>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-text-secondary font-medium">
              {estimate?.customer_name || "N/A"}
            </p>
            {estimate?.customer_email && (
              <p className="text-sm text-text-muted">
                {estimate.customer_email}
              </p>
            )}
            {estimate?.customer_phone && (
              <p className="text-sm text-text-muted">
                {estimate.customer_phone}
              </p>
            )}
            {estimate?.customer_address && (
              <p className="text-sm text-text-muted">
                {estimate.customer_address}
              </p>
            )}
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h2 className="font-medium text-text-primary mb-3">
            Estimate Details
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-text-muted">Created</span>
              <span className="text-text-primary">
                {estimate?.created_at
                  ? new Date(estimate.created_at).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Valid Until</span>
              <span className="text-text-primary">
                {estimate?.valid_until
                  ? new Date(estimate.valid_until).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Work Order</span>
              <span className="text-text-primary">
                {estimate?.work_order_id ? `#${estimate.work_order_id}` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-bg-card border border-border rounded-lg mb-6">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-text-primary">Line Items</h2>
        </div>
        <div className="p-4">
          {estimate?.line_items?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-text-muted">
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {estimate.line_items.map(
                  (
                    item: {
                      description: string;
                      service: string;
                      quantity: number;
                      rate: number;
                      amount: number;
                    },
                    index: number,
                  ) => (
                    <tr key={index}>
                      <td className="py-2 text-text-primary">
                        {item.service || item.description}
                      </td>
                      <td className="py-2 text-text-secondary">
                        {item.quantity}
                      </td>
                      <td className="py-2 text-text-secondary">${item.rate}</td>
                      <td className="py-2 text-right text-text-primary">
                        ${item.amount}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-4 text-text-muted">
              No line items
            </div>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>${estimate?.subtotal?.toLocaleString() || "0"}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Tax</span>
              <span>${estimate?.tax?.toLocaleString() || "0"}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-text-primary border-t border-border pt-2">
              <span>Total</span>
              <span>${estimate?.total?.toLocaleString() || "0"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader
            onClose={() => setConfirmDialog({ type: null, open: false })}
          >
            {confirmDialog.type === "accept"
              ? "Accept Estimate"
              : "Decline Estimate"}
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              {confirmDialog.type === "accept" ? (
                <>
                  Are you sure you want to mark this estimate as{" "}
                  <strong className="text-green-600">accepted</strong>? You'll
                  be able to convert it to an invoice.
                </>
              ) : (
                <>
                  Are you sure you want to mark this estimate as{" "}
                  <strong className="text-red-600">declined</strong>? This
                  action can be undone by editing the estimate.
                </>
              )}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmDialog({ type: null, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={
                confirmDialog.type === "accept" ? handleAccept : handleDecline
              }
              className={
                confirmDialog.type === "accept"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {confirmDialog.type === "accept" ? "Accept" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
