import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useDownloadEstimatePDF } from "@/api/hooks/useQuotes";
import { toastSuccess, toastError } from "@/components/ui/Toast";

/**
 * Estimate Detail Page
 */
export function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const downloadPDF = useDownloadEstimatePDF();

  const handleDownloadPDF = () => {
    if (!id) return;
    downloadPDF.mutate(id, {
      onSuccess: () => {
        toastSuccess("PDF Downloaded", "Your estimate PDF has been downloaded.");
      },
      onError: (error) => {
        console.error("PDF download failed:", error);
        toastError("Download Failed", "Failed to download PDF. Please try again.");
      },
    });
  };

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
              disabled={downloadPDF.isPending}
              className="px-4 py-2 border border-border rounded-lg text-text-secondary text-sm font-medium hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadPDF.isPending ? "Downloading..." : "Download PDF"}
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
                      quantity: number;
                      rate: number;
                      amount: number;
                    },
                    index: number,
                  ) => (
                    <tr key={index}>
                      <td className="py-2 text-text-primary">
                        {item.description}
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
