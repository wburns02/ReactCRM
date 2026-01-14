import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Job profitability analysis result
 */
export interface JobProfitabilityAnalysis {
  overall_margin_percent: number;
  total_revenue: number;
  total_costs: number;
  total_profit: number;
  trend: "improving" | "declining" | "stable";
  trend_percent: number;
  by_service_type: ServiceTypeProfitability[];
  by_technician: TechnicianProfitability[];
  by_customer_segment: SegmentProfitability[];
  problem_areas: ProblemArea[];
  opportunities: ProfitOpportunity[];
  recommendations: ProfitRecommendation[];
}

export interface ServiceTypeProfitability {
  service_type: string;
  revenue: number;
  cost: number;
  margin_percent: number;
  job_count: number;
  avg_duration_hours: number;
  trend: "up" | "down" | "stable";
}

export interface TechnicianProfitability {
  technician_id: string;
  technician_name: string;
  revenue_generated: number;
  margin_percent: number;
  efficiency_score: number;
  avg_job_time: number;
  callback_rate: number;
  material_usage_efficiency: number;
}

export interface SegmentProfitability {
  segment: "residential" | "commercial" | "industrial" | "municipal";
  revenue: number;
  margin_percent: number;
  customer_count: number;
  lifetime_value_avg: number;
  acquisition_cost_avg: number;
}

export interface ProblemArea {
  type: "service" | "technician" | "customer" | "material";
  name: string;
  issue: string;
  impact_monthly: number;
  severity: "low" | "medium" | "high";
}

export interface ProfitOpportunity {
  category: "pricing" | "efficiency" | "upsell" | "cost_reduction";
  title: string;
  description: string;
  potential_monthly_gain: number;
  effort: "low" | "medium" | "high";
  confidence: number;
}

export interface ProfitRecommendation {
  priority: "high" | "medium" | "low";
  action: string;
  expected_impact: string;
  implementation_steps: string[];
  timeline: string;
}

/**
 * Individual job profitability
 */
export interface JobProfitability {
  job_id: string;
  customer_name: string;
  service_type: string;
  technician_name: string;
  revenue: number;
  labor_cost: number;
  material_cost: number;
  overhead_cost: number;
  total_cost: number;
  profit: number;
  margin_percent: number;
  duration_hours: number;
  profitable: boolean;
  efficiency_score: number;
  issues?: string[];
}

/**
 * Get overall profitability analysis
 */
