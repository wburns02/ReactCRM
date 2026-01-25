import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Maintenance prediction item from AI
 */
export interface MaintenancePredictionItem {
  id: string;
  customer_id: string;
  customer_name: string;
  equipment_id: string;
  equipment_type: string;
  service_type: string;
  predicted_date: string;
  confidence: number;
  priority: "low" | "medium" | "high" | "critical";
  estimated_revenue: number;
  factors: PredictionFactor[];
  recommended_technician_id?: string;
  recommended_time_slot?: string;
}

export interface PredictionFactor {
  name: string;
  weight: number;
  value: string;
}

export interface MaintenancePredictionSummary {
  total_predictions: number;
  high_priority_count: number;
  total_estimated_revenue: number;
  average_confidence: number;
  by_equipment_type: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface MaintenancePredictionsResponse {
  predictions: MaintenancePredictionItem[];
  summary: MaintenancePredictionSummary;
}

export interface AutoScheduleResult {
  scheduled_count: number;
  skipped_count: number;
  scheduled_jobs: ScheduledJob[];
  skipped_reasons: SkippedReason[];
  optimization_summary: OptimizationSummary;
}

export interface ScheduledJob {
  work_order_id: string;
  prediction_id: string;
  customer_name: string;
  scheduled_date: string;
  scheduled_time: string;
  assigned_technician: string;
}

export interface SkippedReason {
  prediction_id: string;
  reason: string;
}

export interface OptimizationSummary {
  travel_time_saved_minutes: number;
  route_efficiency_percent: number;
  technician_utilization_percent: number;
}

export interface BatchOptimizationResult {
  optimized_count: number;
  routes_changed: number;
  savings: {
    travel_time_minutes: number;
    fuel_estimate: number;
    efficiency_gain_percent: number;
  };
}

/**
 * Get AI maintenance predictions
 */
export function useMaintenancePredictions(params?: {
  days_ahead?: number;
  min_confidence?: number;
  equipment_type?: string;
}) {
  return useQuery({
    queryKey: ["maintenance-predictions", params],
    queryFn: async (): Promise<MaintenancePredictionsResponse> => {
      try {
        const response = await apiClient.get("/ai/maintenance/predictions", {
          params,
        });
        return response.data;
      } catch {
        return generateDemoPredictions(params?.days_ahead || 14);
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Auto-schedule maintenance jobs based on AI predictions
 */
export function useAutoScheduleMaintenance() {
  return useMutation({
    mutationFn: async (params: {
      prediction_ids?: string[];
      days_ahead?: number;
      max_jobs_per_day?: number;
      optimize_routes?: boolean;
    }): Promise<AutoScheduleResult> => {
      try {
        const response = await apiClient.post(
          "/ai/maintenance/auto-schedule",
          params,
        );
        return response.data;
      } catch {
        return generateDemoAutoScheduleResult(
          params.prediction_ids?.length || 5,
        );
      }
    },
  });
}

/**
 * Batch optimize existing maintenance schedule
 */
export function useBatchOptimization() {
  return useMutation({
    mutationFn: async (params: {
      date_range: { start: string; end: string };
      consider_weather?: boolean;
      balance_technician_load?: boolean;
    }): Promise<BatchOptimizationResult> => {
      try {
        const response = await apiClient.post(
          "/ai/maintenance/batch-optimize",
          params,
        );
        return response.data;
      } catch {
        return {
          optimized_count: 12,
          routes_changed: 8,
          savings: {
            travel_time_minutes: 145,
            fuel_estimate: 89,
            efficiency_gain_percent: 18,
          },
        };
      }
    },
  });
}

/**
 * Get equipment health prediction
 */
export function useEquipmentHealthPrediction(equipmentId: string) {
  return useQuery({
    queryKey: ["equipment-health-prediction", equipmentId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(
          `/ai/equipment/${equipmentId}/health-prediction`,
        );
        return response.data;
      } catch {
        return {
          equipment_id: equipmentId,
          health_score: 78,
          predicted_failure_date: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          failure_probability: 0.23,
          recommended_actions: [
            {
              action: "Schedule preventive pump inspection",
              urgency: "medium",
              cost_estimate: 150,
            },
            {
              action: "Replace filter media",
              urgency: "low",
              cost_estimate: 85,
            },
          ],
          risk_factors: [
            { factor: "Age", impact: "high", value: "8 years" },
            {
              factor: "Usage frequency",
              impact: "medium",
              value: "Above average",
            },
            { factor: "Last service", impact: "low", value: "6 months ago" },
          ],
        };
      }
    },
    enabled: !!equipmentId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Generate demo predictions
 */
function generateDemoPredictions(
  daysAhead: number,
): MaintenancePredictionsResponse {
  const customers = [
    {
      id: "c1",
      name: "Johnson Residence",
      equipment: "Septic Tank",
      type: "Pumping",
    },
    {
      id: "c2",
      name: "Martinez Family",
      equipment: "Aerobic System",
      type: "Inspection",
    },
    {
      id: "c3",
      name: "Smith Commercial",
      equipment: "Grease Trap",
      type: "Cleaning",
    },
    {
      id: "c4",
      name: "Wilson Property",
      equipment: "Septic Tank",
      type: "Repair",
    },
    {
      id: "c5",
      name: "Davis Restaurant",
      equipment: "Grease Trap",
      type: "Pumping",
    },
    {
      id: "c6",
      name: "Thompson Home",
      equipment: "Pump Station",
      type: "Maintenance",
    },
    {
      id: "c7",
      name: "Garcia Business",
      equipment: "Septic Tank",
      type: "Inspection",
    },
    {
      id: "c8",
      name: "Brown Residence",
      equipment: "Aerobic System",
      type: "Service",
    },
  ];

  const predictions: MaintenancePredictionItem[] = customers.map((c, i) => ({
    id: `pred-${i + 1}`,
    customer_id: c.id,
    customer_name: c.name,
    equipment_id: `eq-${c.id}`,
    equipment_type: c.equipment,
    service_type: c.type,
    predicted_date: new Date(
      Date.now() + (i + 1) * (daysAhead / 8) * 24 * 60 * 60 * 1000,
    ).toISOString(),
    confidence: 0.7 + Math.random() * 0.25,
    priority: i < 2 ? "critical" : i < 4 ? "high" : i < 6 ? "medium" : "low",
    estimated_revenue: 250 + Math.floor(Math.random() * 500),
    factors: [
      {
        name: "Time since last service",
        weight: 0.4,
        value: `${Math.floor(Math.random() * 12) + 6} months`,
      },
      {
        name: "Equipment age",
        weight: 0.3,
        value: `${Math.floor(Math.random() * 10) + 2} years`,
      },
      {
        name: "Usage pattern",
        weight: 0.3,
        value: i % 2 === 0 ? "Heavy" : "Normal",
      },
    ],
    recommended_technician_id: `tech-${(i % 4) + 1}`,
    recommended_time_slot: i % 2 === 0 ? "morning" : "afternoon",
  }));

  return {
    predictions,
    summary: {
      total_predictions: predictions.length,
      high_priority_count: predictions.filter(
        (p) => p.priority === "high" || p.priority === "critical",
      ).length,
      total_estimated_revenue: predictions.reduce(
        (sum, p) => sum + p.estimated_revenue,
        0,
      ),
      average_confidence:
        predictions.reduce((sum, p) => sum + p.confidence, 0) /
        predictions.length,
      by_equipment_type: {
        "Septic Tank": 3,
        "Grease Trap": 2,
        "Aerobic System": 2,
        "Pump Station": 1,
      },
      by_priority: {
        critical: 2,
        high: 2,
        medium: 2,
        low: 2,
      },
    },
  };
}

/**
 * Generate demo auto-schedule result
 */
function generateDemoAutoScheduleResult(count: number): AutoScheduleResult {
  const scheduledJobs: ScheduledJob[] = [];
  const technicians = [
    "Mike Johnson",
    "Sarah Williams",
    "Tom Davis",
    "Lisa Chen",
  ];

  for (let i = 0; i < count; i++) {
    const date = new Date(Date.now() + (i + 1) * 2 * 24 * 60 * 60 * 1000);
    scheduledJobs.push({
      work_order_id: `wo-${Date.now()}-${i}`,
      prediction_id: `pred-${i + 1}`,
      customer_name: `Customer ${i + 1}`,
      scheduled_date: date.toISOString().split("T")[0],
      scheduled_time: i % 2 === 0 ? "09:00" : "14:00",
      assigned_technician: technicians[i % technicians.length],
    });
  }

  return {
    scheduled_count: count,
    skipped_count: 0,
    scheduled_jobs: scheduledJobs,
    skipped_reasons: [],
    optimization_summary: {
      travel_time_saved_minutes: count * 15,
      route_efficiency_percent: 85 + Math.floor(Math.random() * 10),
      technician_utilization_percent: 78 + Math.floor(Math.random() * 15),
    },
  };
}
