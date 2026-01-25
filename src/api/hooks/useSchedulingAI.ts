import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Schedule Optimization Result
 */
export interface ScheduleOptimizationResult {
  optimized_schedule: OptimizedJob[];
  metrics: ScheduleMetrics;
  savings: ScheduleSavings;
  conflicts_resolved: ConflictResolution[];
  recommendations: ScheduleRecommendation[];
}

export interface OptimizedJob {
  job_id: string;
  technician_id: string;
  technician_name: string;
  original_time: string;
  optimized_time: string;
  original_order: number;
  optimized_order: number;
  change_reason?: string;
}

export interface ScheduleMetrics {
  total_drive_time_hours: number;
  total_drive_distance_miles: number;
  technician_utilization: number;
  jobs_per_technician_avg: number;
  gaps_between_jobs_avg_min: number;
}

export interface ScheduleSavings {
  drive_time_saved_hours: number;
  drive_time_saved_percent: number;
  fuel_cost_saved: number;
  additional_job_capacity: number;
}

export interface ConflictResolution {
  conflict_type: "overlap" | "travel_time" | "skill_mismatch" | "availability";
  original_issue: string;
  resolution: string;
  jobs_affected: string[];
}

export interface ScheduleRecommendation {
  priority: "high" | "medium" | "low";
  category: "efficiency" | "workload" | "customer" | "cost";
  suggestion: string;
  impact: string;
  action_required: boolean;
}

/**
 * Smart Slot Suggestion
 */
export interface SmartSlotResult {
  suggested_slots: TimeSlot[];
  factors_considered: string[];
  optimization_score: number;
}

export interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  technician_id: string;
  technician_name: string;
  score: number;
  reasoning: string[];
  travel_time_from_previous: number;
  customer_preference_match: boolean;
}

/**
 * Optimize daily schedule
 */
export function useScheduleOptimization() {
  return useMutation({
    mutationFn: async (params: {
      date: string;
      technicianIds?: string[];
      optimizeFor?: "time" | "distance" | "balanced";
    }): Promise<ScheduleOptimizationResult> => {
      try {
        const response = await apiClient.post("/ai/schedule/optimize", params);
        return response.data;
      } catch {
        return generateDemoScheduleOptimization(params.date);
      }
    },
  });
}

/**
 * Get smart time slot suggestions for a new job
 */
export function useSmartSlotSuggestion() {
  return useMutation({
    mutationFn: async (params: {
      jobType: string;
      estimatedDuration: number;
      customerLocation: { lat?: number; lng?: number; address?: string };
      preferredDate?: string;
      preferredTimeRange?: { start: string; end: string };
      requiredSkills?: string[];
    }): Promise<SmartSlotResult> => {
      try {
        const response = await apiClient.post(
          "/ai/schedule/suggest-slot",
          params,
        );
        return response.data;
      } catch {
        return generateDemoSlotSuggestions(params);
      }
    },
  });
}

/**
 * Analyze schedule for issues
 */
