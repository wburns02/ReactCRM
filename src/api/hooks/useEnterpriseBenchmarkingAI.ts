import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Industry benchmark data
 */
export interface IndustryBenchmark {
  metric: string;
  your_value: number;
  industry_average: number;
  top_performers: number;
  percentile: number;
  trend: "above" | "at" | "below";
  category: "financial" | "operational" | "customer" | "efficiency";
}

/**
 * Competitive analysis result
 */
export interface CompetitiveAnalysis {
  overall_score: number;
  market_position: "leader" | "challenger" | "follower" | "niche";
  strengths: CompetitiveStrength[];
  weaknesses: CompetitiveWeakness[];
  opportunities: GrowthOpportunity[];
  threats: MarketThreat[];
}

export interface CompetitiveStrength {
  area: string;
  score: number;
  description: string;
  competitive_advantage: boolean;
}

export interface CompetitiveWeakness {
  area: string;
  gap: number;
  description: string;
  improvement_priority: "high" | "medium" | "low";
}

export interface GrowthOpportunity {
  title: string;
  description: string;
  market_size_potential: number;
  investment_required: "low" | "medium" | "high";
  time_to_value: string;
}

export interface MarketThreat {
  threat: string;
  severity: "low" | "medium" | "high";
  likelihood: number;
  mitigation: string;
}

/**
 * Performance comparison with similar businesses
 */
export interface PeerComparison {
  peer_group: string;
  peer_count: number;
  your_rank: number;
  metrics: PeerMetric[];
  recommendations: string[];
}

export interface PeerMetric {
  name: string;
  your_value: number;
  peer_average: number;
  peer_best: number;
  unit: string;
  better_if: "higher" | "lower";
}

/**
 * Get industry benchmarks
 */
