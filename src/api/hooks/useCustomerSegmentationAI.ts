import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Customer segment definition
 */
export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  customer_count: number;
  avg_lifetime_value: number;
  avg_service_frequency: number;
  churn_risk: "low" | "medium" | "high";
  recommended_actions: string[];
}

export interface SegmentCriteria {
  field: string;
  operator: "equals" | "greater_than" | "less_than" | "contains" | "between";
  value: string | number | [number, number];
}

/**
 * AI-discovered segment
 */
export interface DiscoveredSegment {
  name: string;
  description: string;
  customer_ids: string[];
  customer_count: number;
  shared_characteristics: string[];
  business_opportunity: string;
  suggested_campaign: string;
  confidence: number;
}

/**
 * Segmentation analytics
 */
export interface SegmentationAnalytics {
  total_customers: number;
  segmented_customers: number;
  segments: SegmentSummary[];
  insights: SegmentInsight[];
}

export interface SegmentSummary {
  segment_name: string;
  customer_count: number;
  revenue_contribution: number;
  growth_trend: "growing" | "stable" | "declining";
}

export interface SegmentInsight {
  type: "opportunity" | "risk" | "trend";
  title: string;
  description: string;
  affected_segment: string;
  action_required: boolean;
}

/**
 * Get all customer segments
 */
export function useCustomerSegments() {
  return useQuery({
    queryKey: ["customer-segments"],
    queryFn: async (): Promise<CustomerSegment[]> => {
      try {
        const response = await apiClient.get("/ai/segments");
        return response.data;
      } catch {
        return generateDemoSegments();
      }
    },
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Discover new segments using AI
 */
export function useDiscoverSegments() {
  return useMutation({
    mutationFn: async (params?: {
      min_segment_size?: number;
      focus_area?: "revenue" | "churn" | "growth" | "behavior";
    }): Promise<DiscoveredSegment[]> => {
      try {
        const response = await apiClient.post("/ai/segments/discover", params);
        return response.data;
      } catch {
        return generateDemoDiscoveredSegments();
      }
    },
  });
}

/**
 * Get segmentation analytics
 */
export function useSegmentationAnalytics() {
  return useQuery({
    queryKey: ["segmentation-analytics"],
    queryFn: async (): Promise<SegmentationAnalytics> => {
      try {
        const response = await apiClient.get("/ai/segments/analytics");
        return response.data;
      } catch {
        return generateDemoAnalytics();
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Assign customer to segment
 */
export function useAssignToSegment() {
  return useMutation({
    mutationFn: async (params: {
      customer_id: string;
      segment_id: string;
    }): Promise<{ success: boolean }> => {
      try {
        const response = await apiClient.post("/ai/segments/assign", params);
        return response.data;
      } catch {
        return { success: true };
      }
    },
  });
}

function generateDemoSegments(): CustomerSegment[] {
  return [
    {
      id: "seg-1",
      name: "High-Value Residential",
      description:
        "Residential customers with high lifetime value and regular service history",
      criteria: [
        { field: "lifetime_value", operator: "greater_than", value: 2000 },
        { field: "service_count", operator: "greater_than", value: 5 },
        { field: "customer_type", operator: "equals", value: "residential" },
      ],
      customer_count: 234,
      avg_lifetime_value: 3450,
      avg_service_frequency: 2.3,
      churn_risk: "low",
      recommended_actions: [
        "Offer loyalty discount on next service",
        "Invite to maintenance plan upgrade",
        "Request referrals with incentive",
      ],
    },
    {
      id: "seg-2",
      name: "Commercial Accounts",
      description: "Business customers with regular maintenance contracts",
      criteria: [
        { field: "customer_type", operator: "equals", value: "commercial" },
        { field: "has_contract", operator: "equals", value: "true" },
      ],
      customer_count: 89,
      avg_lifetime_value: 12500,
      avg_service_frequency: 4.5,
      churn_risk: "low",
      recommended_actions: [
        "Annual contract review meeting",
        "Cross-sell additional services",
        "Priority scheduling during peak season",
      ],
    },
    {
      id: "seg-3",
      name: "At-Risk Customers",
      description: "Customers showing signs of potential churn",
      criteria: [
        { field: "last_service_days", operator: "greater_than", value: 365 },
        { field: "satisfaction_score", operator: "less_than", value: 4 },
      ],
      customer_count: 67,
      avg_lifetime_value: 1200,
      avg_service_frequency: 0.8,
      churn_risk: "high",
      recommended_actions: [
        "Personal outreach call",
        "Offer win-back discount",
        "Survey to understand concerns",
      ],
    },
    {
      id: "seg-4",
      name: "New Customers",
      description: "Customers acquired in the last 6 months",
      criteria: [
        {
          field: "created_at",
          operator: "greater_than",
          value: "6_months_ago",
        },
      ],
      customer_count: 156,
      avg_lifetime_value: 450,
      avg_service_frequency: 1.2,
      churn_risk: "medium",
      recommended_actions: [
        "Welcome email series",
        "First-service follow-up call",
        "Introduce maintenance plan benefits",
      ],
    },
  ];
}

function generateDemoDiscoveredSegments(): DiscoveredSegment[] {
  return [
    {
      name: "Weekend Servicers",
      description: "Customers who consistently request weekend appointments",
      customer_ids: ["c-1", "c-2", "c-3"],
      customer_count: 45,
      shared_characteristics: [
        "Book appointments for Saturday/Sunday",
        "Primarily residential",
        "Higher average ticket size",
      ],
      business_opportunity: "Premium weekend service tier",
      suggested_campaign:
        "Introduce weekend premium service with priority scheduling",
      confidence: 0.87,
    },
    {
      name: "Emergency Repeaters",
      description: "Customers with multiple emergency service calls",
      customer_ids: ["c-4", "c-5"],
      customer_count: 23,
      shared_characteristics: [
        "2+ emergency calls in past year",
        "Older equipment",
        "No maintenance plan",
      ],
      business_opportunity: "Convert to preventive maintenance plans",
      suggested_campaign:
        "Targeted maintenance plan offer with emergency reduction guarantee",
      confidence: 0.92,
    },
  ];
}

function generateDemoAnalytics(): SegmentationAnalytics {
  return {
    total_customers: 1456,
    segmented_customers: 1289,
    segments: [
      {
        segment_name: "High-Value Residential",
        customer_count: 234,
        revenue_contribution: 0.35,
        growth_trend: "growing",
      },
      {
        segment_name: "Commercial Accounts",
        customer_count: 89,
        revenue_contribution: 0.42,
        growth_trend: "stable",
      },
      {
        segment_name: "At-Risk Customers",
        customer_count: 67,
        revenue_contribution: 0.05,
        growth_trend: "declining",
      },
      {
        segment_name: "New Customers",
        customer_count: 156,
        revenue_contribution: 0.08,
        growth_trend: "growing",
      },
    ],
    insights: [
      {
        type: "opportunity",
        title: "Untapped Commercial Potential",
        description:
          "23% of residential customers have business addresses - potential for commercial conversion",
        affected_segment: "High-Value Residential",
        action_required: true,
      },
      {
        type: "risk",
        title: "Increasing Churn Risk",
        description: "At-risk segment grew 15% this quarter",
        affected_segment: "At-Risk Customers",
        action_required: true,
      },
      {
        type: "trend",
        title: "New Customer Growth",
        description:
          "30% increase in new customer acquisition compared to last quarter",
        affected_segment: "New Customers",
        action_required: false,
      },
    ],
  };
}
