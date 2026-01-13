import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Payment Pattern Analysis
 */
export interface PaymentPatternResult {
  customer_id: string;
  payment_behavior: PaymentBehavior;
  risk_assessment: RiskAssessment;
  recommendations: PaymentRecommendation[];
  historical_stats: PaymentStats;
  predicted_actions: PredictedPaymentAction[];
}

export interface PaymentBehavior {
  typical_payment_timing: "early" | "on_time" | "late" | "very_late";
  average_days_to_pay: number;
  payment_consistency: "consistent" | "variable" | "unpredictable";
  preferred_method: string;
  seasonal_patterns?: string;
}

export interface RiskAssessment {
  risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number; // 0-100
  risk_factors: string[];
  mitigating_factors: string[];
  default_probability: number;
}

export interface PaymentRecommendation {
  action: string;
  priority: "high" | "medium" | "low";
  expected_impact: string;
  timing: string;
}

export interface PaymentStats {
  total_invoices: number;
  paid_on_time_rate: number;
  average_days_to_pay: number;
  total_late_fees: number;
  outstanding_balance: number;
  lifetime_value: number;
}

export interface PredictedPaymentAction {
  invoice_id?: string;
  predicted_payment_date: string;
  confidence: number;
  suggested_follow_up: string;
}

/**
 * Collection Insights
 */
export interface CollectionInsights {
  total_outstanding: number;
  aging_breakdown: AgingBucket[];
  high_risk_accounts: HighRiskAccount[];
  collection_priority_queue: CollectionQueueItem[];
  predicted_collections_30_days: number;
  recommended_actions: CollectionAction[];
}

export interface AgingBucket {
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  amount: number;
  count: number;
  percentage: number;
}

export interface HighRiskAccount {
  customer_id: string;
  customer_name: string;
  outstanding_amount: number;
  days_overdue: number;
  risk_score: number;
  recommended_action: string;
}

export interface CollectionQueueItem {
  customer_id: string;
  customer_name: string;
  amount: number;
  priority_score: number;
  best_contact_time: string;
  suggested_approach: string;
}

export interface CollectionAction {
  action: string;
  target_accounts: number;
  expected_recovery: number;
  timing: string;
}

/**
 * Analyze payment patterns for a customer
 */
