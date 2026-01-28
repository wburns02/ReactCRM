import { useMemo, useState } from "react";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { usePayments } from "@/api/hooks/usePayments.ts";
import { useUpdateCustomer } from "@/api/hooks/useCustomers.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import { cn, formatCurrency, formatDate } from "@/lib/utils.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { EmailComposeModal } from "@/features/communications/components/EmailComposeModal.tsx";
import type { Customer } from "@/api/types/customer.ts";
import type { WorkOrder } from "@/api/types/workOrder.ts";
import type { Payment } from "@/api/types/payment.ts";

interface CustomerHealthScoreProps {
  /** Customer to analyze */
  customer: Customer;
  /** Optional class name */
  className?: string;
}

type ChurnRisk = "low" | "medium" | "high";

interface CustomerHealthMetrics {
  // Churn risk
  churnRisk: ChurnRisk;
  churnRiskScore: number; // 0-100 (higher = more risk)

  // Lifetime value
  lifetimeValue: number;
  averageOrderValue: number;

  // Engagement
  engagementScore: number; // 0-100
  totalOrders: number;
  completedOrders: number;

  // Recency
  lastContactDate: string | null;
  daysSinceLastContact: number;

  // Payment behavior
  paymentScore: number; // 0-100
  totalPayments: number;
  onTimePaymentRate: number;

  // Recommendations
  recommendations: string[];
}

/**
 * Calculate customer health metrics from available data
 */
function calculateCustomerHealth(
  customer: Customer,
  workOrders: WorkOrder[],
  payments: Payment[],
): CustomerHealthMetrics {
  const now = new Date();
  const recommendations: string[] = [];

  // Filter to this customer's data
  const customerWorkOrders = workOrders.filter(
    (wo) => String(wo.customer_id) === String(customer.id),
  );
  const customerPayments = payments.filter(
    (p) => String(p.customer_id) === String(customer.id),
  );

  // Completed orders
  const completedOrders = customerWorkOrders.filter(
    (wo) => wo.status === "completed",
  );
  const totalOrders = customerWorkOrders.length;

  // Calculate lifetime value from completed orders
  // Estimate based on job types (mock values - in production, use actual invoice data)
  const jobTypeValues: Record<string, number> = {
    pumping: 350,
    inspection: 150,
    repair: 500,
    installation: 2500,
    emergency: 600,
    maintenance: 250,
    grease_trap: 275,
    camera_inspection: 300,
  };

  let lifetimeValue = 0;
  completedOrders.forEach((wo) => {
    lifetimeValue += jobTypeValues[wo.job_type] || 300;
  });

  // Also count actual payments
  const totalPaymentsAmount = customerPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  if (totalPaymentsAmount > lifetimeValue) {
    lifetimeValue = totalPaymentsAmount;
  }

  const averageOrderValue =
    completedOrders.length > 0 ? lifetimeValue / completedOrders.length : 0;

  // Calculate last contact date
  let lastContactDate: string | null = null;
  let daysSinceLastContact = 365; // Default to 1 year if no contact

  const allDates: Date[] = [];

  // Check work orders
  customerWorkOrders.forEach((wo) => {
    if (wo.scheduled_date) {
      allDates.push(new Date(wo.scheduled_date));
    }
  });

  // Check payments
  customerPayments.forEach((p) => {
    if (p.payment_date) {
      allDates.push(new Date(p.payment_date));
    }
  });

  // Check next follow-up
  if (customer.next_follow_up_date) {
    const followUp = new Date(customer.next_follow_up_date);
    if (followUp <= now) {
      allDates.push(followUp);
    }
  }

  if (allDates.length > 0) {
    allDates.sort((a, b) => b.getTime() - a.getTime());
    lastContactDate = allDates[0].toISOString().split("T")[0];
    daysSinceLastContact = Math.floor(
      (now.getTime() - allDates[0].getTime()) / (24 * 60 * 60 * 1000),
    );
  }

  // Calculate engagement score (0-100)
  // Based on: order frequency, recency, and status
  let engagementScore = 50; // Base score

  // Adjust for order frequency
  const ordersPerYear = totalOrders / Math.max(1, daysSinceLastContact / 365);
  if (ordersPerYear >= 4) {
    engagementScore += 30;
  } else if (ordersPerYear >= 2) {
    engagementScore += 20;
  } else if (ordersPerYear >= 1) {
    engagementScore += 10;
  }

  // Adjust for recency
  if (daysSinceLastContact < 30) {
    engagementScore += 20;
  } else if (daysSinceLastContact < 90) {
    engagementScore += 10;
  } else if (daysSinceLastContact > 365) {
    engagementScore -= 30;
  } else if (daysSinceLastContact > 180) {
    engagementScore -= 15;
  }

  engagementScore = Math.max(0, Math.min(100, engagementScore));

  // Calculate payment score
  let paymentScore = 70; // Base score
  const completedPayments = customerPayments.filter(
    (p) => p.status === "completed",
  ).length;
  const failedPayments = customerPayments.filter(
    (p) => p.status === "failed",
  ).length;

  if (completedPayments > 0) {
    const successRate =
      completedPayments / (completedPayments + failedPayments);
    paymentScore = Math.round(successRate * 100);
  }

  const onTimePaymentRate = paymentScore;

  // Calculate churn risk score (0-100, higher = more risk)
  let churnRiskScore = 50; // Base risk

  // Higher risk for inactive customers
  if (!customer.is_active) {
    churnRiskScore += 40;
  }

  // Adjust for recency
  if (daysSinceLastContact > 365) {
    churnRiskScore += 30;
  } else if (daysSinceLastContact > 180) {
    churnRiskScore += 20;
  } else if (daysSinceLastContact > 90) {
    churnRiskScore += 10;
  } else if (daysSinceLastContact < 30) {
    churnRiskScore -= 20;
  }

  // Adjust for engagement
  if (engagementScore > 70) {
    churnRiskScore -= 20;
  } else if (engagementScore < 40) {
    churnRiskScore += 15;
  }

  // Adjust for payment behavior
  if (paymentScore < 70) {
    churnRiskScore += 15;
  } else if (paymentScore > 90) {
    churnRiskScore -= 10;
  }

  // Adjust for lifetime value
  if (lifetimeValue > 2000) {
    churnRiskScore -= 10; // High-value customers less likely to churn (but more impactful if they do)
  }

  churnRiskScore = Math.max(0, Math.min(100, churnRiskScore));

  // Determine churn risk level
  let churnRisk: ChurnRisk = "low";
  if (churnRiskScore >= 70) {
    churnRisk = "high";
  } else if (churnRiskScore >= 40) {
    churnRisk = "medium";
  }

  // Generate recommendations
  if (daysSinceLastContact > 180) {
    recommendations.push("Schedule a check-in call - no contact in 6+ months");
  }

  if (daysSinceLastContact > 365 && completedOrders.length > 0) {
    recommendations.push("Consider re-engagement campaign - high churn risk");
  }

  if (engagementScore < 40) {
    recommendations.push(
      "Increase engagement with service reminders or promotions",
    );
  }

  if (paymentScore < 80 && completedOrders.length > 2) {
    recommendations.push(
      "Review payment terms - consider offering payment plans",
    );
  }

  if (
    completedOrders.length >= 3 &&
    !customer.lead_notes?.toLowerCase().includes("loyalty")
  ) {
    recommendations.push("Potential candidate for loyalty program");
  }

  if (lifetimeValue > 2000) {
    recommendations.push("High-value customer - prioritize service quality");
  }

  if (customer.customer_type === "commercial" && completedOrders.length > 0) {
    recommendations.push("Explore maintenance contract opportunity");
  }

  if (churnRisk === "low" && engagementScore > 70) {
    recommendations.push("Request referral - highly engaged customer");
  }

  return {
    churnRisk,
    churnRiskScore,
    lifetimeValue,
    averageOrderValue,
    engagementScore,
    totalOrders,
    completedOrders: completedOrders.length,
    lastContactDate,
    daysSinceLastContact,
    paymentScore,
    totalPayments: customerPayments.length,
    onTimePaymentRate,
    recommendations: recommendations.slice(0, 4), // Limit to top 4
  };
}

