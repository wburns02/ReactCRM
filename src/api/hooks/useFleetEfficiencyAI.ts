import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Fleet efficiency metrics
 */
export interface FleetEfficiencyMetrics {
  overall_efficiency: number;
  fuel_efficiency: number;
  utilization_rate: number;
  maintenance_score: number;
  by_vehicle: VehicleEfficiency[];
  recommendations: FleetRecommendation[];
  cost_savings_potential: number;
}

export interface VehicleEfficiency {
  vehicle_id: string;
  vehicle_name: string;
  efficiency_score: number;
  miles_driven: number;
  fuel_consumed: number;
  mpg: number;
  idle_time_percent: number;
  maintenance_status: "good" | "due_soon" | "overdue";
  issues: string[];
}

export interface FleetRecommendation {
  type: "route" | "maintenance" | "fuel" | "utilization" | "replacement";
  title: string;
  description: string;
  potential_savings: number;
  priority: "high" | "medium" | "low";
  affected_vehicles: string[];
}

/**
 * Route optimization result
 */
export interface RouteOptimization {
  original_distance: number;
  optimized_distance: number;
  distance_saved: number;
  time_saved_minutes: number;
  fuel_saved_gallons: number;
  cost_saved: number;
  optimized_route: RouteStop[];
}

export interface RouteStop {
  order: number;
  address: string;
  customer_name: string;
  arrival_time: string;
  service_duration: number;
}

/**
 * Get fleet efficiency metrics
 */