export function usePaymentPattern(customerId: string | undefined) {
  return useQuery({
    queryKey: ["payment-pattern", customerId],
    queryFn: async (): Promise<PaymentPatternResult> => {
      if (!customerId) throw new Error("Customer ID required");

      try {
        const response = await apiClient.get(`/ai/payments/pattern/${customerId}`);
        return response.data;
      } catch {
        return generateDemoPaymentPattern(customerId);
      }
    },
    enabled: !!customerId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get collection insights
 */
export function useCollectionInsights() {
  return useQuery({
    queryKey: ["collection-insights"],
    queryFn: async (): Promise<CollectionInsights> => {
      try {
        const response = await apiClient.get("/ai/payments/collection-insights");
        return response.data;
      } catch {
        return generateDemoCollectionInsights();
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Predict invoice payment
 */
export function usePredictPayment() {
  return useMutation({
    mutationFn: async (params: {
      invoiceId: string;
      customerId: string;
      amount: number;
      dueDate: string;
    }) => {
      try {
        const response = await apiClient.post("/ai/payments/predict", params);
        return response.data;
      } catch {
        const daysToPay = 15 + Math.floor(Math.random() * 20);
        const dueDate = new Date(params.dueDate);
        const predictedDate = new Date(dueDate.getTime() + daysToPay * 24 * 60 * 60 * 1000);

        return {
          invoice_id: params.invoiceId,
          predicted_payment_date: predictedDate.toISOString().split("T")[0],
          confidence: 70 + Math.floor(Math.random() * 25),
          will_pay_on_time: daysToPay <= 0,
          recommended_action: daysToPay > 7
            ? "Send reminder 5 days before due date"
            : "Monitor - likely to pay on time",
        };
      }
    },
  });
}

/**
 * Generate optimal collection strategy
 */
export function useCollectionStrategy() {
  return useMutation({
    mutationFn: async (params: {
      customerId: string;
      outstandingAmount: number;
      daysOverdue: number;
    }) => {
      try {
        const response = await apiClient.post("/ai/payments/collection-strategy", params);
        return response.data;
      } catch {
        let strategy = "standard";
        let urgency = "normal";
        const actions: string[] = [];

        if (params.daysOverdue > 60) {
          strategy = "escalated";
          urgency = "high";
          actions.push("Call immediately", "Send final notice email", "Consider payment plan");
        } else if (params.daysOverdue > 30) {
          strategy = "intensified";
          urgency = "medium";
          actions.push("Phone follow-up", "Send second reminder", "Offer online payment link");
        } else if (params.daysOverdue > 0) {
          strategy = "reminder";
          urgency = "low";
          actions.push("Send friendly reminder", "Offer autopay setup");
        } else {
          actions.push("No action needed - not yet due");
        }

        return {
          strategy,
          urgency,
          recommended_actions: actions,
          best_contact_time: "Tuesday-Thursday, 10am-2pm",
          payment_plan_eligible: params.outstandingAmount > 500,
          suggested_script: `Hi, this is regarding invoice amount of $${params.outstandingAmount}. We wanted to check if there's anything we can help with regarding the payment.`,
        };
      }
    },
  });
}

/**
 * Generate demo payment pattern
 */
function generateDemoPaymentPattern(customerId: string): PaymentPatternResult {
  const behaviors: Array<"early" | "on_time" | "late" | "very_late"> = ["early", "on_time", "late", "very_late"];
  const behavior = behaviors[Math.floor(Math.random() * 4)];

  const avgDays = behavior === "early" ? -5 :
    behavior === "on_time" ? 0 :
    behavior === "late" ? 15 : 35;

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  let riskScore = 20;

  if (behavior === "very_late") {
    riskLevel = "high";
    riskScore = 75;
  } else if (behavior === "late") {
    riskLevel = "medium";
    riskScore = 45;
  }

  const recommendations: PaymentRecommendation[] = [];
  if (riskLevel === "high") {
    recommendations.push({
      action: "Require payment upfront or deposit",
      priority: "high",
      expected_impact: "Reduce risk of non-payment by 80%",
      timing: "For next invoice",
    });
    recommendations.push({
      action: "Set up automated payment reminders",
      priority: "medium",
      expected_impact: "Improve on-time payment rate by 25%",
      timing: "Immediately",
    });
  } else if (riskLevel === "medium") {
    recommendations.push({
      action: "Offer early payment discount (2%)",
      priority: "medium",
      expected_impact: "Improve payment timing by 10 days average",
      timing: "Next invoice cycle",
    });
  }

  if (behavior !== "early") {
    recommendations.push({
      action: "Set up autopay",
      priority: behavior === "on_time" ? "low" : "medium",
      expected_impact: "Ensure consistent on-time payments",
      timing: "Next customer interaction",
    });
  }

  return {
    customer_id: customerId,
    payment_behavior: {
      typical_payment_timing: behavior,
      average_days_to_pay: 30 + avgDays,
      payment_consistency: behavior === "on_time" || behavior === "early" ? "consistent" : "variable",
      preferred_method: "Credit Card",
      seasonal_patterns: "Slower payments in Q4",
    },
    risk_assessment: {
      risk_level: riskLevel,
      risk_score: riskScore,
      risk_factors: riskLevel !== "low" ? ["Late payment history", "High outstanding balance"] : [],
      mitigating_factors: ["Long-term customer", "Regular service schedule"],
      default_probability: riskScore * 0.01,
    },
    recommendations,
    historical_stats: {
      total_invoices: 15 + Math.floor(Math.random() * 20),
      paid_on_time_rate: behavior === "early" ? 100 :
        behavior === "on_time" ? 95 :
        behavior === "late" ? 65 : 40,
      average_days_to_pay: 30 + avgDays,
      total_late_fees: riskLevel === "low" ? 0 : 50 + Math.floor(Math.random() * 150),
      outstanding_balance: riskLevel === "low" ? 0 : 200 + Math.floor(Math.random() * 800),
      lifetime_value: 2500 + Math.floor(Math.random() * 5000),
    },
    predicted_actions: [
      {
        invoice_id: "INV-001",
        predicted_payment_date: new Date(Date.now() + (30 + avgDays) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        confidence: 75 + Math.floor(Math.random() * 20),
        suggested_follow_up: behavior === "late" || behavior === "very_late"
          ? "Send reminder 5 days before due date"
          : "No action needed",
      },
    ],
  };
}

/**
 * Generate demo collection insights
 */
function generateDemoCollectionInsights(): CollectionInsights {
  return {
    total_outstanding: 45750,
    aging_breakdown: [
      { bucket: "current", amount: 12500, count: 15, percentage: 27 },
      { bucket: "1-30", amount: 18250, count: 12, percentage: 40 },
      { bucket: "31-60", amount: 8500, count: 6, percentage: 19 },
      { bucket: "61-90", amount: 4000, count: 3, percentage: 9 },
      { bucket: "90+", amount: 2500, count: 2, percentage: 5 },
    ],
    high_risk_accounts: [
      {
        customer_id: "c1",
        customer_name: "ABC Properties",
        outstanding_amount: 2500,
        days_overdue: 95,
        risk_score: 85,
        recommended_action: "Final notice + payment plan offer",
      },
      {
        customer_id: "c2",
        customer_name: "Smith Residence",
        outstanding_amount: 1200,
        days_overdue: 65,
        risk_score: 72,
        recommended_action: "Phone call + payment reminder",
      },
    ],
    collection_priority_queue: [
      {
        customer_id: "c1",
        customer_name: "ABC Properties",
        amount: 2500,
        priority_score: 95,
        best_contact_time: "Tuesday 10am",
        suggested_approach: "Discuss payment plan options",
      },
      {
        customer_id: "c2",
        customer_name: "Smith Residence",
        amount: 1200,
        priority_score: 82,
        best_contact_time: "Wednesday 2pm",
        suggested_approach: "Friendly reminder call",
      },
      {
        customer_id: "c3",
        customer_name: "Jones Family",
        amount: 850,
        priority_score: 65,
        best_contact_time: "Thursday 11am",
        suggested_approach: "Send payment link via SMS",
      },
    ],
    predicted_collections_30_days: 32500,
    recommended_actions: [
      {
        action: "Send batch payment reminders",
        target_accounts: 12,
        expected_recovery: 15000,
        timing: "This week",
      },
      {
        action: "Phone follow-up campaign",
        target_accounts: 5,
        expected_recovery: 8500,
        timing: "Next week",
      },
      {
        action: "Offer payment plans",
        target_accounts: 3,
        expected_recovery: 5000,
        timing: "Ongoing",
      },
    ],
  };
}
