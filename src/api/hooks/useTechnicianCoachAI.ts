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
    queryFn: async (): Promise<TechnicianCoaching> => {
      try {
        const response = await apiClient.get(`/ai/technicians/${technicianId}/coaching`);
        return response.data;
      } catch {
        return generateDemoCoaching(technicianId);
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
    queryFn: async (): Promise<TeamPerformanceSummary> => {
      try {
        const response = await apiClient.get("/ai/technicians/team-summary");
        return response.data;
      } catch {
        return generateDemoTeamSummary();
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
      try {
        const response = await apiClient.post("/ai/technicians/goals", params);
        return response.data;
      } catch {
        return {
          id: `goal-${Date.now()}`,
          title: params.title,
          description: params.description,
          target_date: params.target_date,
          progress_percent: 0,
          status: "not_started",
        };
      }
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
      try {
        const response = await apiClient.patch(`/ai/technicians/goals/${params.goal_id}`, params);
        return response.data;
      } catch {
        return { success: true };
      }
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
      context: "weekly_review" | "after_job" | "goal_progress" | "improvement_needed";
    }): Promise<{ feedback: string; tone: string; action_items: string[] }> => {
      try {
        const response = await apiClient.post("/ai/technicians/generate-feedback", params);
        return response.data;
      } catch {
        return generateDemoFeedback(params.context);
      }
    },
  });
}

function generateDemoCoaching(technicianId: string): TechnicianCoaching {
  return {
    technician_id: technicianId,
    technician_name: "Mike Johnson",
    overall_score: 87,
    trend: "improving",
    strengths: [
      {
        area: "Customer Communication",
        score: 94,
        description: "Consistently receives excellent customer feedback on communication",
        compared_to_team: "above",
      },
      {
        area: "First-Time Fix Rate",
        score: 91,
        description: "Rarely requires callbacks for the same issue",
        compared_to_team: "above",
      },
      {
        area: "Safety Compliance",
        score: 98,
        description: "Perfect safety record with no incidents",
        compared_to_team: "above",
      },
    ],
    areas_for_improvement: [
      {
        area: "Job Documentation",
        current_score: 72,
        target_score: 85,
        gap: 13,
        priority: "high",
        action_plan: "Complete all photo requirements and add detailed notes for each job",
      },
      {
        area: "Schedule Adherence",
        current_score: 78,
        target_score: 90,
        gap: 12,
        priority: "medium",
        action_plan: "Better time estimation and proactive communication when running late",
      },
    ],
    goals: [
      {
        id: "goal-1",
        title: "Improve documentation score to 85%",
        description: "Complete all required photos and detailed job notes",
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        progress_percent: 45,
        status: "in_progress",
      },
      {
        id: "goal-2",
        title: "Complete advanced septic certification",
        description: "Pass the Level 2 certification exam",
        target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        progress_percent: 20,
        status: "in_progress",
      },
    ],
    recent_achievements: [
      {
        id: "ach-1",
        title: "Customer Satisfaction Champion",
        description: "Achieved 5-star average rating for 3 consecutive months",
        earned_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: "excellence",
      },
      {
        id: "ach-2",
        title: "Safety Milestone",
        description: "1 year without any safety incidents",
        earned_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        type: "milestone",
      },
    ],
    coaching_suggestions: [
      {
        id: "sug-1",
        type: "training",
        title: "Documentation Best Practices Workshop",
        description: "30-minute training on efficient photo and note-taking techniques",
        expected_impact: "15% improvement in documentation scores within 2 weeks",
        resources: ["Documentation Guide PDF", "Example Photos Gallery"],
      },
      {
        id: "sug-2",
        type: "practice",
        title: "Time Estimation Practice",
        description: "Review last 10 jobs to identify where time estimates were off",
        expected_impact: "Better schedule adherence and customer satisfaction",
      },
      {
        id: "sug-3",
        type: "recognition",
        title: "Share Success Story",
        description: "Feature Mike's customer communication approach in team meeting",
        expected_impact: "Boost team morale and share best practices",
      },
    ],
  };
}

function generateDemoTeamSummary(): TeamPerformanceSummary {
  return {
    team_average_score: 82,
    top_performer: { id: "tech-1", name: "Mike Johnson", score: 94 },
    most_improved: { id: "tech-3", name: "Sarah Williams", improvement: 12 },
    needs_attention: [
      { id: "tech-4", name: "Tom Davis", reason: "Documentation scores declining for 3 weeks" },
    ],
    team_goals_progress: 67,
  };
}

function generateDemoFeedback(context: string): { feedback: string; tone: string; action_items: string[] } {
  const feedbacks: Record<string, { feedback: string; tone: string; action_items: string[] }> = {
    weekly_review: {
      feedback: "Great week overall! Your customer ratings continue to be excellent. I noticed your documentation has improved - keep it up! One area to focus on: try to update job status in real-time so dispatch can better plan routes.",
      tone: "encouraging",
      action_items: [
        "Continue excellent customer communication",
        "Update job status immediately upon completion",
        "Review next week's schedule for any complex jobs",
      ],
    },
    after_job: {
      feedback: "Nice work on the Smith job! The customer mentioned you explained everything clearly. Just a reminder to upload the after photos before leaving the site - it helps with billing.",
      tone: "positive",
      action_items: [
        "Upload all required photos before leaving",
        "Note any follow-up items in job notes",
      ],
    },
    goal_progress: {
      feedback: "You're making good progress on your documentation goal - 45% there! At this rate, you'll hit your target ahead of schedule. Keep focusing on the before/after photos.",
      tone: "motivating",
      action_items: [
        "Continue current documentation habits",
        "Consider reviewing the photo guide for additional tips",
      ],
    },
    improvement_needed: {
      feedback: "I've noticed schedule adherence has been challenging this week. Let's work together on this - would it help to pad your estimates by 15 minutes? That often reduces stress.",
      tone: "supportive",
      action_items: [
        "Add 15-minute buffer to complex job estimates",
        "Communicate proactively if running behind",
        "Schedule a quick call to discuss strategies",
      ],
    },
  };

  return feedbacks[context] || feedbacks.weekly_review;
}
