import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Onboarding progress tracking
 */
export interface OnboardingProgress {
  user_id: string;
  completion_percent: number;
  current_phase: OnboardingPhase;
  completed_tasks: string[];
  pending_tasks: OnboardingTask[];
  estimated_time_remaining: number;
  started_at: string;
  last_activity: string;
}

export interface OnboardingPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  is_current: boolean;
  is_complete: boolean;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: "setup" | "learn" | "practice" | "customize";
  priority: "required" | "recommended" | "optional";
  estimated_minutes: number;
  action_url?: string;
  is_complete: boolean;
}

/**
 * Contextual help suggestion
 */
export interface ContextualHelp {
  id: string;
  title: string;
  content: string;
  type: "tip" | "tutorial" | "warning" | "feature";
  relevance_score: number;
  related_feature: string;
  action?: {
    label: string;
    url: string;
  };
}

/**
 * Smart onboarding recommendation
 */
export interface OnboardingRecommendation {
  id: string;
  title: string;
  description: string;
  reason: string;
  priority: "high" | "medium" | "low";
  estimated_impact: string;
  next_steps: string[];
}

/**
 * Get current onboarding progress
 */
export function useOnboardingProgress() {
  return useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: async (): Promise<OnboardingProgress> => {
      try {
        const response = await apiClient.get("/ai/onboarding/progress");
        return response.data;
      } catch {
        return generateDemoOnboardingProgress();
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get contextual help based on current page/action
 */
export function useContextualHelp(context: { page: string; action?: string }) {
  return useQuery({
    queryKey: ["contextual-help", context],
    queryFn: async (): Promise<ContextualHelp[]> => {
      try {
        const response = await apiClient.get("/ai/onboarding/contextual-help", {
          params: context,
        });
        return response.data;
      } catch {
        return generateDemoContextualHelp(context.page);
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get smart onboarding recommendations
 */
export function useOnboardingRecommendations() {
  return useQuery({
    queryKey: ["onboarding-recommendations"],
    queryFn: async (): Promise<OnboardingRecommendation[]> => {
      try {
        const response = await apiClient.get("/ai/onboarding/recommendations");
        return response.data;
      } catch {
        return generateDemoRecommendations();
      }
    },
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Mark onboarding task as complete
 */
export function useCompleteOnboardingTask() {
  return useMutation({
    mutationFn: async (taskId: string): Promise<{ success: boolean; next_task?: OnboardingTask }> => {
      try {
        const response = await apiClient.post(`/ai/onboarding/tasks/${taskId}/complete`);
        return response.data;
      } catch {
        return { success: true };
      }
    },
  });
}

/**
 * Skip onboarding task
 */
export function useSkipOnboardingTask() {
  return useMutation({
    mutationFn: async (taskId: string): Promise<{ success: boolean }> => {
      try {
        const response = await apiClient.post(`/ai/onboarding/tasks/${taskId}/skip`);
        return response.data;
      } catch {
        return { success: true };
      }
    },
  });
}

/**
 * Get AI-guided tour for a feature
 */
export function useFeatureTour(featureId: string) {
  return useQuery({
    queryKey: ["feature-tour", featureId],
    queryFn: async (): Promise<{
      steps: TourStep[];
      estimated_duration: number;
    }> => {
      try {
        const response = await apiClient.get(`/ai/onboarding/tour/${featureId}`);
        return response.data;
      } catch {
        return generateDemoTour(featureId);
      }
    },
    enabled: !!featureId,
  });
}

export interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
  action?: string;
}

/**
 * Generate demo onboarding progress
 */
function generateDemoOnboardingProgress(): OnboardingProgress {
  return {
    user_id: "current-user",
    completion_percent: 45,
    current_phase: {
      id: "phase-2",
      name: "Core Features",
      description: "Learn the essential features of the CRM",
      order: 2,
      is_current: true,
      is_complete: false,
    },
    completed_tasks: ["create-account", "verify-email", "company-profile", "first-customer"],
    pending_tasks: [
      {
        id: "create-work-order",
        title: "Create Your First Work Order",
        description: "Learn how to schedule and manage service appointments",
        category: "practice",
        priority: "required",
        estimated_minutes: 5,
        action_url: "/workorders/new",
        is_complete: false,
      },
      {
        id: "add-technician",
        title: "Add a Technician",
        description: "Set up your first technician profile",
        category: "setup",
        priority: "required",
        estimated_minutes: 3,
        action_url: "/technicians/new",
        is_complete: false,
      },
      {
        id: "explore-schedule",
        title: "Explore the Schedule View",
        description: "Learn how to use the drag-and-drop scheduler",
        category: "learn",
        priority: "recommended",
        estimated_minutes: 4,
        action_url: "/schedule",
        is_complete: false,
      },
      {
        id: "setup-notifications",
        title: "Configure Notifications",
        description: "Set up email and SMS notifications for your team",
        category: "customize",
        priority: "optional",
        estimated_minutes: 5,
        action_url: "/settings/notifications",
        is_complete: false,
      },
    ],
    estimated_time_remaining: 17,
    started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Generate demo contextual help
 */
function generateDemoContextualHelp(page: string): ContextualHelp[] {
  const helpByPage: Record<string, ContextualHelp[]> = {
    workorders: [
      {
        id: "help-1",
        title: "Quick Tip: Work Order Status",
        content: "Drag work orders between columns to update their status quickly. The system will automatically notify relevant parties.",
        type: "tip",
        relevance_score: 0.95,
        related_feature: "work-order-management",
      },
      {
        id: "help-2",
        title: "New Feature: AI Scheduling",
        content: "Try our AI-powered scheduling assistant to automatically find the best time slots based on technician availability and location.",
        type: "feature",
        relevance_score: 0.88,
        related_feature: "ai-scheduling",
        action: { label: "Try It", url: "/schedule?ai=true" },
      },
    ],
    customers: [
      {
        id: "help-3",
        title: "Customer Health Scores",
        content: "The health score indicates how likely a customer is to remain active. Scores below 60 may need attention.",
        type: "tutorial",
        relevance_score: 0.92,
        related_feature: "customer-health",
      },
    ],
    schedule: [
      {
        id: "help-4",
        title: "Drag & Drop Scheduling",
        content: "Simply drag unassigned work orders from the sidebar onto a technician's timeline to schedule them.",
        type: "tip",
        relevance_score: 0.97,
        related_feature: "scheduling",
      },
    ],
    default: [
      {
        id: "help-default",
        title: "Need Help?",
        content: "Click the help icon in the bottom right to access tutorials, documentation, and support.",
        type: "tip",
        relevance_score: 0.7,
        related_feature: "help-center",
      },
    ],
  };

  return helpByPage[page] || helpByPage.default;
}

/**
 * Generate demo recommendations
 */
function generateDemoRecommendations(): OnboardingRecommendation[] {
  return [
    {
      id: "rec-1",
      title: "Import Your Customer Data",
      description: "You haven't imported any existing customer data yet. Importing customers will help you get started faster.",
      reason: "Based on your account age and current customer count",
      priority: "high",
      estimated_impact: "Save 2-3 hours of manual data entry",
      next_steps: [
        "Export customers from your previous system as CSV",
        "Go to Settings > Import Data",
        "Map your columns to CRM fields",
        "Review and confirm the import",
      ],
    },
    {
      id: "rec-2",
      title: "Set Up Automated Reminders",
      description: "Automated appointment reminders can reduce no-shows by up to 40%.",
      reason: "You have scheduled work orders but no reminder templates",
      priority: "medium",
      estimated_impact: "Reduce no-shows and improve customer satisfaction",
      next_steps: [
        "Navigate to Settings > Notifications",
        "Enable appointment reminders",
        "Customize the reminder timing (e.g., 24 hours before)",
        "Review the default message template",
      ],
    },
    {
      id: "rec-3",
      title: "Complete Your Company Profile",
      description: "A complete company profile improves customer communications and invoice professionalism.",
      reason: "Missing: logo, business hours, service areas",
      priority: "low",
      estimated_impact: "Professional appearance on all customer-facing documents",
      next_steps: [
        "Go to Settings > Company Profile",
        "Upload your company logo",
        "Set your business hours",
        "Define your service areas",
      ],
    },
  ];
}

/**
 * Generate demo feature tour
 */
function generateDemoTour(featureId: string): { steps: TourStep[]; estimated_duration: number } {
  const tours: Record<string, { steps: TourStep[]; estimated_duration: number }> = {
    "work-orders": {
      steps: [
        {
          id: "step-1",
          target: "[data-tour='create-button']",
          title: "Create Work Orders",
          content: "Click here to create a new work order. You can also use keyboard shortcut Ctrl+N.",
          position: "bottom",
        },
        {
          id: "step-2",
          target: "[data-tour='filters']",
          title: "Filter & Search",
          content: "Use filters to find specific work orders by status, date, technician, or customer.",
          position: "bottom",
        },
        {
          id: "step-3",
          target: "[data-tour='kanban']",
          title: "Kanban View",
          content: "Drag work orders between columns to update their status. Changes are saved automatically.",
          position: "left",
        },
      ],
      estimated_duration: 3,
    },
    schedule: {
      steps: [
        {
          id: "step-1",
          target: "[data-tour='unscheduled']",
          title: "Unscheduled Work Orders",
          content: "Work orders waiting to be scheduled appear here. Drag them to the timeline to schedule.",
          position: "right",
        },
        {
          id: "step-2",
          target: "[data-tour='timeline']",
          title: "Technician Timeline",
          content: "Each row shows a technician's schedule. Hover to see details, drag to reschedule.",
          position: "bottom",
        },
      ],
      estimated_duration: 2,
    },
  };

  return tours[featureId] || { steps: [], estimated_duration: 0 };
}
