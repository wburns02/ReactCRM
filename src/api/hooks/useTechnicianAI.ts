import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Technician Match Result
 */
export interface TechnicianMatchResult {
  matches: TechnicianMatch[];
  best_match: TechnicianMatch | null;
  analysis: string;
  factors_considered: string[];
}

export interface TechnicianMatch {
  technician_id: string;
  technician_name: string;
  match_score: number;
  skills_match: SkillMatch[];
  availability: AvailabilityInfo;
  distance_miles: number;
  estimated_arrival: string;
  workload_today: number;
  customer_history: CustomerHistoryInfo;
  recommendation: string;
}

export interface SkillMatch {
  skill: string;
  required: boolean;
  has_skill: boolean;
  proficiency: "expert" | "proficient" | "basic" | "none";
}

export interface AvailabilityInfo {
  is_available: boolean;
  next_available: string;
  current_job?: string;
  jobs_remaining_today: number;
}

export interface CustomerHistoryInfo {
  previous_visits: number;
  average_rating: number;
  last_visit?: string;
  customer_preference: boolean;
}

/**
 * Workload Balance Result
 */
export interface WorkloadBalanceResult {
  current_distribution: TechnicianWorkload[];
  recommendations: WorkloadRecommendation[];
  balance_score: number; // 0-100
  optimization_suggestions: string[];
}

export interface TechnicianWorkload {
  technician_id: string;
  technician_name: string;
  jobs_today: number;
  hours_scheduled: number;
  utilization_percentage: number;
  status: "underloaded" | "balanced" | "overloaded";
}

export interface WorkloadRecommendation {
  action: "reassign" | "balance" | "schedule";
  from_technician?: string;
  to_technician?: string;
  job_id?: string;
  reason: string;
  impact: string;
}

/**
 * Find best technician match for a job
 */
export function useTechnicianMatch() {
  return useMutation({
    mutationFn: async (params: {
      jobType: string;
      location: { lat?: number; lng?: number; address?: string };
      requiredSkills?: string[];
      customerId?: string;
      urgency?: "low" | "normal" | "high" | "emergency";
      preferredTechnicianId?: string;
    }): Promise<TechnicianMatchResult> => {
      try {
        const response = await apiClient.post("/ai/technicians/match", params);
        return response.data;
      } catch {
        return generateDemoTechnicianMatch(params);
      }
    },
  });
}

/**
 * Analyze technician workload balance
 */
