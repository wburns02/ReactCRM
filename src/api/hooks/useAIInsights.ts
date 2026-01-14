/**
 * AI Insights API Hooks
 *
 * React Query hooks for AI-powered insights and recommendations
 * for the Customer Success platform.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";

// ============================================
// Types
// ============================================

export interface CampaignAIAnalysis {
  campaign_id: number;
  campaign_name: string;
  analysis: {
    overall_health: "good" | "needs_attention" | "poor";
    health_score: number;
    key_insights: string[];
    recommendations: Array<{
      priority: "high" | "medium" | "low";
      action: string;
      expected_impact: string;
    }>;
    bottlenecks: string[];
    opportunities: string[];
  };
  analyzed_at: string;
}

export interface PortfolioInsights {
  campaign_count: number;
  insights: {
    portfolio_health: "healthy" | "mixed" | "needs_work";
    top_performer: string;
    needs_attention: string[];
    strategic_insights: Array<{
      category: string;
      insight: string;
      action: string;
    }>;
    quick_wins: string[];
    resource_allocation: string;
  };
  generated_at: string;
}

export interface SubjectSuggestions {
  original: string;
  variants: Array<{
    subject: string;
    strategy: string;
  }>;
  recommended_test: string;
}

export interface ContentSuggestion {
  suggestion_type: "email" | "sms" | "in_app";
  content: string;
  personalization_tags: string[];
  tone: string;
  cta_options: string[];
}

export interface CustomerInsight {
  customer_id: number;
  customer_name: string;
  risk_level: "low" | "medium" | "high" | "critical";
  engagement_trend: "improving" | "stable" | "declining";
  key_findings: string[];
  recommended_actions: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    rationale: string;
  }>;
  next_best_action: string;
  analyzed_at: string;
}

export interface AIRecommendation {
  id: string;
  type: "campaign" | "customer" | "portfolio" | "engagement";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  impact_score: number;
  effort_score: number;
  suggested_action: string;
  created_at: string;
  dismissed: boolean;
  applied: boolean;
}

// ============================================
// Query Keys
// ============================================

export const aiInsightsKeys = {
  all: ["ai-insights"] as const,
  portfolioInsights: () => [...aiInsightsKeys.all, "portfolio"] as const,
  campaignAnalysis: (campaignId: number) =>
    [...aiInsightsKeys.all, "campaign", campaignId] as const,
  customerInsight: (customerId: number) =>
    [...aiInsightsKeys.all, "customer", customerId] as const,
  recommendations: () => [...aiInsightsKeys.all, "recommendations"] as const,
};

// ============================================
// Portfolio Insights Hook
// ============================================

export function usePortfolioInsights() {
  return useQuery({
    queryKey: aiInsightsKeys.portfolioInsights(),
    queryFn: async (): Promise<PortfolioInsights> => {
      const { data } = await apiClient.get("/cs/ai/portfolio-insights");
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// Campaign AI Analysis Hook
// ============================================

export function useCampaignAIAnalysis(campaignId: number | null) {
  return useQuery({
    queryKey: aiInsightsKeys.campaignAnalysis(campaignId!),
    queryFn: async (): Promise<CampaignAIAnalysis> => {
      const { data } = await apiClient.get(
        `/cs/ai/campaigns/${campaignId}/ai-analysis`,
      );
      return data;
    },
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Customer Insight Hook
// ============================================

export function useCustomerInsight(customerId: number | null) {
  return useQuery({
    queryKey: aiInsightsKeys.customerInsight(customerId!),
    queryFn: async (): Promise<CustomerInsight> => {
      const { data } = await apiClient.get(
        `/cs/ai/customers/${customerId}/insight`,
      );
      return data;
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// AI Recommendations Hook
// ============================================

export function useAIRecommendations() {
  return useQuery({
    queryKey: aiInsightsKeys.recommendations(),
    queryFn: async (): Promise<AIRecommendation[]> => {
      const { data } = await apiClient.get("/cs/ai/recommendations");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Subject Line Suggestions Mutation
// ============================================

export function useSubjectSuggestions() {
  return useMutation({
    mutationFn: async (data: {
      subject: string;
      campaign_goal: string;
    }): Promise<SubjectSuggestions> => {
      const response = await apiClient.post("/cs/ai/subject-suggestions", data);
      return response.data;
    },
  });
}

// ============================================
// Content Suggestions Mutation
// ============================================

export function useContentSuggestions() {
  return useMutation({
    mutationFn: async (data: {
      content_type: "email" | "sms" | "in_app";
      context: string;
      tone?: string;
      customer_segment?: string;
    }): Promise<ContentSuggestion> => {
      const response = await apiClient.post("/cs/ai/content-suggestions", data);
      return response.data;
    },
  });
}

// ============================================
// Dismiss Recommendation Mutation
// ============================================

export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      recommendationId: string,
    ): Promise<{ success: boolean }> => {
      const response = await apiClient.post(
        `/cs/ai/recommendations/${recommendationId}/dismiss`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiInsightsKeys.recommendations(),
      });
    },
  });
}

// ============================================
// Apply Recommendation Mutation
// ============================================

export function useApplyRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      recommendationId: string,
    ): Promise<{ success: boolean; result?: string }> => {
      const response = await apiClient.post(
        `/cs/ai/recommendations/${recommendationId}/apply`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiInsightsKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: aiInsightsKeys.portfolioInsights(),
      });
    },
  });
}

// ============================================
// Refresh Insights Mutation
// ============================================

export function useRefreshInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      const response = await apiClient.post("/cs/ai/refresh-insights");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiInsightsKeys.all });
    },
  });
}
