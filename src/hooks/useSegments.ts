/**
 * Segment Builder Hooks
 *
 * TanStack Query hooks for the visual segment builder.
 * Provides segment CRUD operations, preview, AI parsing, and suggestions.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { apiClient } from "@/api/client.ts";
import type {
  Segment,
  SegmentListResponse,
  SegmentFilters,
  SegmentFormData,
  SegmentRuleSet,
} from "@/api/types/customerSuccess.ts";
import {
  mockSegments,
  getMockSegmentById,
  getMockSegmentMembers,
  getMockSegmentInsights,
  filterMockSegmentsByType,
  searchMockSegments,
} from "@/features/customer-success/segments/mockData.ts";

// ============================================
// Query Keys
// ============================================

export const segmentBuilderKeys = {
  all: ["segments"] as const,
  lists: () => [...segmentBuilderKeys.all, "list"] as const,
  list: (filters: SegmentFilters) =>
    [...segmentBuilderKeys.lists(), filters] as const,
  details: () => [...segmentBuilderKeys.all, "detail"] as const,
  detail: (id: number) => [...segmentBuilderKeys.details(), id] as const,
  members: (id: number) => [...segmentBuilderKeys.all, "members", id] as const,
  preview: () => [...segmentBuilderKeys.all, "preview"] as const,
  suggestions: () => [...segmentBuilderKeys.all, "suggestions"] as const,
  smartSegments: () => [...segmentBuilderKeys.all, "smart"] as const,
};

// ============================================
// Segment List Hooks
// ============================================

/**
 * Fetch all segments with optional filters
 * Falls back to mock data when API is unavailable
 */