export function useScheduleAnalysis(date?: string) {
  return useQuery({
    queryKey: ["schedule-analysis", date],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/ai/schedule/analyze", {
          params: { date },
        });
        return response.data;
      } catch {
        return {
          date: date || new Date().toISOString().split("T")[0],
          overall_health: 78,
          issues: [
            {
              severity: "high",
              type: "Travel time gap",
              description: "30+ minute gap between jobs for Tech 1",
              suggestion: "Consider reassigning job WO-124 to fill gap",
            },
            {
              severity: "medium",
              type: "Workload imbalance",
              description: "Tech 2 has 40% more jobs than team average",
              suggestion: "Redistribute 1-2 jobs to Tech 3",
            },
          ],
          opportunities: [
            "Potential to fit 1 more job by optimizing routes",
            "Customer in area has pending service - consider adding",
          ],
          efficiency_score: 72,
          utilization_by_tech: [
            { technician: "Mike J.", utilization: 95, status: "optimal" },
            {
              technician: "Sarah W.",
              utilization: 65,
              status: "underutilized",
            },
            { technician: "Tom D.", utilization: 88, status: "optimal" },
          ],
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Auto-fill schedule gaps
 */
export function useAutoFillGaps() {
  return useMutation({
    mutationFn: async (params: {
      date: string;
      technicianId?: string;
      minimumGapMinutes?: number;
    }) => {
      try {
        const response = await apiClient.post("/ai/schedule/auto-fill", params);
        return response.data;
      } catch {
        return {
          gaps_found: 3,
          gaps_filled: 2,
          jobs_added: [
            { job_id: "WO-NEW-1", time: "10:30 AM", technician: "Mike J." },
            { job_id: "WO-NEW-2", time: "2:00 PM", technician: "Sarah W." },
          ],
          remaining_gaps: [
            {
              technician: "Tom D.",
              start: "11:00 AM",
              end: "12:00 PM",
              reason: "No matching jobs in area",
            },
          ],
          capacity_increase: 15,
        };
      }
    },
  });
}

/**
 * Generate demo schedule optimization
 */
function generateDemoScheduleOptimization(
  _date: string,
): ScheduleOptimizationResult {
  return {
    optimized_schedule: [
      {
        job_id: "WO-001",
        technician_id: "t1",
        technician_name: "Mike Johnson",
        original_time: "8:00 AM",
        optimized_time: "8:00 AM",
        original_order: 1,
        optimized_order: 1,
      },
      {
        job_id: "WO-003",
        technician_id: "t1",
        technician_name: "Mike Johnson",
        original_time: "11:00 AM",
        optimized_time: "9:30 AM",
        original_order: 3,
        optimized_order: 2,
        change_reason: "Moved earlier to reduce backtracking",
      },
      {
        job_id: "WO-002",
        technician_id: "t1",
        technician_name: "Mike Johnson",
        original_time: "9:30 AM",
        optimized_time: "11:00 AM",
        original_order: 2,
        optimized_order: 3,
        change_reason: "Reordered for optimal route",
      },
    ],
    metrics: {
      total_drive_time_hours: 2.5,
      total_drive_distance_miles: 45,
      technician_utilization: 85,
      jobs_per_technician_avg: 5.2,
      gaps_between_jobs_avg_min: 15,
    },
    savings: {
      drive_time_saved_hours: 0.75,
      drive_time_saved_percent: 23,
      fuel_cost_saved: 18.5,
      additional_job_capacity: 1,
    },
    conflicts_resolved: [
      {
        conflict_type: "travel_time",
        original_issue: "Insufficient travel time between WO-002 and WO-003",
        resolution: "Reordered jobs to create efficient route",
        jobs_affected: ["WO-002", "WO-003"],
      },
    ],
    recommendations: [
      {
        priority: "high",
        category: "efficiency",
        suggestion: "Apply optimized route - saves 45 minutes drive time",
        impact: "Can fit additional job or earlier end time",
        action_required: true,
      },
      {
        priority: "medium",
        category: "workload",
        suggestion: "Consider reassigning WO-005 from Tech 2 to Tech 3",
        impact: "Better workload balance across team",
        action_required: false,
      },
      {
        priority: "low",
        category: "customer",
        suggestion: "Customer at 123 Main St has service due - add to route",
        impact: "Proactive service, no additional drive time",
        action_required: false,
      },
    ],
  };
}

/**
 * Generate demo slot suggestions
 */
function generateDemoSlotSuggestions(params: {
  jobType: string;
  estimatedDuration: number;
  preferredDate?: string;
}): SmartSlotResult {
  const baseDate =
    params.preferredDate || new Date().toISOString().split("T")[0];

  return {
    suggested_slots: [
      {
        date: baseDate,
        start_time: "10:00 AM",
        end_time: "11:30 AM",
        technician_id: "t1",
        technician_name: "Mike Johnson",
        score: 95,
        reasoning: [
          "Expert in " + params.jobType,
          "Minimal travel time from previous job",
          "Customer preferred time window",
        ],
        travel_time_from_previous: 8,
        customer_preference_match: true,
      },
      {
        date: baseDate,
        start_time: "2:00 PM",
        end_time: "3:30 PM",
        technician_id: "t2",
        technician_name: "Sarah Williams",
        score: 82,
        reasoning: [
          "Available slot with buffer time",
          "Proficient in " + params.jobType,
          "Route efficient with existing schedule",
        ],
        travel_time_from_previous: 15,
        customer_preference_match: true,
      },
      {
        date: new Date(new Date(baseDate).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        start_time: "9:00 AM",
        end_time: "10:30 AM",
        technician_id: "t1",
        technician_name: "Mike Johnson",
        score: 78,
        reasoning: [
          "First slot of day - no prior travel",
          "Expert availability",
          "Next day availability",
        ],
        travel_time_from_previous: 0,
        customer_preference_match: false,
      },
    ],
    factors_considered: [
      "Technician skills and availability",
      "Travel time optimization",
      "Customer location and preferences",
      "Existing schedule gaps",
      "Service type requirements",
      "Historical job duration",
    ],
    optimization_score: 88,
  };
}
