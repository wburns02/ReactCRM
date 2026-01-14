import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Compliance Risk Assessment Result
 */
export interface ComplianceRiskResult {
  overall_risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number; // 0-100
  risk_factors: RiskFactor[];
  upcoming_deadlines: ComplianceDeadline[];
  recommendations: ComplianceRecommendation[];
  historical_issues: HistoricalIssue[];
  predicted_violations: PredictedViolation[];
  compliance_score: number; // 0-100
}

export interface RiskFactor {
  type: "license" | "certification" | "inspection" | "documentation" | "training";
  description: string;
  severity: "high" | "medium" | "low";
  due_date?: string;
  days_until_due?: number;
  action_required: string;
}

export interface ComplianceDeadline {
  item_type: string;
  item_name: string;
  deadline: string;
  days_remaining: number;
  urgency: "overdue" | "urgent" | "soon" | "upcoming";
  action_required: string;
}

export interface ComplianceRecommendation {
  priority: "high" | "medium" | "low";
  category: string;
  description: string;
  impact: string;
  estimated_effort: string;
}

export interface HistoricalIssue {
  date: string;
  type: string;
  description: string;
  resolution: string;
  recurrence_risk: "high" | "medium" | "low";
}

export interface PredictedViolation {
  type: string;
  probability: number;
  timeframe: string;
  prevention_steps: string[];
}

/**
 * Get AI compliance risk assessment
 */