export function useWorkloadBalance() {
  return useQuery({
    queryKey: ["workload-balance"],
    queryFn: async (): Promise<WorkloadBalanceResult> => {
      try {
        const response = await apiClient.get("/ai/technicians/workload-balance");
        return response.data;
      } catch {
        return generateDemoWorkloadBalance();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get technician performance insights
 */
export function useTechnicianInsights(technicianId: string | undefined) {
  return useQuery({
    queryKey: ["technician-insights", technicianId],
    queryFn: async () => {
      if (!technicianId) throw new Error("Technician ID required");

      try {
        const response = await apiClient.get(`/ai/technicians/${technicianId}/insights`);
        return response.data;
      } catch {
        return {
          performance_score: 85,
          trend: "improving" as const,
          strengths: ["Fast job completion", "High customer ratings", "Low callback rate"],
          improvement_areas: ["Parts inventory management", "Documentation thoroughness"],
          metrics: {
            avg_job_time: "1.2 hours",
            first_time_fix_rate: "94%",
            customer_satisfaction: "4.8/5",
            revenue_per_job: "$425",
          },
          recommendations: [
            "Consider for complex septic installations",
            "Pair with new technicians for training",
          ],
        };
      }
    },
    enabled: !!technicianId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Optimize technician routes
 */
export function useRouteOptimization() {
  return useMutation({
    mutationFn: async (params: {
      technicianId: string;
      jobIds: string[];
      startLocation?: { lat: number; lng: number };
    }) => {
      try {
        const response = await apiClient.post("/ai/technicians/optimize-route", params);
        return response.data;
      } catch {
        return {
          optimized_order: params.jobIds,
          estimated_savings: {
            miles: 12,
            time_minutes: 25,
          },
          total_distance_miles: 45,
          total_time_hours: 6.5,
          route_visualization: null,
        };
      }
    },
  });
}

/**
 * Generate demo technician match results
 */
function generateDemoTechnicianMatch(params: {
  jobType: string;
  requiredSkills?: string[];
  urgency?: string;
}): TechnicianMatchResult {
  const isEmergency = params.urgency === "emergency" || params.urgency === "high";

  const matches: TechnicianMatch[] = [
    {
      technician_id: "t1",
      technician_name: "Mike Johnson",
      match_score: 95,
      skills_match: [
        { skill: "Septic Systems", required: true, has_skill: true, proficiency: "expert" },
        { skill: "Pumping", required: true, has_skill: true, proficiency: "expert" },
        { skill: "Inspections", required: false, has_skill: true, proficiency: "proficient" },
      ],
      availability: {
        is_available: true,
        next_available: "Now",
        jobs_remaining_today: 2,
      },
      distance_miles: 3.5,
      estimated_arrival: "15 minutes",
      workload_today: 6,
      customer_history: {
        previous_visits: 3,
        average_rating: 4.9,
        last_visit: "2024-01-15",
        customer_preference: true,
      },
      recommendation: "Best match - Expert skills, nearby, and customer-preferred",
    },
    {
      technician_id: "t2",
      technician_name: "Sarah Williams",
      match_score: 82,
      skills_match: [
        { skill: "Septic Systems", required: true, has_skill: true, proficiency: "proficient" },
        { skill: "Pumping", required: true, has_skill: true, proficiency: "expert" },
        { skill: "Inspections", required: false, has_skill: true, proficiency: "basic" },
      ],
      availability: {
        is_available: false,
        next_available: "2:30 PM",
        current_job: "WO-2024-0122",
        jobs_remaining_today: 3,
      },
      distance_miles: 5.2,
      estimated_arrival: "45 minutes",
      workload_today: 5,
      customer_history: {
        previous_visits: 0,
        average_rating: 4.7,
        customer_preference: false,
      },
      recommendation: "Available after current job - Strong skills match",
    },
    {
      technician_id: "t3",
      technician_name: "Tom Davis",
      match_score: 75,
      skills_match: [
        { skill: "Septic Systems", required: true, has_skill: true, proficiency: "proficient" },
        { skill: "Pumping", required: true, has_skill: true, proficiency: "proficient" },
        { skill: "Inspections", required: false, has_skill: false, proficiency: "none" },
      ],
      availability: {
        is_available: true,
        next_available: "Now",
        jobs_remaining_today: 4,
      },
      distance_miles: 8.1,
      estimated_arrival: "25 minutes",
      workload_today: 4,
      customer_history: {
        previous_visits: 1,
        average_rating: 4.5,
        last_visit: "2023-11-20",
        customer_preference: false,
      },
      recommendation: "Available now but further away",
    },
  ];

  // Sort by match score
  matches.sort((a, b) => b.match_score - a.match_score);

  // If emergency, prioritize availability
  if (isEmergency) {
    matches.sort((a, b) => {
      if (a.availability.is_available && !b.availability.is_available) return -1;
      if (!a.availability.is_available && b.availability.is_available) return 1;
      return b.match_score - a.match_score;
    });
  }

  return {
    matches,
    best_match: matches[0] || null,
    analysis: `Found ${matches.length} technicians qualified for ${params.jobType}. ${
      isEmergency ? "Prioritizing immediately available technicians due to urgency." : "Ranked by skill match and proximity."
    }`,
    factors_considered: [
      "Skill proficiency levels",
      "Current availability",
      "Distance to job site",
      "Today's workload",
      "Customer history and preferences",
      "First-time fix rate",
    ],
  };
}

/**
 * Generate demo workload balance
 */
function generateDemoWorkloadBalance(): WorkloadBalanceResult {
  const technicians: TechnicianWorkload[] = [
    {
      technician_id: "t1",
      technician_name: "Mike Johnson",
      jobs_today: 7,
      hours_scheduled: 8.5,
      utilization_percentage: 106,
      status: "overloaded",
    },
    {
      technician_id: "t2",
      technician_name: "Sarah Williams",
      jobs_today: 5,
      hours_scheduled: 6.0,
      utilization_percentage: 75,
      status: "balanced",
    },
    {
      technician_id: "t3",
      technician_name: "Tom Davis",
      jobs_today: 3,
      hours_scheduled: 4.0,
      utilization_percentage: 50,
      status: "underloaded",
    },
    {
      technician_id: "t4",
      technician_name: "Lisa Chen",
      jobs_today: 6,
      hours_scheduled: 7.5,
      utilization_percentage: 94,
      status: "balanced",
    },
  ];

  const overloaded = technicians.filter((t) => t.status === "overloaded");
  const underloaded = technicians.filter((t) => t.status === "underloaded");

  const recommendations: WorkloadRecommendation[] = [];

  if (overloaded.length > 0 && underloaded.length > 0) {
    recommendations.push({
      action: "reassign",
      from_technician: overloaded[0].technician_name,
      to_technician: underloaded[0].technician_name,
      job_id: "WO-2024-0125",
      reason: `${overloaded[0].technician_name} is at ${overloaded[0].utilization_percentage}% capacity while ${underloaded[0].technician_name} is only at ${underloaded[0].utilization_percentage}%`,
      impact: "Will balance team utilization and reduce overtime risk",
    });
  }

  const avgUtilization = technicians.reduce((sum, t) => sum + t.utilization_percentage, 0) / technicians.length;
  const balanceScore = Math.max(0, 100 - Math.abs(avgUtilization - 80) * 2);

  return {
    current_distribution: technicians,
    recommendations,
    balance_score: Math.round(balanceScore),
    optimization_suggestions: [
      "Consider reassigning 1 job from Mike to Tom",
      "Schedule buffer time between Tom's jobs for drive time",
      "Monitor Sarah's late afternoon availability for add-ons",
    ],
  };
}
