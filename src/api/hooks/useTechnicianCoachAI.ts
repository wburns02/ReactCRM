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

// Note: Demo/fake data generators have been removed.
// The AI coaching API endpoints are not yet implemented.
// When they are, real data will be returned from the API.
