import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PaymentForm } from "@/features/payments/components/PaymentForm";
import { useRecordPaymentPlanPayment } from "@/api/hooks/usePaymentPlans";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import type { PaymentFormData } from "@/api/types/payment";

interface PaymentPlan {
  id: number;
  customer_name: string;
  customer_id: number;
  invoice_id: number;
  total_amount: number;
  amount_paid: number;
  remaining: number;
  installments: number;
  frequency: string;
  next_payment_date: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Payment Plan Detail Page
 */
export function PaymentPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modal state for recording payments
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Mutation for recording payments
  const recordPayment = useRecordPaymentPlanPayment();

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ["payment-plan", id],
    queryFn: async (): Promise<PaymentPlan> => {
      const response = await apiClient.get(`/payment-plans/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-success/20 text-success";
      case "completed":
        return "bg-info/20 text-info";
      case "overdue":
        return "bg-danger/20 text-danger";
      case "paused":
        return "bg-warning/20 text-warning";
      case "cancelled":
        return "bg-text-muted/20 text-text-muted";
      default:
        return "bg-text-muted/20 text-text-muted";
    }
  };

  const getProgressPercentage = () => {
    if (!plan || plan.total_amount === 0) return 0;
    return Math.round((plan.amount_paid / plan.total_amount) * 100);
  };

  // Handler for recording a payment
  const handleRecordPayment = async (data: PaymentFormData) => {
    try {
      await recordPayment.mutateAsync({
        planId: id!,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        notes: data.notes,
      });
      // Invalidate query to refresh the plan data
      queryClient.invalidateQueries({ queryKey: ["payment-plan", id] });
      toastSuccess("Payment Recorded", "The payment has been recorded successfully");
      setShowPaymentModal(false);
    } catch {
      toastError("Error", "Failed to record payment. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <span className="text-4xl block mb-4">404</span>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Payment Plan Not Found
          </h2>
          <p className="text-text-muted mb-4">
            The payment plan you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/billing/payment-plans")}>
            Back to Payment Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Link
              to="/billing/payment-plans"
              className="hover:text-primary transition-colors"
            >
              Payment Plans
            </Link>
            <span>/</span>
            <span>Plan #{plan.id}</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {plan.customer_name}
          </h1>
          <p className="text-text-muted">Invoice #{plan.invoice_id}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.status)}`}
          >
            {plan.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-muted">Progress</span>
                  <span className="font-medium text-text-primary">
                    {getProgressPercentage()}%
                  </span>
                </div>
                <div className="h-3 bg-bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-text-muted">Total Amount</p>
                  <p className="text-xl font-bold text-text-primary">
                    ${plan.total_amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Paid</p>
                  <p className="text-xl font-bold text-success">
                    ${plan.amount_paid.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Remaining</p>
                  <p className="text-xl font-bold text-warning">
                    ${plan.remaining.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-text-primary">Frequency</p>
                    <p className="text-sm text-text-muted">
                      How often payments are due
                    </p>
                  </div>
                  <span className="text-text-primary capitalize">
                    {plan.frequency}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-text-primary">
                      Total Installments
                    </p>
                    <p className="text-sm text-text-muted">
                      Number of payments in the plan
                    </p>
                  </div>
                  <span className="text-text-primary">{plan.installments}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <div>
                    <p className="font-medium text-text-primary">
                      Payment Amount
                    </p>
                    <p className="text-sm text-text-muted">Per installment</p>
                  </div>
                  <span className="text-text-primary">
                    ${(plan.total_amount / plan.installments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {plan.next_payment_date && (
                  <div className="flex justify-between items-center py-3">
                    <div>
                      <p className="font-medium text-text-primary">
                        Next Payment Due
                      </p>
                      <p className="text-sm text-text-muted">
                        Upcoming payment date
                      </p>
                    </div>
                    <span className={`font-medium ${
                      plan.status === "overdue" ? "text-danger" : "text-text-primary"
                    }`}>
                      {new Date(plan.next_payment_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="primary"
                onClick={() => setShowPaymentModal(true)}
              >
                Record Payment
              </Button>
              {plan.status === "active" && (
                <Button className="w-full" variant="secondary">
                  Pause Plan
                </Button>
              )}
              {plan.status === "paused" && (
                <Button className="w-full" variant="secondary">
                  Resume Plan
                </Button>
              )}
              <Button className="w-full" variant="ghost">
                Send Reminder
              </Button>
            </CardContent>
          </Card>

          {/* Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Plan ID</span>
                <span className="text-text-primary font-medium">#{plan.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Customer ID</span>
                <Link
                  to={`/customers/${plan.customer_id}`}
                  className="text-primary hover:underline"
                >
                  #{plan.customer_id}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Invoice</span>
                <span className="text-text-primary">#{plan.invoice_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Created</span>
                <span className="text-text-primary">
                  {new Date(plan.created_at).toLocaleDateString()}
                </span>
              </div>
              {plan.updated_at && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Last Updated</span>
                  <span className="text-text-primary">
                    {new Date(plan.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Form Modal */}
      <PaymentForm
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handleRecordPayment}
        isLoading={recordPayment.isPending}
        prefilledCustomerId={plan?.customer_id}
      />
    </div>
  );
}
