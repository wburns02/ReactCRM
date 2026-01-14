import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

/**
 * Route Optimization Types
 */
export interface RouteOptimizationRequest {
  date: string; // YYYY-MM-DD
  technician_ids?: number[];
  work_order_ids?: string[];
  optimize_for?: "time" | "distance" | "balanced";
  start_location?: {
    lat: number;
    lng: number;
    address: string;
  };
  end_location?: {
    lat: number;
    lng: number;
    address: string;
  };
  max_driving_time_minutes?: number;
  include_breaks?: boolean;
}

export interface OptimizedStop {
  work_order_id: string;
  customer_name: string;
  address: string;
  lat: number;
  lng: number;
  arrival_time: string;
  departure_time: string;
  service_duration_minutes: number;
  driving_time_minutes: number;
  driving_distance_miles: number;
  sequence: number;
}

export interface TechnicianRoute {
  technician_id: number;
  technician_name: string;
  stops: OptimizedStop[];
  total_distance_miles: number;
  total_driving_time_minutes: number;
  total_service_time_minutes: number;
  route_efficiency_score: number;
}

export interface RouteOptimizationResponse {
  success: boolean;
  message: string;
  routes: TechnicianRoute[];
  optimization_stats: {
    total_work_orders: number;
    total_distance_saved_miles: number;
    total_time_saved_minutes: number;
    improvement_percentage: number;
  };
  polylines?: Record<number, string>; // Encoded polylines per technician
}

export interface RoutePreviewRequest {
  work_order_ids: string[];
  technician_id: number;
}

export interface RoutePreviewResponse {
  route: OptimizedStop[];
  total_distance_miles: number;
  total_driving_time_minutes: number;
  polyline: string;
}

/**
 * Optimize routes for a given date
 */
export function useOptimizeRoutes() {
  return useMutation({
    mutationFn: async (
      request: RouteOptimizationRequest,
    ): Promise<RouteOptimizationResponse> => {
      const { data } = await apiClient.post(
        "/scheduling/optimize-routes",
        request,
      );
      return data;
    },
  });
}

/**
 * Apply optimized routes (update work order sequences and times)
 */
export function useApplyOptimizedRoutes() {
  return useMutation({
    mutationFn: async (
      routes: TechnicianRoute[],
    ): Promise<{ success: boolean; updated_count: number }> => {
      const { data } = await apiClient.post(
        "/scheduling/apply-optimized-routes",
        { routes },
      );
      return data;
    },
  });
}

/**
 * Get route preview for a set of work orders
 */
export function useRoutePreview() {
  return useMutation({
    mutationFn: async (
      request: RoutePreviewRequest,
    ): Promise<RoutePreviewResponse> => {
      const { data } = await apiClient.post(
        "/scheduling/route-preview",
        request,
      );
      return data;
    },
  });
}

/**
 * Get driving directions between two points
 */
export function useDrivingDirections() {
  return useMutation({
    mutationFn: async (params: {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
    }): Promise<{
      distance_miles: number;
      duration_minutes: number;
      polyline: string;
    }> => {
      const { data } = await apiClient.post(
        "/scheduling/driving-directions",
        params,
      );
      return data;
    },
  });
}

/**
 * Get optimization history for a date range
 */
export function useOptimizationHistory(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["optimization-history", startDate, endDate],
    queryFn: async () => {
      const { data } = await apiClient.get("/scheduling/optimization-history", {
        params: { start_date: startDate, end_date: endDate },
      });
      return data as {
        optimizations: {
          id: string;
          date: string;
          created_at: string;
          total_distance_saved_miles: number;
          total_time_saved_minutes: number;
          work_orders_count: number;
        }[];
      };
    },
    enabled: !!startDate && !!endDate,
  });
}
