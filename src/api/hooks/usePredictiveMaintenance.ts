import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient, withFallback } from "@/api/client";

/**
 * Predictive Maintenance Types
 */
export interface MaintenancePrediction {
  id: string;
  customer_id: string;
  customer_name: string;
  address: string;
  equipment_type:
    | "septic_tank"
    | "grease_trap"
    | "pump_station"
    | "aerobic_system";
  last_service_date: string;
  predicted_service_date: string;
  days_until_service: number;
  risk_score: number; // 0-100
  risk_level: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
  recommended_services: string[];
  estimated_cost: number;
}

export interface RiskFactor {
  name: string;
  description: string;
  impact: "low" | "medium" | "high";
  value: string | number;
}

export interface PredictionSummary {
  total_customers_at_risk: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  predicted_revenue_30_days: number;
  predicted_revenue_90_days: number;
  average_days_between_service: number;
}

export interface MaintenanceAlert {
  id: string;
  customer_id: string;
  customer_name: string;
  alert_type: "overdue" | "upcoming" | "risk_increase" | "weather_impact";
  severity: "info" | "warning" | "urgent";
  message: string;
  created_at: string;
  is_read: boolean;
  recommended_action: string;
}

export interface PredictionFilters {
  risk_level?: "low" | "medium" | "high" | "critical";
  days_until_service?: number;
  equipment_type?: string;
  region?: string;
  page?: number;
  page_size?: number;
}

/**
 * Default values for 404 fallback
 */
const DEFAULT_SUMMARY: PredictionSummary = {
  total_customers_at_risk: 0,
  high_risk_count: 0,
  medium_risk_count: 0,
  low_risk_count: 0,
  predicted_revenue_30_days: 0,
  predicted_revenue_90_days: 0,
  average_days_between_service: 0,
};

/**
 * Get prediction summary/dashboard stats
 * Returns default summary if endpoint not implemented (404)
 */
export function usePredictionSummary() {
  return useQuery({
    queryKey: ["predictive-maintenance", "summary"],
    queryFn: async (): Promise<PredictionSummary> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/predictions/summary");
        return data;
      }, DEFAULT_SUMMARY);
    },
  });
}

/**
 * Get maintenance predictions with filters
 * Returns empty list if endpoint not implemented (404)
 */
export function useMaintenancePredictions(filters?: PredictionFilters) {
  return useQuery({
    queryKey: ["predictive-maintenance", "predictions", filters],
    queryFn: async (): Promise<{
      items: MaintenancePrediction[];
      total: number;
    }> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get("/predictions/predictions", {
            params: filters,
          });
          return data;
        },
        { items: [], total: 0 },
      );
    },
  });
}

/**
 * Get high-risk predictions only
 * Returns empty array if endpoint not implemented (404)
 */
export function useHighRiskPredictions(limit = 10) {
  return useQuery({
    queryKey: ["predictive-maintenance", "high-risk", limit],
    queryFn: async (): Promise<MaintenancePrediction[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/predictions/predictions", {
          params: {
            risk_level: "high",
            page_size: limit,
          },
        });
        return data.items || [];
      }, []);
    },
  });
}

/**
 * Get prediction for a specific customer
 */
export function useCustomerPrediction(customerId: number) {
  return useQuery({
    queryKey: ["predictive-maintenance", "customer", customerId],
    queryFn: async (): Promise<MaintenancePrediction> => {
      const { data } = await apiClient.get(
        `/predictions/customer/${customerId}`,
      );
      return data;
    },
    enabled: !!customerId,
  });
}

/**
 * Get maintenance alerts
 * Returns empty array if endpoint not implemented (404)
 */
export function useMaintenanceAlerts(unreadOnly = false) {
  return useQuery({
    queryKey: ["predictive-maintenance", "alerts", unreadOnly],
    queryFn: async (): Promise<MaintenanceAlert[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/predictions/alerts", {
          params: { unread_only: unreadOnly },
        });
        return data.alerts || [];
      }, []);
    },
  });
}

/**
 * Mark alert as read
 */
export function useMarkAlertRead() {
  return useMutation({
    mutationFn: async (alertId: string): Promise<void> => {
      await apiClient.post(`/predictions/alerts/${alertId}/read`);
    },
  });
}

/**
 * Create work order from prediction
 */
export function useCreateFromPrediction() {
  return useMutation({
    mutationFn: async (
      predictionId: string,
    ): Promise<{ work_order_id: string }> => {
      const { data } = await apiClient.post(
        `/predictions/predictions/${predictionId}/create-work-order`,
      );
      return data;
    },
  });
}

/**
 * Get predictions for a date range (for calendar view)
 * Returns empty array if endpoint not implemented (404)
 */
export function usePredictionCalendar(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["predictive-maintenance", "calendar", startDate, endDate],
    queryFn: async (): Promise<
      { date: string; predictions: MaintenancePrediction[] }[]
    > => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/predictions/calendar", {
          params: { start_date: startDate, end_date: endDate },
        });
        return data.days || [];
      }, []);
    },
    enabled: !!startDate && !!endDate,
  });
}

/**
 * Refresh predictions (trigger model recalculation)
 */
export function useRefreshPredictions() {
  return useMutation({
    mutationFn: async (): Promise<{ updated_count: number }> => {
      const { data } = await apiClient.post("/predictions/refresh");
      return data;
    },
  });
}
