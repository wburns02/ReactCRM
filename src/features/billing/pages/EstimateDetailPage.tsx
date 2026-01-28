import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";
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
  doc.text("Professional Septic Solutions  |  Texas Licensed & Insured", 15, 26);

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
      createdDate = new Date(estimate.created_at as string).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch { createdDate = String(estimate.created_at).slice(0, 10); }
  }

  let validUntil = "N/A";
  if (estimate.valid_until) {
    try {
      validUntil = new Date(estimate.valid_until as string).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch { validUntil = String(estimate.valid_until).slice(0, 10); }
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
  if (estimate.customer_email) contactParts.push(estimate.customer_email as string);
  if (estimate.customer_phone) contactParts.push(estimate.customer_phone as string);
  if (contactParts.length > 0) {
    doc.text(contactParts.join("  |  "), 20, y);
  }

  y += 16;

  // --- Line Items Table ---
  const lineItems = (estimate.line_items as Array<Record<string, unknown>>) || [];

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
      const desc = (item.service as string) || (item.description as string) || "";
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
      doc.text(`$${amount.toFixed(2)}`, pageWidth - 20, y + 2, { align: "right" });

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
    const noteLines = doc.splitTextToSize(estimate.notes as string, pageWidth - 40);
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
    const termLines = doc.splitTextToSize(estimate.terms as string, pageWidth - 40);
    doc.text(termLines, 15, y);
    y += termLines.length * 5 + 8;
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
    { align: "center" }
  );

  // Save
  const filename = `Estimate_${quoteNumber}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Estimate Detail Page
 */
export function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: estimate, isLoading } = useQuery({
    queryKey: ["estimate", id],
    queryFn: async () => {
      const response = await apiClient.get(`/estimates/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/estimates/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", id] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/estimates/${id}/convert-to-invoice`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate", id] });
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
      toastError("Download Failed", "Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-warning/20 text-warning";
      case "sent":
        return "bg-info/20 text-info";
      case "accepted":
        return "bg-success/20 text-success";
      case "declined":
        return "bg-danger/20 text-danger";
      default:
        return "bg-text-muted/20 text-text-muted";
    }
  };

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
              Estimate #{estimate?.id || id}
            </h1>
            <p className="text-text-muted">{estimate?.customer_name}</p>
          </div>
          <div className="flex gap-2">
            {estimate?.status === "draft" && (
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="px-4 py-2 bg-info text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {sendMutation.isPending ? "Sending..." : "Send to Customer"}
              </button>
            )}
            {estimate?.status === "accepted" && (
              <button
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {convertMutation.isPending
                  ? "Converting..."
                  : "Convert to Invoice"}
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading || !estimate}
              className="px-4 py-2 border border-border rounded-lg text-text-secondary text-sm font-medium hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(estimate?.status)}`}
            >
              {estimate?.status?.toUpperCase() || "DRAFT"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted">Valid Until</p>
            <p className="font-medium text-text-primary">
              {estimate?.valid_until || "N/A"}
            </p>
          </div>
        </div>
      </div>

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
                View Customer →
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
                {estimate?.created_at || "N/A"}
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
    </div>
  );
}