export function useJobProfitabilityAnalysis(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ["job-profitability", dateRange],
    queryFn: async (): Promise<JobProfitabilityAnalysis> => {
      try {
        const response = await apiClient.get("/ai/jobs/profitability/analysis", {
          params: dateRange,
        });
        return response.data;
      } catch {
        return generateDemoProfitabilityAnalysis();
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get profitability for a specific job
 */
export function useJobProfitability(jobId: string) {
  return useQuery({
    queryKey: ["job-profitability-detail", jobId],
    queryFn: async (): Promise<JobProfitability> => {
      try {
        const response = await apiClient.get(`/ai/jobs/${jobId}/profitability`);
        return response.data;
      } catch {
        return generateDemoJobProfitability(jobId);
      }
    },
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Analyze what-if pricing scenarios
 */
export function usePricingScenarioAnalysis() {
  return useMutation({
    mutationFn: async (params: {
      service_type: string;
      price_change_percent: number;
    }): Promise<{
      current_margin: number;
      projected_margin: number;
      current_volume: number;
      projected_volume: number;
      net_profit_change: number;
      recommendation: string;
    }> => {
      try {
        const response = await apiClient.post("/ai/jobs/profitability/scenario", params);
        return response.data;
      } catch {
        const volumeImpact = params.price_change_percent > 0 ? -0.5 : 0.3;
        return {
          current_margin: 32,
          projected_margin: 32 + params.price_change_percent * 0.8,
          current_volume: 150,
          projected_volume: Math.round(150 * (1 + volumeImpact * params.price_change_percent / 10)),
          net_profit_change: params.price_change_percent * 450,
          recommendation: params.price_change_percent > 10
            ? "Price increase may significantly impact volume. Consider phased approach."
            : params.price_change_percent > 0
            ? "Moderate price increase recommended with value justification."
            : "Price reduction may attract new customers but impact margins.",
        };
      }
    },
  });
}

/**
 * Generate demo profitability analysis
 */
function generateDemoProfitabilityAnalysis(): JobProfitabilityAnalysis {
  return {
    overall_margin_percent: 34.2,
    total_revenue: 485000,
    total_costs: 319130,
    total_profit: 165870,
    trend: "improving",
    trend_percent: 4.5,
    by_service_type: [
      {
        service_type: "Pumping",
        revenue: 185000,
        cost: 111000,
        margin_percent: 40.0,
        job_count: 312,
        avg_duration_hours: 1.5,
        trend: "stable",
      },
      {
        service_type: "Repair",
        revenue: 142000,
        cost: 99400,
        margin_percent: 30.0,
        job_count: 89,
        avg_duration_hours: 3.2,
        trend: "up",
      },
      {
        service_type: "Installation",
        revenue: 98000,
        cost: 63700,
        margin_percent: 35.0,
        job_count: 24,
        avg_duration_hours: 8.5,
        trend: "up",
      },
      {
        service_type: "Inspection",
        revenue: 38000,
        cost: 28500,
        margin_percent: 25.0,
        job_count: 156,
        avg_duration_hours: 0.75,
        trend: "down",
      },
      {
        service_type: "Grease Trap",
        revenue: 22000,
        cost: 16530,
        margin_percent: 24.9,
        job_count: 45,
        avg_duration_hours: 1.0,
        trend: "stable",
      },
    ],
    by_technician: [
      {
        technician_id: "t-001",
        technician_name: "Mike Johnson",
        revenue_generated: 145000,
        margin_percent: 38.5,
        efficiency_score: 94,
        avg_job_time: 1.8,
        callback_rate: 2.1,
        material_usage_efficiency: 96,
      },
      {
        technician_id: "t-002",
        technician_name: "Sarah Williams",
        revenue_generated: 128000,
        margin_percent: 36.2,
        efficiency_score: 91,
        avg_job_time: 2.0,
        callback_rate: 2.8,
        material_usage_efficiency: 93,
      },
      {
        technician_id: "t-003",
        technician_name: "Tom Davis",
        revenue_generated: 112000,
        margin_percent: 32.8,
        efficiency_score: 87,
        avg_job_time: 2.3,
        callback_rate: 4.2,
        material_usage_efficiency: 89,
      },
      {
        technician_id: "t-004",
        technician_name: "Lisa Chen",
        revenue_generated: 100000,
        margin_percent: 29.5,
        efficiency_score: 82,
        avg_job_time: 2.5,
        callback_rate: 5.1,
        material_usage_efficiency: 85,
      },
    ],
    by_customer_segment: [
      {
        segment: "residential",
        revenue: 285000,
        margin_percent: 32.5,
        customer_count: 1245,
        lifetime_value_avg: 2850,
        acquisition_cost_avg: 85,
      },
      {
        segment: "commercial",
        revenue: 145000,
        margin_percent: 38.2,
        customer_count: 89,
        lifetime_value_avg: 12500,
        acquisition_cost_avg: 250,
      },
      {
        segment: "municipal",
        revenue: 55000,
        margin_percent: 28.5,
        customer_count: 12,
        lifetime_value_avg: 45000,
        acquisition_cost_avg: 1500,
      },
    ],
    problem_areas: [
      {
        type: "service",
        name: "Inspection Services",
        issue: "Margin declining due to increased competition",
        impact_monthly: 2800,
        severity: "medium",
      },
      {
        type: "technician",
        name: "Lisa Chen",
        issue: "Higher callback rate affecting profitability",
        impact_monthly: 1850,
        severity: "medium",
      },
      {
        type: "material",
        name: "Pump Supplies",
        issue: "Material costs 12% above industry average",
        impact_monthly: 3200,
        severity: "high",
      },
    ],
    opportunities: [
      {
        category: "pricing",
        title: "Increase Commercial Rates",
        description: "Commercial segment shows strong demand elasticity - 5% price increase projected to maintain volume",
        potential_monthly_gain: 7250,
        effort: "low",
        confidence: 0.85,
      },
      {
        category: "efficiency",
        title: "Route Optimization",
        description: "Better route planning could reduce travel time by 15%",
        potential_monthly_gain: 4500,
        effort: "medium",
        confidence: 0.78,
      },
      {
        category: "upsell",
        title: "Maintenance Plans",
        description: "Only 18% of residential customers on maintenance plans",
        potential_monthly_gain: 8500,
        effort: "medium",
        confidence: 0.72,
      },
      {
        category: "cost_reduction",
        title: "Supplier Negotiation",
        description: "Volume purchasing agreements could reduce material costs",
        potential_monthly_gain: 3800,
        effort: "low",
        confidence: 0.88,
      },
    ],
    recommendations: [
      {
        priority: "high",
        action: "Renegotiate supplier contracts for pump equipment",
        expected_impact: "12% reduction in material costs ($3,200/month)",
        implementation_steps: [
          "Gather 12-month purchase history",
          "Request quotes from 3 alternative suppliers",
          "Negotiate volume discounts with current supplier",
          "Implement new pricing by end of quarter",
        ],
        timeline: "2-4 weeks",
      },
      {
        priority: "high",
        action: "Launch maintenance plan upsell campaign",
        expected_impact: "30% increase in plan subscribers ($8,500/month)",
        implementation_steps: [
          "Create promotional materials",
          "Train technicians on plan benefits",
          "Implement post-service follow-up automation",
          "Track conversion metrics weekly",
        ],
        timeline: "1-2 weeks",
      },
      {
        priority: "medium",
        action: "Address technician callback rates",
        expected_impact: "Reduce callbacks by 40% ($1,850/month)",
        implementation_steps: [
          "Analyze callback root causes by technician",
          "Implement quality checklist before job completion",
          "Schedule coaching sessions for high-callback techs",
          "Monitor improvement over 30 days",
        ],
        timeline: "2-3 weeks",
      },
    ],
  };
}

/**
 * Generate demo job profitability
 */
function generateDemoJobProfitability(jobId: string): JobProfitability {
  return {
    job_id: jobId,
    customer_name: "Sample Customer",
    service_type: "Pumping",
    technician_name: "Mike Johnson",
    revenue: 485,
    labor_cost: 125,
    material_cost: 85,
    overhead_cost: 45,
    total_cost: 255,
    profit: 230,
    margin_percent: 47.4,
    duration_hours: 1.5,
    profitable: true,
    efficiency_score: 92,
  };
}