/**
 * CustomerHealthScore - Display customer health metrics and churn risk
 *
 * Features:
 * - Churn risk indicator (Low/Medium/High)
 * - Lifetime value estimate
 * - Engagement score
 * - Last contact date
 * - Recommended actions
 */
export function CustomerHealthScore({
  customer,
  className,
}: CustomerHealthScoreProps) {
  // Modal state
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [followupDate, setFollowupDate] = useState(
    customer.next_follow_up_date || new Date().toISOString().split("T")[0]
  );

  // Update customer mutation for scheduling follow-up
  const updateCustomer = useUpdateCustomer();

  const handleScheduleFollowup = async () => {
    try {
      await updateCustomer.mutateAsync({
        id: String(customer.id),
        data: { next_follow_up_date: followupDate },
      });
      toastSuccess("Follow-up Scheduled", `Follow-up scheduled for ${formatDate(followupDate)}`);
      setShowFollowupModal(false);
    } catch (error) {
      toastError("Failed to Schedule", "Could not schedule follow-up. Please try again.");
    }
  };

  // Fetch work orders and payments for this customer
  const { data: workOrdersData } = useWorkOrders({
    page: 1,
    page_size: 500,
    customer_id: String(customer.id),
  });
  const { data: paymentsData } = usePayments({
    page: 1,
    page_size: 200,
    customer_id: String(customer.id),
  });

  // Also fetch all work orders to analyze patterns
  const { data: allWorkOrdersData } = useWorkOrders({
    page: 1,
    page_size: 1000,
  });
  const { data: allPaymentsData } = usePayments({
    page: 1,
    page_size: 500,
  });

  const health = useMemo(() => {
    const workOrders = allWorkOrdersData?.items || workOrdersData?.items || [];
    const payments = allPaymentsData?.items || paymentsData?.items || [];
    return calculateCustomerHealth(customer, workOrders, payments);
  }, [
    customer,
    allWorkOrdersData,
    workOrdersData,
    allPaymentsData,
    paymentsData,
  ]);

  // Get churn risk color
  const getChurnRiskColor = (risk: ChurnRisk) => {
    switch (risk) {
      case "low":
        return "text-success";
      case "medium":
        return "text-warning";
      case "high":
        return "text-danger";
    }
  };

  const getChurnRiskBadge = (
    risk: ChurnRisk,
  ): "success" | "warning" | "danger" => {
    switch (risk) {
      case "low":
        return "success";
      case "medium":
        return "warning";
      case "high":
        return "danger";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-danger";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Customer Health</CardTitle>
          <Badge variant={getChurnRiskBadge(health.churnRisk)}>
            {health.churnRisk.charAt(0).toUpperCase() +
              health.churnRisk.slice(1)}{" "}
            Churn Risk
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Lifetime Value */}
          <div className="p-3 rounded-lg bg-bg-muted">
            <p className="text-xs text-text-muted mb-1">Lifetime Value</p>
            <p className="text-lg font-bold text-success">
              {formatCurrency(health.lifetimeValue)}
            </p>
            {health.averageOrderValue > 0 && (
              <p className="text-xs text-text-secondary mt-1">
                Avg: {formatCurrency(health.averageOrderValue)}
              </p>
            )}
          </div>

          {/* Engagement Score */}
          <div className="p-3 rounded-lg bg-bg-muted">
            <p className="text-xs text-text-muted mb-1">Engagement</p>
            <p
              className={cn(
                "text-lg font-bold",
                getScoreColor(health.engagementScore),
              )}
            >
              {health.engagementScore}%
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {health.completedOrders} completed jobs
            </p>
          </div>

          {/* Last Contact */}
          <div className="p-3 rounded-lg bg-bg-muted">
            <p className="text-xs text-text-muted mb-1">Last Contact</p>
            <p
              className={cn(
                "text-lg font-bold",
                health.daysSinceLastContact > 180
                  ? "text-danger"
                  : health.daysSinceLastContact > 90
                    ? "text-warning"
                    : "text-text-primary",
              )}
            >
              {health.lastContactDate
                ? formatDate(health.lastContactDate)
                : "Never"}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {health.daysSinceLastContact < 365
                ? `${health.daysSinceLastContact} days ago`
                : "1+ year ago"}
            </p>
          </div>

          {/* Payment Health */}
          <div className="p-3 rounded-lg bg-bg-muted">
            <p className="text-xs text-text-muted mb-1">Payment Score</p>
            <p
              className={cn(
                "text-lg font-bold",
                getScoreColor(health.paymentScore),
              )}
            >
              {health.paymentScore}%
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {health.totalPayments} payment
              {health.totalPayments !== 1 ? "s" : ""} on file
            </p>
          </div>
        </div>

        {/* Churn Risk Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">
              Churn Risk Score
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                getChurnRiskColor(health.churnRisk),
              )}
            >
              {health.churnRiskScore}%
            </span>
          </div>
          <div className="w-full bg-bg-muted rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                health.churnRisk === "low"
                  ? "bg-success"
                  : health.churnRisk === "medium"
                    ? "bg-warning"
                    : "bg-danger",
              )}
              style={{ width: `${health.churnRiskScore}%` }}
            />
          </div>
        </div>

        {/* Recommendations */}
        {health.recommendations.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-text-primary mb-2">
              Recommended Actions
            </p>
            <ul className="space-y-2">
              {health.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <span className="text-primary mt-0.5">-</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowFollowupModal(true)}
          >
            Schedule Follow-up
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowEmailModal(true)}
            disabled={!customer.email}
          >
            Send Email
          </Button>
        </div>
      </CardContent>

      {/* Schedule Follow-up Modal */}
      <Dialog open={showFollowupModal} onClose={() => setShowFollowupModal(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setShowFollowupModal(false)}>
            Schedule Follow-up
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Set a follow-up date for {customer.first_name} {customer.last_name}
              </p>
              <div className="space-y-2">
                <Label htmlFor="followup_date">Follow-up Date</Label>
                <Input
                  id="followup_date"
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowFollowupModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleFollowup}
              disabled={updateCustomer.isPending || !followupDate}
            >
              {updateCustomer.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Compose Modal */}
      <EmailComposeModal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        defaultEmail={customer.email || ""}
        customerId={String(customer.id)}
        customerName={`${customer.first_name} ${customer.last_name}`}
      />
    </Card>
  );
}
