import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

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
  created_at?: string;
}

interface PaymentScheduleItem {
  id: number;
  due_date: string;
  amount: number;
  status: string;
  paid_date?: string;
}

/**
 * Payment Plan Detail Page
 */
export function PaymentPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: plan,
    isLoading,
    error,
  } = useQuery<PaymentPlan>({
    queryKey: ["payment-plan", id],
    queryFn: async () => {
      const response = await apiClient.get(`/payment-plans/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: schedule } = useQuery<PaymentScheduleItem[]>({
    queryKey: ["payment-plan-schedule", id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/payment-plans/${id}/schedule`);
        return response.data || [];
      } catch {
        return [];
      }
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
      case "paid":
        return "bg-success/20 text-success";
      case "pending":
        return "bg-warning/20 text-warning";
      default:
        return "bg-text-muted/20 text-text-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Payment Plan Not Found
            </h3>
            <p className="text-text-secondary mb-4">
              The payment plan you're looking for doesn't exist or has been
              removed.
            </p>
            <Button onClick={() => navigate("/billing/payment-plans")}>
              Back to Payment Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercent =
    plan.total_amount > 0
      ? Math.round((plan.amount_paid / plan.total_amount) * 100)
      : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/billing/payment-plans"
            className="text-text-secondary hover:text-text-primary"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Payment Plan #{plan.id}
            </h1>
            <p className="text-text-muted">{plan.customer_name}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.status)}`}
        >
          {plan.status}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Total Amount</p>
            <p className="text-2xl font-bold text-text-primary">
              ${plan.total_amount?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Amount Paid</p>
            <p className="text-2xl font-bold text-success">
              ${plan.amount_paid?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Remaining</p>
            <p className="text-2xl font-bold text-warning">
              ${plan.remaining?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Next Payment</p>
            <p className="text-2xl font-bold text-text-primary">
              {plan.next_payment_date || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-text-secondary">
              {progressPercent}% Complete
            </span>
            <span className="text-text-muted">
              ${plan.amount_paid?.toLocaleString()} of $
              {plan.total_amount?.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-bg-hover rounded-full h-3">
            <div
              className="bg-primary rounded-full h-3 transition-all"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-muted">Customer</span>
              <span className="text-text-primary font-medium">
                {plan.customer_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Invoice #</span>
              <Link
                to={`/invoices/${plan.invoice_id}`}
                className="text-primary hover:underline"
              >
                {plan.invoice_id}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Installments</span>
              <span className="text-text-primary">{plan.installments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Frequency</span>
              <span className="text-text-primary capitalize">
                {plan.frequency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Payment Amount</span>
              <span className="text-text-primary font-medium">
                $
                {plan.installments > 0
                  ? (plan.total_amount / plan.installments).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )
                  : "0.00"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {schedule && schedule.length > 0 ? (
              <div className="space-y-2">
                {schedule.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex justify-between items-center py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm text-text-primary">
                        {item.due_date}
                      </p>
                      <p className="text-xs text-text-muted">
                        Payment #{index + 1}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">
                        ${item.amount?.toLocaleString()}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-center py-4">
                No schedule available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate("/billing/payment-plans")}
        >
          Back to List
        </Button>
        <Button variant="primary">Record Payment</Button>
      </div>
    </div>
  );
}