export function useIndustryBenchmarks(params?: {
  industry?: string;
  region?: string;
  company_size?: "small" | "medium" | "large";
}) {
  return useQuery({
    queryKey: ["industry-benchmarks", params],
    queryFn: async (): Promise<IndustryBenchmark[]> => {
      try {
        const response = await apiClient.get("/ai/benchmarks/industry", {
          params,
        });
        return response.data;
      } catch {
        return generateDemoIndustryBenchmarks();
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get competitive analysis
 */
export function useCompetitiveAnalysis() {
  return useQuery({
    queryKey: ["competitive-analysis"],
    queryFn: async (): Promise<CompetitiveAnalysis> => {
      try {
        const response = await apiClient.get(
          "/ai/benchmarks/competitive-analysis",
        );
        return response.data;
      } catch {
        return generateDemoCompetitiveAnalysis();
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Get peer comparison
 */
export function usePeerComparison(params?: {
  revenue_range?: string;
  employee_count?: string;
  region?: string;
}) {
  return useQuery({
    queryKey: ["peer-comparison", params],
    queryFn: async (): Promise<PeerComparison> => {
      try {
        const response = await apiClient.get("/ai/benchmarks/peer-comparison", {
          params,
        });
        return response.data;
      } catch {
        return generateDemoPeerComparison();
      }
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Request custom benchmark report
 */
export function useRequestBenchmarkReport() {
  return useMutation({
    mutationFn: async (params: {
      metrics: string[];
      comparison_type: "industry" | "region" | "size";
      date_range: { start: string; end: string };
    }): Promise<{
      report_id: string;
      status: string;
      estimated_completion: string;
    }> => {
      try {
        const response = await apiClient.post(
          "/ai/benchmarks/custom-report",
          params,
        );
        return response.data;
      } catch {
        return {
          report_id: `report-${Date.now()}`,
          status: "processing",
          estimated_completion: new Date(
            Date.now() + 5 * 60 * 1000,
          ).toISOString(),
        };
      }
    },
  });
}

/**
 * Generate demo industry benchmarks
 */
function generateDemoIndustryBenchmarks(): IndustryBenchmark[] {
  return [
    {
      metric: "Revenue per Technician",
      your_value: 185000,
      industry_average: 165000,
      top_performers: 225000,
      percentile: 72,
      trend: "above",
      category: "financial",
    },
    {
      metric: "First-Time Fix Rate",
      your_value: 87,
      industry_average: 82,
      top_performers: 94,
      percentile: 68,
      trend: "above",
      category: "operational",
    },
    {
      metric: "Customer Satisfaction",
      your_value: 4.6,
      industry_average: 4.2,
      top_performers: 4.8,
      percentile: 78,
      trend: "above",
      category: "customer",
    },
    {
      metric: "Avg Response Time (hrs)",
      your_value: 4.2,
      industry_average: 6.5,
      top_performers: 2.0,
      percentile: 65,
      trend: "above",
      category: "efficiency",
    },
    {
      metric: "Gross Margin %",
      your_value: 34,
      industry_average: 32,
      top_performers: 42,
      percentile: 55,
      trend: "at",
      category: "financial",
    },
    {
      metric: "Jobs per Technician/Day",
      your_value: 4.2,
      industry_average: 3.8,
      top_performers: 5.5,
      percentile: 62,
      trend: "above",
      category: "efficiency",
    },
    {
      metric: "Customer Retention Rate",
      your_value: 78,
      industry_average: 72,
      top_performers: 88,
      percentile: 65,
      trend: "above",
      category: "customer",
    },
    {
      metric: "Invoice Collection Days",
      your_value: 28,
      industry_average: 32,
      top_performers: 18,
      percentile: 58,
      trend: "above",
      category: "financial",
    },
  ];
}

/**
 * Generate demo competitive analysis
 */
function generateDemoCompetitiveAnalysis(): CompetitiveAnalysis {
  return {
    overall_score: 74,
    market_position: "challenger",
    strengths: [
      {
        area: "Customer Service",
        score: 88,
        description:
          "Above-average response times and customer satisfaction scores",
        competitive_advantage: true,
      },
      {
        area: "Technical Expertise",
        score: 82,
        description: "Higher first-time fix rate than industry average",
        competitive_advantage: true,
      },
      {
        area: "Local Market Presence",
        score: 76,
        description: "Strong brand recognition in primary service area",
        competitive_advantage: false,
      },
    ],
    weaknesses: [
      {
        area: "Digital Presence",
        gap: 25,
        description: "Website and online booking lag behind competitors",
        improvement_priority: "high",
      },
      {
        area: "Service Diversity",
        gap: 18,
        description: "Limited service offerings compared to larger competitors",
        improvement_priority: "medium",
      },
      {
        area: "Pricing Competitiveness",
        gap: 12,
        description:
          "Prices slightly above market average without clear value differentiation",
        improvement_priority: "low",
      },
    ],
    opportunities: [
      {
        title: "Commercial Market Expansion",
        description:
          "Growing demand for commercial septic services in nearby industrial parks",
        market_size_potential: 450000,
        investment_required: "medium",
        time_to_value: "6-12 months",
      },
      {
        title: "Maintenance Plan Upselling",
        description:
          "Only 18% of customers on recurring plans vs 35% industry standard",
        market_size_potential: 180000,
        investment_required: "low",
        time_to_value: "3-6 months",
      },
      {
        title: "Emergency Services Premium",
        description:
          "Market opportunity for 24/7 emergency response at premium pricing",
        market_size_potential: 120000,
        investment_required: "low",
        time_to_value: "1-3 months",
      },
    ],
    threats: [
      {
        threat: "New Regional Competitor",
        severity: "medium",
        likelihood: 0.65,
        mitigation: "Strengthen customer relationships and loyalty programs",
      },
      {
        threat: "Labor Shortage",
        severity: "high",
        likelihood: 0.78,
        mitigation: "Invest in training programs and competitive compensation",
      },
      {
        threat: "Regulatory Changes",
        severity: "low",
        likelihood: 0.35,
        mitigation: "Stay informed and maintain compliance buffer",
      },
    ],
  };
}

/**
 * Generate demo peer comparison
 */
function generateDemoPeerComparison(): PeerComparison {
  return {
    peer_group: "Regional Septic Services ($1M-$3M Revenue)",
    peer_count: 47,
    your_rank: 12,
    metrics: [
      {
        name: "Annual Revenue",
        your_value: 1850000,
        peer_average: 1620000,
        peer_best: 2980000,
        unit: "$",
        better_if: "higher",
      },
      {
        name: "Profit Margin",
        your_value: 18.5,
        peer_average: 15.2,
        peer_best: 28.4,
        unit: "%",
        better_if: "higher",
      },
      {
        name: "Technician Count",
        your_value: 8,
        peer_average: 7,
        peer_best: 12,
        unit: "",
        better_if: "higher",
      },
      {
        name: "Customer Churn",
        your_value: 12,
        peer_average: 18,
        peer_best: 6,
        unit: "%",
        better_if: "lower",
      },
      {
        name: "Avg Ticket Size",
        your_value: 385,
        peer_average: 342,
        peer_best: 520,
        unit: "$",
        better_if: "higher",
      },
      {
        name: "Online Reviews Avg",
        your_value: 4.6,
        peer_average: 4.2,
        peer_best: 4.9,
        unit: "stars",
        better_if: "higher",
      },
    ],
    recommendations: [
      "Focus on increasing average ticket size through service bundling and upselling",
      "Implement customer retention program to further reduce churn below peer average",
      "Consider expanding technician team to capture more market share",
      "Invest in digital marketing to improve online presence and lead generation",
    ],
  };
}
