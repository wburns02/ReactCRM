import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuote, useSendQuote } from "@/api/hooks/useQuotes";
import { apiClient } from "@/api/client";

/**
 * Estimate Detail Page
 *
 * Uses the /quotes/ API endpoint (estimates are quotes in this system)
 */
export function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Use the correct useQuote hook that calls /quotes/{id}
  const { data: estimate, isLoading, error } = useQuote(id);

  // Use the send quote hook
  const sendMutation = useSendQuote();

  const convertMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/quotes/${id}/convert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  // Helper to get customer display name
  const getCustomerName = () => {
    if (estimate?.customer) {
      return `${estimate.customer.first_name} ${estimate.customer.last_name}`.trim();
    }
    return estimate?.customer_name || "N/A";
  };

  // Helper to format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  // Handle PDF download
  const handleDownloadPDF = () => {
    // Open print dialog with estimate content
    window.print();
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

  if (error) {
    return (
      <div className="p-6">
        <Link
          to="/estimates"
          className="text-text-muted hover:text-text-primary mb-4 inline-block"
        >
          &larr; Back to Estimates
        </Link>
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-6 text-center">
          <p className="text-danger font-medium">Failed to load estimate</p>
          <p className="text-text-muted text-sm mt-2">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 print:p-0">
      {/* Header */}
      <div className="mb-6 print:mb-4">
        <Link
          to="/estimates"
          className="text-text-muted hover:text-text-primary mb-2 inline-block print:hidden"
        >
          &larr; Back to Estimates
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Estimate {estimate?.quote_number || `#${id}`}
            </h1>
            <p className="text-text-muted">{getCustomerName()}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            {estimate?.status === "draft" && (
              <button
                onClick={() => id && sendMutation.mutate(id)}
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
              className="px-4 py-2 border border-border rounded-lg text-text-secondary text-sm font-medium hover:bg-bg-hover"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-6 print:border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(estimate?.status || "draft")} print:bg-gray-100 print:text-gray-700`}
            >
              {estimate?.status?.toUpperCase() || "DRAFT"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted">Valid Until</p>
            <p className="font-medium text-text-primary">
              {formatDate(estimate?.valid_until)}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid md:grid-cols-2 gap-6 mb-6 print:grid-cols-2">
        <div className="bg-bg-card border border-border rounded-lg p-4 print:border-gray-300">
          <h2 className="font-medium text-text-primary mb-3">Customer</h2>
          <div className="space-y-2">
            <p className="text-text-secondary font-medium">
              {getCustomerName()}
            </p>
            <p className="text-sm text-text-muted">
              {estimate?.customer?.email || "N/A"}
            </p>
            <p className="text-sm text-text-muted">
              {estimate?.customer?.phone || "N/A"}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-lg p-4 print:border-gray-300">
          <h2 className="font-medium text-text-primary mb-3">
            Estimate Details
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-text-muted">Created</span>
              <span className="text-text-primary">
                {formatDate(estimate?.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Tax Rate</span>
              <span className="text-text-primary">
                {estimate?.tax_rate ? `${estimate.tax_rate}%` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-bg-card border border-border rounded-lg mb-6 print:border-gray-300">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-text-primary">Line Items</h2>
        </div>
        <div className="p-4">
          {(estimate?.line_items?.length ?? 0) > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-text-muted border-b border-border">
                  <th className="pb-2">Service</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {estimate?.line_items?.map(
                  (
                    item: {
                      service?: string;
                      description?: string;
                      quantity: number;
                      rate: number;
                      amount: number;
                    },
                    index: number,
                  ) => (
                    <tr key={index}>
                      <td className="py-3 text-text-primary font-medium">
                        {item.service || "Service"}
                      </td>
                      <td className="py-3 text-text-secondary text-sm">
                        {item.description || "-"}
                      </td>
                      <td className="py-3 text-text-secondary text-center">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-text-secondary text-right">
                        ${item.rate?.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-text-primary font-medium">
                        ${item.amount?.toFixed(2)}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-6 text-text-muted">
              No line items
            </div>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="bg-bg-card border border-border rounded-lg p-4 print:border-gray-300">
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>${estimate?.subtotal?.toFixed(2) || "0.00"}</span>
            </div>
            {(estimate?.tax_rate ?? 0) > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Tax ({estimate?.tax_rate}%)</span>
                <span>${estimate?.tax?.toFixed(2) || "0.00"}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold text-text-primary border-t border-border pt-2">
              <span>Total</span>
              <span className="text-primary">${estimate?.total?.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {estimate?.notes && (
        <div className="bg-bg-card border border-border rounded-lg p-4 mt-6 print:border-gray-300">
          <h2 className="font-medium text-text-primary mb-2">Notes</h2>
          <p className="text-text-secondary text-sm whitespace-pre-wrap">
            {estimate.notes}
          </p>
        </div>
      )}
    </div>
  );
}
