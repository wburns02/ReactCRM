import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Technician performance coaching insights
 */
export interface TechnicianCoaching {
  technician_id: string;
  technician_name: string;
  overall_score: number;
  trend: "improving" | "declining" | "stable";
  strengths: PerformanceStrength[];
  areas_for_improvement: ImprovementArea[];
  goals: CoachingGoal[];
  recent_achievements: Achievement[];
  coaching_suggestions: CoachingSuggestion[];
}

export interface PerformanceStrength {
  area: string;
  score: number;
  description: string;
  compared_to_team: "above" | "at" | "below";
}

export interface ImprovementArea {
  area: string;
  current_score: number;
  target_score: number;
  gap: number;
  priority: "high" | "medium" | "low";
  action_plan: string;
}

export interface CoachingGoal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  progress_percent: number;
  status: "not_started" | "in_progress" | "completed";
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned_date: string;
  type: "milestone" | "improvement" | "excellence";
}

export interface CoachingSuggestion {
  id: string;
  type: "training" | "practice" | "feedback" | "recognition";
  title: string;
  description: string;
  expected_impact: string;
  resources?: string[];
}

/**
 * Team performance summary
 */
export interface TeamPerformanceSummary {
  team_average_score: number;
  top_performer: { id: string; name: string; score: number };
  most_improved: { id: string; name: string; improvement: number };
  needs_attention: { id: string; name: string; reason: string }[];
  team_goals_progress: number;
}

/**
 * Get coaching insights for a specific technician
 */
export function useTechnicianCoaching(technicianId: string) {
  return useQuery({
    queryKey: ["technician-coaching", technicianId],
    queryFn: async (): Promise<TechnicianCoaching | null> => {
      try {
        const response = await apiClient.get(
          `/ai/technicians/${technicianId}/coaching`,
        );
        return response.data;
      } catch {
        // Return null when API is not available - no fake data
        return null;
      }
    },
    enabled: !!technicianId,
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Get team performance summary
 */
export function useTeamPerformanceSummary() {
  return useQuery({
    queryKey: ["team-performance-summary"],
    queryFn: async (): Promise<TeamPerformanceSummary | null> => {
      try {
        const response = await apiClient.get("/ai/technicians/team-summary");
        return response.data;
      } catch {
        // Return null when API is not available - no fake data
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Create a coaching goal for a technician
 */
export function useCreateCoachingGoal() {
  return useMutation({
    mutationFn: async (params: {
      technician_id: string;
      title: string;
      description: string;
      target_date: string;
    }): Promise<CoachingGoal> => {
      const response = await apiClient.post("/ai/technicians/goals", params);
      return response.data;
    },
  });
}

/**
 * Update goal progress
 */
export function useUpdateGoalProgress() {
  return useMutation({
    mutationFn: async (params: {
      goal_id: string;
      progress_percent: number;
    }): Promise<{ success: boolean }> => {
      const response = await apiClient.patch(
        `/ai/technicians/goals/${params.goal_id}`,
        params,
      );
      return response.data;
    },
  });
}

/**
 * Generate AI-powered coaching feedback
 */
export function useGenerateCoachingFeedback() {
  return useMutation({
    mutationFn: async (params: {
      technician_id: string;
      context:
        | "weekly_review"
        | "after_job"
        | "goal_progress"
        | "improvement_needed";
    }): Promise<{
      feedback: string;
      tone: string;
      action_items: string[];
    } | null> => {
      try {
        const response = await apiClient.post(
          "/ai/technicians/generate-feedback",
          params,
        );
        return response.data;
      } catch {
        // Return null when API is not available - no fake data
        return null;
      }
    },
  });
}

// ---------------------------------------------------------------------------
// New /coaching/* endpoints — real DB-driven data
// ---------------------------------------------------------------------------

/**
 * Shape of a technician entry from /coaching/technician-performance
 */
export interface CoachingTechnicianStat {
  id: string | null;
  name: string;
  total_jobs: number;
  completed_jobs: number;
  completion_rate: number;
  avg_jobs_per_week: number;
  top_job_type: string;
  needs_coaching: boolean;
}

/**
 * Response from /coaching/technician-performance
 */
export interface TechnicianPerformanceResponse {
  technicians: CoachingTechnicianStat[];
  team_avg_completion_rate: number;
  period_days: number;
}

/**
 * Response from /coaching/call-insights
 */
export interface CallInsightsResponse {
  total_calls: number;
  avg_duration_minutes: number;
  by_outcome: Record<string, number>;
  conversion_rate: number;
  top_agents: { name: string; calls: number; conversion_rate: number }[];
  coaching_flags: { agent: string; issue: string; rate: number }[];
  message?: string;
}

/**
 * A single coaching recommendation
 */
export interface CoachingRecommendation {
  type: "technician" | "call_agent";
  target: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  action: string;
}

/**
 * Response from /coaching/recommendations
 */
export interface RecommendationsResponse {
  recommendations: CoachingRecommendation[];
}

/**
 * Response from /coaching/team-benchmarks
 */
export interface TeamBenchmarksResponse {
  period_days: number;
  total_work_orders: number;
  completed: number;
  team_completion_rate: number;
  top_performer: { name: string; completion_rate: number };
  most_active: { name: string; total_jobs: number };
}

/**
 * GET /coaching/technician-performance
 * Per-technician WO stats over the last 90 days.
 */
export function useCoachingTechnicianPerformance() {
  return useQuery({
    queryKey: ["coaching", "technician-performance"],
    queryFn: async (): Promise<TechnicianPerformanceResponse> => {
      const response = await apiClient.get("/coaching/technician-performance");
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * GET /coaching/call-insights
 * Call log aggregation — returns graceful empty state if no data.
 */
export function useCoachingCallInsights() {
  return useQuery({
    queryKey: ["coaching", "call-insights"],
    queryFn: async (): Promise<CallInsightsResponse> => {
      const response = await apiClient.get("/coaching/call-insights");
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * GET /coaching/recommendations
 * Rule-based coaching flags derived from real DB data.
 */
export function useCoachingRecommendations() {
  return useQuery({
    queryKey: ["coaching", "recommendations"],
    queryFn: async (): Promise<RecommendationsResponse> => {
      const response = await apiClient.get("/coaching/recommendations");
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * GET /coaching/team-benchmarks
 * Team-wide summary stats for the last 90 days.
 */
export function useCoachingTeamBenchmarks() {
  return useQuery({
    queryKey: ["coaching", "team-benchmarks"],
    queryFn: async (): Promise<TeamBenchmarksResponse> => {
      const response = await apiClient.get("/coaching/team-benchmarks");
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
