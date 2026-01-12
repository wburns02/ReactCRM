/**
 * PaymentHistory Component
 *
 * Display all payments for a work order with receipts and refund indicators.
 */

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { cn } from "@/lib/utils.ts";
import { formatCurrency } from "./utils/pricingEngine.ts";
import { usePaymentHistory, useDownloadReceipt } from "./hooks/usePayments.ts";
import type {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from "@/api/types/payment.ts";

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentHistoryProps {
  /** Work order ID to fetch payments for */
  workOrderId: string;
  /** Callback when a payment is selected for refund */
  onRefundClick?: (payment: Payment) => void;
  /** Callback when viewing payment details */
  onViewDetails?: (payment: Payment) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

// Status badge variants
const getStatusVariant = (
  status: PaymentStatus,
): "default" | "success" | "warning" | "destructive" => {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "destructive";
    case "refunded":
      return "default";
    default:
      return "default";
  }
};

// Payment method icons
const PaymentMethodIcon = ({ method }: { method: PaymentMethod }) => {
  switch (method) {
    case "card":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case "cash":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      );
    case "check":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "bank_transfer":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      );
    case "payment_link":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
  }
};

// Format payment method label
const getPaymentMethodLabel = (method: PaymentMethod): string => {
  switch (method) {
    case "card":
      return "Card";
    case "cash":
      return "Cash";
    case "check":
      return "Check";
    case "bank_transfer":
      return "ACH";
    case "payment_link":
      return "Payment Link";
    default:
      return "Other";
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PaymentHistory({
  workOrderId,
  onRefundClick,
  onViewDetails,
  className,
}: PaymentHistoryProps) {
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  const { data: payments, isLoading, error } = usePaymentHistory(workOrderId);
  const downloadReceiptMutation = useDownloadReceipt();

  // Handle receipt download
  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      await downloadReceiptMutation.mutateAsync(paymentId);
    } catch (error) {
      console.error("Failed to download receipt:", error);
    }
  };

  // Calculate totals
  const totalPaid =
    payments?.reduce((sum, p) => {
      if (p.status === "completed") return sum + p.amount;
      return sum;
    }, 0) ?? 0;

  const totalRefunded =
    payments?.reduce((sum, p) => {
      if (p.status === "refunded") return sum + p.amount;
      return sum;
    }, 0) ?? 0;

  return (
    <Card className={cn("w-full", className)}>
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
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-8 w-8 text-primary"
              viewBox="0 0 24 24"
            >
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
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-danger mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-text-secondary">
              Failed to load payment history
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!payments || payments.length === 0) && (
          <div className="text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-text-muted mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <p className="text-text-secondary">No payments recorded</p>
            <p className="text-sm text-text-muted mt-1">
              Payments will appear here once processed
            </p>
          </div>
        )}

        {/* Payment List */}
        {payments && payments.length > 0 && (
          <>
            {/* Summary */}
            <div className="mb-6 p-4 bg-bg-hover/50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider">
                    Total Paid
                  </p>
                  <p className="text-xl font-bold text-success">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider">
                    Refunded
                  </p>
                  <p className="text-xl font-bold text-warning">
                    {formatCurrency(totalRefunded)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider">
                    Net
                  </p>
                  <p className="text-xl font-bold">
                    {formatCurrency(totalPaid - totalRefunded)}
                  </p>
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  {/* Payment Row */}
                  <button
                    type="button"
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-bg-hover/50 transition-colors"
                    onClick={() =>
                      setExpandedPayment(
                        expandedPayment === payment.id ? null : payment.id,
                      )
                    }
                  >
                    <div className="flex items-center gap-4">
                      {/* Payment Method Icon */}
                      <div className="p-2 bg-bg-hover rounded-full">
                        <PaymentMethodIcon method={payment.payment_method} />
                      </div>

                      {/* Payment Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </span>
                          <Badge variant={getStatusVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                          {payment.status === "refunded" && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-warning"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3,11 3,3 11,3" />
                              <polyline points="21,13 21,21 13,21" />
                              <line x1="3" y1="3" x2="9" y2="9" />
                              <line x1="15" y1="15" x2="21" y2="21" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary">
                          {new Date(payment.payment_date).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          "text-lg font-bold",
                          payment.status === "refunded"
                            ? "text-warning"
                            : "text-success",
                        )}
                      >
                        {payment.status === "refunded" && "-"}
                        {formatCurrency(payment.amount)}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={cn(
                          "h-5 w-5 text-text-muted transition-transform",
                          expandedPayment === payment.id && "rotate-180",
                        )}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="6,9 12,15 18,9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedPayment === payment.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-border bg-bg-hover/30">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-text-muted">Transaction ID</p>
                          <p className="font-mono">
                            {payment.transaction_id || payment.id}
                          </p>
                        </div>
                        {payment.reference_number && (
                          <div>
                            <p className="text-text-muted">Reference</p>
                            <p>{payment.reference_number}</p>
                          </div>
                        )}
                        {payment.notes && (
                          <div className="col-span-2">
                            <p className="text-text-muted">Notes</p>
                            <p>{payment.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment.id)}
                          disabled={downloadReceiptMutation.isPending}
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
                            <polyline points="7,10 12,15 17,10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Receipt
                        </Button>

                        {onViewDetails && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(payment)}
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
                            Details
                          </Button>
                        )}

                        {onRefundClick && payment.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRefundClick(payment)}
                            className="text-warning hover:text-warning"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-2"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3,11 3,3 11,3" />
                              <polyline points="21,13 21,21 13,21" />
                              <line x1="3" y1="3" x2="9" y2="9" />
                              <line x1="15" y1="15" x2="21" y2="21" />
                            </svg>
                            Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentHistory;