export function useSegmentsList(filters: SegmentFilters = {}) {
  return useQuery({
    queryKey: segmentBuilderKeys.list(filters),
    queryFn: async (): Promise<SegmentListResponse> => {
      try {
        const params = new URLSearchParams();
        if (filters.page) params.set("page", String(filters.page));
        if (filters.page_size)
          params.set("page_size", String(filters.page_size));
        if (filters.segment_type)
          params.set("segment_type", filters.segment_type);
        if (filters.is_active !== undefined)
          params.set("is_active", String(filters.is_active));
        if (filters.search) params.set("search", filters.search);

        const { data } = await apiClient.get(`/cs/segments/?${params}`);
        return data;
      } catch {
        // Fallback to mock data when API is unavailable
        let filteredSegments = mockSegments;

        // Apply type filter
        if (filters.segment_type) {
          filteredSegments = filterMockSegmentsByType(
            filters.segment_type as "static" | "dynamic" | "ai_generated",
          );
        }

        // Apply search filter
        if (filters.search) {
          filteredSegments = searchMockSegments(filters.search);
        }

        // Apply active filter
        if (filters.is_active !== undefined) {
          filteredSegments = filteredSegments.filter(
            (s) => s.is_active === filters.is_active,
          );
        }

        // Pagination
        const page = filters.page || 1;
        const pageSize = filters.page_size || 20;
        const start = (page - 1) * pageSize;
        const paginatedSegments = filteredSegments.slice(
          start,
          start + pageSize,
        );

        return {
          items: paginatedSegments,
          total: filteredSegments.length,
          page,
          page_size: pageSize,
        };
      }
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch a single segment by ID
 * Falls back to mock data when API is unavailable
 */
export function useSegmentDetail(id: number | undefined) {
  return useQuery({
    queryKey: segmentBuilderKeys.detail(id!),
    queryFn: async (): Promise<Segment> => {
      try {
        const { data } = await apiClient.get(`/cs/segments/${id}`);
        return data;
      } catch {
        // Fallback to mock data
        const mockSegment = getMockSegmentById(id!);
        if (mockSegment) {
          return mockSegment;
        }
        throw new Error(`Segment with id ${id} not found`);
      }
    },
    enabled: !!id,
  });
}

// ============================================
// Segment Members Hooks
// ============================================

export interface SegmentMember {
  id: number;
  customer_id: number;
  customer_name: string;
  email: string;
  health_score: number | null;
  health_status: string | null;
  arr: number | null;
  joined_segment_at: string | null;
  churn_risk: number | null;
}

export interface SegmentMembersResponse {
  items: SegmentMember[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Fetch segment members with pagination
 * Falls back to mock data when API is unavailable
 */
export function useSegmentMembers(
  segmentId: number | undefined,
  options: { page?: number; page_size?: number; search?: string } = {},
) {
  return useQuery({
    queryKey: [...segmentBuilderKeys.members(segmentId!), options],
    queryFn: async (): Promise<SegmentMembersResponse> => {
      const params = new URLSearchParams();
      if (options.page) params.set("page", String(options.page));
      if (options.page_size) params.set("page_size", String(options.page_size));
      if (options.search) params.set("search", options.search);

      try {
        const { data } = await apiClient.get(
          `/cs/segments/${segmentId}/customers?${params}`,
        );
        return data;
      } catch {
        // Fallback to mock data when API is unavailable
        const mockMembers = getMockSegmentMembers(segmentId!);
        let filteredMembers = mockMembers;

        // Apply search filter
        if (options.search) {
          const lowerSearch = options.search.toLowerCase();
          filteredMembers = mockMembers.filter(
            (m) =>
              m.customer_name.toLowerCase().includes(lowerSearch) ||
              m.email.toLowerCase().includes(lowerSearch),
          );
        }

        // Pagination
        const page = options.page || 1;
        const pageSize = options.page_size || 20;
        const start = (page - 1) * pageSize;
        const paginatedMembers = filteredMembers.slice(start, start + pageSize);

        return {
          items: paginatedMembers.map((m) => ({
            id: m.id,
            customer_id: m.customer_id,
            customer_name: m.customer_name,
            email: m.email,
            health_score: m.health_score,
            health_status: m.health_status,
            arr: m.arr,
            joined_segment_at: m.entered_at,
            churn_risk:
              m.health_status === "critical"
                ? 0.8
                : m.health_status === "at_risk"
                  ? 0.4
                  : 0.1,
          })),
          total: filteredMembers.length,
          page,
          page_size: pageSize,
        };
      }
    },
    enabled: !!segmentId,
  });
}

// ============================================
// Segment CRUD Hooks
// ============================================

/**
 * Create a new segment
 */
export function useCreateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SegmentFormData): Promise<Segment> => {
      const response = await apiClient.post("/cs/segments/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentBuilderKeys.all });
    },
  });
}

/**
 * Update an existing segment
 */
export function useUpdateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<SegmentFormData>;
    }): Promise<Segment> => {
      const response = await apiClient.patch(`/cs/segments/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: segmentBuilderKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: segmentBuilderKeys.lists() });
    },
  });
}

/**
 * Delete a segment
 */
export function useDeleteSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/cs/segments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentBuilderKeys.all });
    },
  });
}

/**
 * Duplicate a segment
 */
export function useDuplicateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segment: Segment): Promise<Segment> => {
      const duplicateData: SegmentFormData = {
        name: `${segment.name} (Copy)`,
        description: segment.description || undefined,
        segment_type: segment.segment_type,
        rules: segment.rules as SegmentRuleSet | undefined,
        priority: segment.priority,
        is_active: false, // Start as inactive
        color: segment.color || undefined,
        icon: segment.icon || undefined,
        tags: segment.tags || undefined,
      };
      const response = await apiClient.post("/cs/segments/", duplicateData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentBuilderKeys.all });
    },
  });
}

// ============================================
// Segment Preview Hook
// ============================================

export interface SegmentPreviewResult {
  count: number;
  sample_customers: Array<{
    id: number;
    name: string;
    email: string;
    health_score: number | null;
  }>;
  total_arr: number | null;
  avg_health_score: number | null;
}

/**
 * Preview segment count based on rules (without saving)
 */
export function useSegmentPreview() {
  const [previewResult, setPreviewResult] =
    useState<SegmentPreviewResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (
      rules: SegmentRuleSet,
    ): Promise<SegmentPreviewResult> => {
      const { data } = await apiClient.post("/cs/segments/preview", {
        rules,
      });
      return data;
    },
    onSuccess: (data) => {
      setPreviewResult(data);
    },
  });

  return {
    preview: mutation.mutate,
    previewAsync: mutation.mutateAsync,
    previewResult,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: () => setPreviewResult(null),
  };
}

// ============================================
// AI Natural Language Parsing Hook
// ============================================

export interface ParsedSegmentQuery {
  rules: SegmentRuleSet;
  suggested_name: string;
  confidence: number;
  explanation: string;
}

/**
 * Parse natural language query into segment rules
 */
export function useParseNaturalLanguage() {
  return useMutation({
    mutationFn: async (query: string): Promise<ParsedSegmentQuery> => {
      try {
        const { data } = await apiClient.post("/cs/segments/parse-query", {
          query,
        });
        return data;
      } catch {
        // Demo response for development when endpoint doesn't exist
        return generateDemoParseResult(query);
      }
    },
  });
}

/**
 * Generate demo parse result for natural language queries
 */
function generateDemoParseResult(query: string): ParsedSegmentQuery {
  const lowerQuery = query.toLowerCase();

  // High-value customers
  if (
    lowerQuery.includes("high value") ||
    lowerQuery.includes("high arr") ||
    lowerQuery.includes("enterprise")
  ) {
    return {
      rules: {
        logic: "and",
        rules: [
          { field: "arr", operator: "gte", value: 50000 },
          { field: "health_status", operator: "eq", value: "healthy" },
        ],
      },
      suggested_name: "High-Value Customers",
      confidence: 0.92,
      explanation: "Customers with ARR >= $50,000 who are in healthy status",
    };
  }

  // At-risk customers
  if (
    lowerQuery.includes("at risk") ||
    lowerQuery.includes("churn") ||
    lowerQuery.includes("declining")
  ) {
    return {
      rules: {
        logic: "or",
        rules: [
          { field: "health_status", operator: "eq", value: "at_risk" },
          { field: "health_status", operator: "eq", value: "critical" },
          { field: "churn_probability", operator: "gte", value: 0.5 },
        ],
      },
      suggested_name: "At-Risk Customers",
      confidence: 0.89,
      explanation:
        "Customers with at_risk or critical health status, or churn probability >= 50%",
    };
  }

  // New customers / recent signups
  if (
    lowerQuery.includes("new") ||
    lowerQuery.includes("recent") ||
    lowerQuery.includes("onboarding")
  ) {
    return {
      rules: {
        logic: "and",
        rules: [
          {
            field: "created_at",
            operator: "gte",
            value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        ],
      },
      suggested_name: "New Customers (Last 90 Days)",
      confidence: 0.85,
      explanation: "Customers who signed up in the last 90 days",
    };
  }

  // Renewal coming up
  if (
    lowerQuery.includes("renewal") ||
    lowerQuery.includes("expiring") ||
    lowerQuery.includes("renew")
  ) {
    return {
      rules: {
        logic: "and",
        rules: [
          {
            field: "renewal_date",
            operator: "between",
            value: new Date().toISOString().split("T")[0],
            value2: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        ],
      },
      suggested_name: "Upcoming Renewals",
      confidence: 0.91,
      explanation: "Customers with renewals in the next 90 days",
    };
  }

  // Default fallback
  return {
    rules: {
      logic: "and",
      rules: [{ field: "is_active", operator: "eq", value: true }],
    },
    suggested_name: "Custom Segment",
    confidence: 0.65,
    explanation: "Active customers - please refine the segment rules as needed",
  };
}

// ============================================
// AI Suggestions Hook
// ============================================

export interface SegmentSuggestion {
  id: string;
  name: string;
  description: string;
  rules: SegmentRuleSet;
  estimated_count: number;
  insight: string;
  priority: "high" | "medium" | "low";
  category: "retention" | "growth" | "engagement" | "risk";
}

/**
 * Get AI-powered segment suggestions
 */
export function useSegmentSuggestions() {
  return useQuery({
    queryKey: segmentBuilderKeys.suggestions(),
    queryFn: async (): Promise<SegmentSuggestion[]> => {
      try {
        const { data } = await apiClient.get("/cs/segments/suggestions");
        return data;
      } catch {
        // Return demo suggestions when endpoint doesn't exist
        return getDemoSuggestions();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Demo suggestions for development
 */
function getDemoSuggestions(): SegmentSuggestion[] {
  return [
    {
      id: "suggestion-1",
      name: "Power Users at Risk",
      description: "High-engagement users showing declining health scores",
      rules: {
        logic: "and",
        rules: [
          { field: "engagement_score", operator: "gte", value: 80 },
          { field: "score_trend", operator: "eq", value: "declining" },
        ],
      },
      estimated_count: 23,
      insight:
        "These power users have dropped 15% in health score over the last 30 days. Proactive outreach could prevent churn.",
      priority: "high",
      category: "risk",
    },
    {
      id: "suggestion-2",
      name: "Expansion Ready",
      description:
        "Healthy customers with high product adoption ready for upsell",
      rules: {
        logic: "and",
        rules: [
          { field: "health_score", operator: "gte", value: 85 },
          { field: "product_adoption_score", operator: "gte", value: 90 },
          { field: "arr", operator: "lt", value: 100000 },
        ],
      },
      estimated_count: 47,
      insight:
        "These customers are fully utilizing the current tier. Consider expansion conversations.",
      priority: "high",
      category: "growth",
    },
    {
      id: "suggestion-3",
      name: "Onboarding Stalled",
      description: "New customers who haven't completed onboarding milestones",
      rules: {
        logic: "and",
        rules: [
          {
            field: "created_at",
            operator: "gte",
            value: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
          { field: "onboarding_complete", operator: "eq", value: false },
        ],
      },
      estimated_count: 12,
      insight:
        "These customers signed up 2+ weeks ago but haven't completed onboarding. Reach out to offer assistance.",
      priority: "medium",
      category: "engagement",
    },
    {
      id: "suggestion-4",
      name: "Champions Without Executive Sponsor",
      description: "Key accounts without executive-level engagement",
      rules: {
        logic: "and",
        rules: [
          { field: "arr", operator: "gte", value: 100000 },
          { field: "has_executive_sponsor", operator: "eq", value: false },
        ],
      },
      estimated_count: 8,
      insight:
        "High-value accounts without executive engagement are at higher risk. Schedule executive business reviews.",
      priority: "medium",
      category: "retention",
    },
    {
      id: "suggestion-5",
      name: "Re-engagement Candidates",
      description: "Previously active customers with declining engagement",
      rules: {
        logic: "and",
        rules: [
          { field: "last_login_days", operator: "gte", value: 30 },
          { field: "previous_engagement", operator: "eq", value: "high" },
        ],
      },
      estimated_count: 34,
      insight:
        "These customers were highly engaged but haven't logged in for 30+ days. Win-back campaign recommended.",
      priority: "medium",
      category: "engagement",
    },
  ];
}

// ============================================
// Smart Segments Hook (Pre-built Segments)
// ============================================

export interface SmartSegment {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rules: SegmentRuleSet;
  estimated_count?: number;
}

/**
 * Get pre-built smart segments
 */
export function useSmartSegments() {
  return useQuery({
    queryKey: segmentBuilderKeys.smartSegments(),
    queryFn: async (): Promise<SmartSegment[]> => {
      try {
        const { data } = await apiClient.get("/cs/segments/smart");
        return data;
      } catch {
        // Return demo smart segments when endpoint doesn't exist
        return getSmartSegments();
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Pre-built smart segments
 */
function getSmartSegments(): SmartSegment[] {
  return [
    // Health-based segments
    {
      id: "smart-healthy",
      name: "Healthy Customers",
      description: "All customers with healthy status",
      category: "Health",
      icon: "check-circle",
      rules: {
        logic: "and",
        rules: [{ field: "health_status", operator: "eq", value: "healthy" }],
      },
    },
    {
      id: "smart-at-risk",
      name: "At-Risk Customers",
      description: "Customers requiring attention",
      category: "Health",
      icon: "alert-triangle",
      rules: {
        logic: "and",
        rules: [{ field: "health_status", operator: "eq", value: "at_risk" }],
      },
    },
    {
      id: "smart-critical",
      name: "Critical Customers",
      description: "Customers needing immediate intervention",
      category: "Health",
      icon: "x-circle",
      rules: {
        logic: "and",
        rules: [{ field: "health_status", operator: "eq", value: "critical" }],
      },
    },

    // Lifecycle segments
    {
      id: "smart-new-customers",
      name: "New Customers (30 days)",
      description: "Recently onboarded customers",
      category: "Lifecycle",
      icon: "user-plus",
      rules: {
        logic: "and",
        rules: [
          {
            field: "created_at",
            operator: "gte",
            value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        ],
      },
    },
    {
      id: "smart-renewal-30",
      name: "Renewals in 30 Days",
      description: "Upcoming contract renewals",
      category: "Lifecycle",
      icon: "refresh-cw",
      rules: {
        logic: "and",
        rules: [
          {
            field: "renewal_date",
            operator: "between",
            value: new Date().toISOString().split("T")[0],
            value2: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        ],
      },
    },
    {
      id: "smart-renewal-90",
      name: "Renewals in 90 Days",
      description: "Renewals coming up",
      category: "Lifecycle",
      icon: "calendar",
      rules: {
        logic: "and",
        rules: [
          {
            field: "renewal_date",
            operator: "between",
            value: new Date().toISOString().split("T")[0],
            value2: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        ],
      },
    },

    // Value segments
    {
      id: "smart-enterprise",
      name: "Enterprise (>$100K ARR)",
      description: "Largest accounts by revenue",
      category: "Value",
      icon: "building",
      rules: {
        logic: "and",
        rules: [{ field: "arr", operator: "gte", value: 100000 }],
      },
    },
    {
      id: "smart-mid-market",
      name: "Mid-Market ($25K-$100K)",
      description: "Mid-tier accounts",
      category: "Value",
      icon: "briefcase",
      rules: {
        logic: "and",
        rules: [
          { field: "arr", operator: "gte", value: 25000 },
          { field: "arr", operator: "lt", value: 100000 },
        ],
      },
    },
    {
      id: "smart-smb",
      name: "SMB (<$25K ARR)",
      description: "Small business accounts",
      category: "Value",
      icon: "store",
      rules: {
        logic: "and",
        rules: [{ field: "arr", operator: "lt", value: 25000 }],
      },
    },

    // Engagement segments
    {
      id: "smart-high-engagement",
      name: "Highly Engaged",
      description: "Top engaged customers",
      category: "Engagement",
      icon: "zap",
      rules: {
        logic: "and",
        rules: [{ field: "engagement_score", operator: "gte", value: 80 }],
      },
    },
    {
      id: "smart-low-engagement",
      name: "Low Engagement",
      description: "Customers needing re-engagement",
      category: "Engagement",
      icon: "trending-down",
      rules: {
        logic: "and",
        rules: [{ field: "engagement_score", operator: "lt", value: 40 }],
      },
    },
    {
      id: "smart-declining",
      name: "Declining Trend",
      description: "Customers with declining health",
      category: "Engagement",
      icon: "arrow-down",
      rules: {
        logic: "and",
        rules: [{ field: "score_trend", operator: "eq", value: "declining" }],
      },
    },
  ];
}

// ============================================
// Segment Analytics Hook
// ============================================

export interface SegmentAnalytics {
  size_over_time: Array<{ date: string; count: number }>;
  health_distribution: Record<string, number>;
  arr_distribution: { total: number; average: number; median: number };
  churn_risk: { high: number; medium: number; low: number };
  top_industries: Array<{ name: string; count: number }>;
  engagement_trend: Array<{ date: string; score: number }>;
}

export function useSegmentAnalytics(segmentId: number | undefined) {
  return useQuery({
    queryKey: [...segmentBuilderKeys.detail(segmentId!), "analytics"],
    queryFn: async (): Promise<SegmentAnalytics> => {
      try {
        const { data } = await apiClient.get(
          `/cs/segments/${segmentId}/analytics`,
        );
        return data;
      } catch {
        // Return demo analytics when endpoint doesn't exist
        return {
          size_over_time: [
            { date: "2025-11-01", count: 45 },
            { date: "2025-11-15", count: 48 },
            { date: "2025-12-01", count: 52 },
            { date: "2025-12-15", count: 55 },
            { date: "2026-01-01", count: 58 },
          ],
          health_distribution: {
            healthy: 35,
            at_risk: 15,
            critical: 5,
            churned: 3,
          },
          arr_distribution: { total: 2450000, average: 42241, median: 35000 },
          churn_risk: { high: 8, medium: 15, low: 35 },
          top_industries: [
            { name: "Technology", count: 18 },
            { name: "Healthcare", count: 12 },
            { name: "Finance", count: 10 },
            { name: "Retail", count: 8 },
            { name: "Manufacturing", count: 6 },
          ],
          engagement_trend: [
            { date: "2025-11-01", score: 72 },
            { date: "2025-11-15", score: 74 },
            { date: "2025-12-01", score: 75 },
            { date: "2025-12-15", score: 73 },
            { date: "2026-01-01", score: 76 },
          ],
        };
      }
    },
    enabled: !!segmentId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Segment AI Insights Hook
// ============================================

export interface SegmentAIInsight {
  segment_id: number;
  generated_at: string;
  confidence: number;
  insights: {
    key_finding: string;
    risk_assessment?: string;
    opportunity?: string;
    recommended_action: string;
    action_priority: "low" | "medium" | "high" | "critical";
  };
  trends: {
    size_trend: "growing" | "stable" | "shrinking";
    size_change_30d: number;
    health_trend: "improving" | "stable" | "declining";
    health_change_30d: number;
  };
  predicted_churn: number;
  expansion_potential: number;
}

/**
 * Fetch AI insights for a segment
 * Falls back to mock data when API is unavailable
 */
export function useSegmentAIInsights(segmentId: number | undefined) {
  return useQuery({
    queryKey: [...segmentBuilderKeys.detail(segmentId!), "ai-insights"],
    queryFn: async (): Promise<SegmentAIInsight | null> => {
      try {
        const { data } = await apiClient.get(
          `/cs/segments/${segmentId}/ai-insights`,
        );
        return data;
      } catch {
        // Fallback to mock AI insights
        const mockInsight = getMockSegmentInsights(segmentId!);
        return mockInsight || null;
      }
    },
    enabled: !!segmentId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Segment Rule State Hook
// ============================================

/**
 * Hook for managing segment rule state with undo/redo
 */
export function useSegmentRuleState(initialRules?: SegmentRuleSet) {
  const [rules, setRules] = useState<SegmentRuleSet>(
    initialRules || { logic: "and", rules: [] },
  );
  const [history, setHistory] = useState<SegmentRuleSet[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const updateRules = useCallback(
    (newRules: SegmentRuleSet) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), rules]);
      setHistoryIndex((prev) => prev + 1);
      setRules(newRules);
    },
    [rules, historyIndex],
  );

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      setRules(history[historyIndex]);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setRules(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const reset = useCallback(() => {
    setRules(initialRules || { logic: "and", rules: [] });
    setHistory([]);
    setHistoryIndex(-1);
  }, [initialRules]);

  return {
    rules,
    setRules: updateRules,
    undo,
    redo,
    reset,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
  };
}