export function useFleetEfficiency(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ["fleet-efficiency", dateRange],
    queryFn: async (): Promise<FleetEfficiencyMetrics> => {
      try {
        const response = await apiClient.get("/ai/fleet/efficiency", { params: dateRange });
        return response.data;
      } catch {
        return generateDemoFleetMetrics();
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Optimize routes for a specific day
 */
export function useOptimizeRoutes() {
  return useMutation({
    mutationFn: async (params: {
      date: string;
      technician_id?: string;
      consider_traffic?: boolean;
      consider_time_windows?: boolean;
    }): Promise<RouteOptimization> => {
      try {
        const response = await apiClient.post("/ai/fleet/optimize-routes", params);
        return response.data;
      } catch {
        return generateDemoRouteOptimization();
      }
    },
  });
}

/**
 * Get vehicle health predictions
 */
export function useVehicleHealthPredictions() {
  return useQuery({
    queryKey: ["vehicle-health-predictions"],
    queryFn: async (): Promise<{
      vehicles: Array<{
        vehicle_id: string;
        vehicle_name: string;
        health_score: number;
        predicted_issues: Array<{ issue: string; probability: number; urgency: string }>;
        recommended_maintenance: Array<{ task: string; due_date: string; cost_estimate: number }>;
      }>;
    }> => {
      try {
        const response = await apiClient.get("/ai/fleet/health-predictions");
        return response.data;
      } catch {
        return generateDemoHealthPredictions();
      }
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Analyze fuel efficiency trends
 */
export function useFuelEfficiencyAnalysis() {
  return useQuery({
    queryKey: ["fuel-efficiency-analysis"],
    queryFn: async (): Promise<{
      current_mpg: number;
      target_mpg: number;
      trend: "improving" | "stable" | "declining";
      by_vehicle: Array<{ vehicle_id: string; name: string; mpg: number; vs_target: number }>;
      improvement_suggestions: string[];
    }> => {
      try {
        const response = await apiClient.get("/ai/fleet/fuel-analysis");
        return response.data;
      } catch {
        return {
          current_mpg: 8.5,
          target_mpg: 10,
          trend: "improving",
          by_vehicle: [
            { vehicle_id: "v1", name: "Truck #1", mpg: 9.2, vs_target: -0.8 },
            { vehicle_id: "v2", name: "Truck #2", mpg: 8.1, vs_target: -1.9 },
            { vehicle_id: "v3", name: "Truck #3", mpg: 8.3, vs_target: -1.7 },
          ],
          improvement_suggestions: [
            "Reduce idle time - currently averaging 18% vs. 10% target",
            "Optimize route planning to reduce total miles",
            "Schedule maintenance for Truck #2 - potential engine tune needed",
          ],
        };
      }
    },
    staleTime: 15 * 60 * 1000,
  });
}

function generateDemoFleetMetrics(): FleetEfficiencyMetrics {
  return {
    overall_efficiency: 78,
    fuel_efficiency: 82,
    utilization_rate: 74,
    maintenance_score: 85,
    by_vehicle: [
      {
        vehicle_id: "v-1",
        vehicle_name: "Truck #1 - Ford F-550",
        efficiency_score: 85,
        miles_driven: 1245,
        fuel_consumed: 138,
        mpg: 9.0,
        idle_time_percent: 12,
        maintenance_status: "good",
        issues: [],
      },
      {
        vehicle_id: "v-2",
        vehicle_name: "Truck #2 - Ford F-550",
        efficiency_score: 72,
        miles_driven: 1180,
        fuel_consumed: 147,
        mpg: 8.0,
        idle_time_percent: 18,
        maintenance_status: "due_soon",
        issues: ["High idle time", "Oil change due in 500 miles"],
      },
      {
        vehicle_id: "v-3",
        vehicle_name: "Truck #3 - International",
        efficiency_score: 78,
        miles_driven: 1320,
        fuel_consumed: 165,
        mpg: 8.0,
        idle_time_percent: 15,
        maintenance_status: "good",
        issues: ["Slightly below MPG target"],
      },
    ],
    recommendations: [
      {
        type: "route",
        title: "Route Optimization Opportunity",
        description: "AI analysis found 15% potential reduction in daily miles through better route sequencing",
        potential_savings: 450,
        priority: "high",
        affected_vehicles: ["v-1", "v-2", "v-3"],
      },
      {
        type: "maintenance",
        title: "Preventive Maintenance Alert",
        description: "Truck #2 showing signs of reduced efficiency - recommend tune-up",
        potential_savings: 200,
        priority: "medium",
        affected_vehicles: ["v-2"],
      },
      {
        type: "fuel",
        title: "Idle Time Reduction",
        description: "Reducing idle time to 10% target could save 50 gallons/month",
        potential_savings: 175,
        priority: "medium",
        affected_vehicles: ["v-2", "v-3"],
      },
    ],
    cost_savings_potential: 825,
  };
}

function generateDemoRouteOptimization(): RouteOptimization {
  return {
    original_distance: 78.5,
    optimized_distance: 62.3,
    distance_saved: 16.2,
    time_saved_minutes: 45,
    fuel_saved_gallons: 2.0,
    cost_saved: 7.0,
    optimized_route: [
      { order: 1, address: "123 Main St", customer_name: "Johnson", arrival_time: "08:00", service_duration: 60 },
      { order: 2, address: "456 Oak Ave", customer_name: "Smith", arrival_time: "09:15", service_duration: 45 },
      { order: 3, address: "789 Pine Rd", customer_name: "Williams", arrival_time: "10:30", service_duration: 90 },
      { order: 4, address: "321 Elm St", customer_name: "Davis", arrival_time: "12:30", service_duration: 60 },
      { order: 5, address: "654 Cedar Ln", customer_name: "Martinez", arrival_time: "14:00", service_duration: 45 },
    ],
  };
}

function generateDemoHealthPredictions() {
  return {
    vehicles: [
      {
        vehicle_id: "v-1",
        vehicle_name: "Truck #1 - Ford F-550",
        health_score: 92,
        predicted_issues: [],
        recommended_maintenance: [
          { task: "Oil change", due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), cost_estimate: 85 },
        ],
      },
      {
        vehicle_id: "v-2",
        vehicle_name: "Truck #2 - Ford F-550",
        health_score: 74,
        predicted_issues: [
          { issue: "Brake pad wear", probability: 0.72, urgency: "medium" },
          { issue: "Battery degradation", probability: 0.45, urgency: "low" },
        ],
        recommended_maintenance: [
          { task: "Brake inspection", due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), cost_estimate: 150 },
          { task: "Oil change", due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), cost_estimate: 85 },
        ],
      },
      {
        vehicle_id: "v-3",
        vehicle_name: "Truck #3 - International",
        health_score: 86,
        predicted_issues: [
          { issue: "Tire wear", probability: 0.55, urgency: "low" },
        ],
        recommended_maintenance: [
          { task: "Tire rotation", due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), cost_estimate: 50 },
        ],
      },
    ],
  };
}