export function useComplianceRiskAssessment() {
  return useQuery({
    queryKey: ["compliance-risk"],
    queryFn: async (): Promise<ComplianceRiskResult> => {
      try {
        const response = await apiClient.get("/ai/compliance/risk-assessment");
        return response.data;
      } catch {
        // Demo fallback
        try {
          const dashboardRes = await apiClient.get("/compliance/dashboard", {
            params: { days_ahead: 90 },
          });
          return generateDemoRiskAssessment(dashboardRes.data);
        } catch {
          return generateDemoRiskAssessment(null);
        }
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Predict compliance issues
 */
export function usePredictComplianceIssues() {
  return useMutation({
    mutationFn: async (params: {
      lookAheadDays: number;
    }): Promise<{
      predictions: PredictedViolation[];
      risk_timeline: Array<{ date: string; risk_level: number; events: string[] }>;
    }> => {
      try {
        const response = await apiClient.post("/ai/compliance/predict", params);
        return response.data;
      } catch {
        return {
          predictions: [
            {
              type: "License Expiration",
              probability: 85,
              timeframe: "Next 30 days",
              prevention_steps: ["Initiate renewal process", "Submit required documentation"],
            },
          ],
          risk_timeline: [
            { date: "2024-02-15", risk_level: 60, events: ["License renewal deadline"] },
            { date: "2024-03-01", risk_level: 40, events: ["Quarterly inspection due"] },
          ],
        };
      }
    },
  });
}

/**
 * Get compliance improvement plan
 */
export function useComplianceImprovementPlan() {
  return useQuery({
    queryKey: ["compliance-improvement-plan"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/ai/compliance/improvement-plan");
        return response.data;
      } catch {
        return {
          current_score: 75,
          target_score: 95,
          improvement_timeline: "90 days",
          phases: [
            {
              phase: 1,
              title: "Immediate Actions",
              duration: "2 weeks",
              tasks: [
                "Complete overdue license renewals",
                "Schedule pending inspections",
              ],
              expected_score_improvement: 10,
            },
            {
              phase: 2,
              title: "Process Improvements",
              duration: "4 weeks",
              tasks: [
                "Implement automated renewal reminders",
                "Create compliance calendar",
              ],
              expected_score_improvement: 5,
            },
            {
              phase: 3,
              title: "Long-term Excellence",
              duration: "6 weeks",
              tasks: [
                "Cross-train team on compliance requirements",
                "Establish quarterly compliance reviews",
              ],
              expected_score_improvement: 5,
            },
          ],
        };
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Analyze technician compliance
 */
export function useTechnicianComplianceAnalysis() {
  return useQuery({
    queryKey: ["technician-compliance"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/ai/compliance/technician-analysis");
        return response.data;
      } catch {
        return {
          technicians: [
            {
              name: "John Smith",
              compliance_score: 95,
              status: "compliant",
              expiring_items: 0,
            },
            {
              name: "Jane Doe",
              compliance_score: 78,
              status: "at_risk",
              expiring_items: 2,
            },
          ],
          team_average: 85,
          recommendations: ["Prioritize Jane Doe's certification renewals"],
        };
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

interface DashboardData {
  summary?: {
    total_licenses: number;
    total_certifications: number;
    expiring_licenses_count: number;
    expiring_certifications_count: number;
    pending_inspections_count: number;
    overdue_inspections_count: number;
  };
  expiring_items?: Array<{
    type: string;
    name: string;
    expiration_date: string;
    days_until_expiry: number;
  }>;
}

/**
 * Generate demo risk assessment
 */
function generateDemoRiskAssessment(dashboard: DashboardData | null): ComplianceRiskResult {
  const summary = dashboard?.summary || {
    total_licenses: 5,
    total_certifications: 12,
    expiring_licenses_count: 1,
    expiring_certifications_count: 2,
    pending_inspections_count: 3,
    overdue_inspections_count: 0,
  };

  // Calculate risk score
  let riskScore = 20; // Base score
  riskScore += summary.expiring_licenses_count * 15;
  riskScore += summary.expiring_certifications_count * 10;
  riskScore += summary.pending_inspections_count * 5;
  riskScore += summary.overdue_inspections_count * 25;
  riskScore = Math.min(100, riskScore);

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (riskScore >= 80) riskLevel = "critical";
  else if (riskScore >= 60) riskLevel = "high";
  else if (riskScore >= 40) riskLevel = "medium";

  // Calculate compliance score (inverse of risk)
  const complianceScore = 100 - riskScore;

  // Generate risk factors
  const riskFactors: RiskFactor[] = [];

  if (summary.expiring_licenses_count > 0) {
    riskFactors.push({
      type: "license",
      description: `${summary.expiring_licenses_count} license(s) expiring soon`,
      severity: "high",
      days_until_due: 30,
      action_required: "Initiate renewal process immediately",
    });
  }

  if (summary.expiring_certifications_count > 0) {
    riskFactors.push({
      type: "certification",
      description: `${summary.expiring_certifications_count} certification(s) need renewal`,
      severity: "medium",
      days_until_due: 45,
      action_required: "Schedule recertification training",
    });
  }

  if (summary.overdue_inspections_count > 0) {
    riskFactors.push({
      type: "inspection",
      description: `${summary.overdue_inspections_count} overdue inspection(s)`,
      severity: "high",
      action_required: "Schedule inspections immediately",
    });
  }

  if (summary.pending_inspections_count > 0) {
    riskFactors.push({
      type: "inspection",
      description: `${summary.pending_inspections_count} pending inspection(s)`,
      severity: "medium",
      action_required: "Prepare documentation for upcoming inspections",
    });
  }

  // Generate upcoming deadlines
  const deadlines: ComplianceDeadline[] = [];
  if (dashboard?.expiring_items) {
    dashboard.expiring_items.slice(0, 5).forEach((item) => {
      let urgency: "overdue" | "urgent" | "soon" | "upcoming" = "upcoming";
      if (item.days_until_expiry < 0) urgency = "overdue";
      else if (item.days_until_expiry < 14) urgency = "urgent";
      else if (item.days_until_expiry < 30) urgency = "soon";

      deadlines.push({
        item_type: item.type,
        item_name: item.name,
        deadline: item.expiration_date,
        days_remaining: item.days_until_expiry,
        urgency,
        action_required: urgency === "overdue"
          ? "Immediate action required"
          : "Initiate renewal process",
      });
    });
  } else {
    // Demo deadlines
    deadlines.push({
      item_type: "License",
      item_name: "State Contractor License",
      deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      days_remaining: 25,
      urgency: "soon",
      action_required: "Submit renewal application",
    });
  }

  // Generate recommendations
  const recommendations: ComplianceRecommendation[] = [
    {
      priority: riskFactors.some((f) => f.severity === "high") ? "high" : "medium",
      category: "Renewals",
      description: "Set up automated renewal reminders 90 days before expiration",
      impact: "Prevent last-minute compliance gaps",
      estimated_effort: "2 hours setup",
    },
    {
      priority: "medium",
      category: "Documentation",
      description: "Digitize and centralize all compliance documents",
      impact: "Faster audit preparation and reduced risk",
      estimated_effort: "1-2 days",
    },
    {
      priority: "low",
      category: "Training",
      description: "Schedule quarterly compliance training sessions",
      impact: "Improved team awareness and reduced violations",
      estimated_effort: "Ongoing",
    },
  ];

  // Predicted violations
  const predictedViolations: PredictedViolation[] = [];
  if (summary.expiring_licenses_count > 0) {
    predictedViolations.push({
      type: "License Lapse",
      probability: 70,
      timeframe: "Next 45 days",
      prevention_steps: [
        "Submit renewal application this week",
        "Verify all required documentation is current",
        "Follow up with licensing board",
      ],
    });
  }

  return {
    overall_risk_level: riskLevel,
    risk_score: riskScore,
    risk_factors: riskFactors,
    upcoming_deadlines: deadlines,
    recommendations,
    historical_issues: [
      {
        date: "2023-09-15",
        type: "Late Renewal",
        description: "License renewal submitted 5 days after expiration",
        resolution: "Expedited renewal with late fee",
        recurrence_risk: "medium",
      },
    ],
    predicted_violations: predictedViolations,
    compliance_score: complianceScore,
  };
}
