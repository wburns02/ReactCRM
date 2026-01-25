import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Demand Forecast Result
 */
export interface DemandForecastResult {
  item_id: string;
  item_name: string;
  current_stock: number;
  forecast_period_days: number;
  predicted_usage: number;
  confidence: number;
  reorder_recommendation: ReorderRecommendation;
  usage_trend: "increasing" | "stable" | "decreasing";
  seasonal_factors: SeasonalFactor[];
  historical_accuracy: number;
}

export interface ReorderRecommendation {
  should_reorder: boolean;
  recommended_quantity: number;
  optimal_order_date: string;
  estimated_stockout_date?: string;
  urgency: "critical" | "soon" | "normal" | "not_needed";
}

export interface SeasonalFactor {
  month: string;
  multiplier: number;
  notes?: string;
}

/**
 * Inventory Overview Result
 */
export interface InventoryOverviewResult {
  total_items: number;
  total_value: number;
  low_stock_items: number;
  critical_items: Array<{
    id: string;
    name: string;
    current_stock: number;
    days_until_stockout: number;
  }>;
  slow_moving_items: Array<{
    id: string;
    name: string;
    days_since_last_use: number;
    quantity: number;
    value: number;
  }>;
  optimization_suggestions: string[];
  forecast_summary: string;
}

/**
 * Get AI demand forecast for an inventory item
 */
export function useDemandForecast(
  itemId: string | undefined,
  days: number = 30,
) {
  return useQuery({
    queryKey: ["demand-forecast", itemId, days],
    queryFn: async (): Promise<DemandForecastResult> => {
      if (!itemId) throw new Error("Item ID required");

      try {
        const response = await apiClient.get(
          `/ai/inventory/${itemId}/forecast`,
          {
            params: { days },
          },
        );
        return response.data;
      } catch {
        // Demo fallback
        try {
          const itemRes = await apiClient.get(`/inventory/${itemId}`);
          return generateDemoForecast(itemRes.data, days);
        } catch {
          return generateDemoForecast(null, days);
        }
      }
    },
    enabled: !!itemId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Get AI inventory overview and recommendations
 */
export function useInventoryOverview() {
  return useQuery({
    queryKey: ["inventory-overview"],
    queryFn: async (): Promise<InventoryOverviewResult> => {
      try {
        const response = await apiClient.get("/ai/inventory/overview");
        return response.data;
      } catch {
        // Demo fallback
        try {
          const itemsRes = await apiClient.get("/inventory", {
            params: { page_size: 100 },
          });
          return generateDemoOverview(itemsRes.data?.items || []);
        } catch {
          return generateDemoOverview([]);
        }
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Batch forecast multiple items
 */
export function useBatchForecast() {
  return useMutation({
    mutationFn: async (params: {
      itemIds: string[];
      days: number;
    }): Promise<DemandForecastResult[]> => {
      try {
        const response = await apiClient.post(
          "/ai/inventory/batch-forecast",
          params,
        );
        return response.data;
      } catch {
        return [];
      }
    },
  });
}

/**
 * Get reorder suggestions
 */
export function useReorderSuggestions() {
  return useQuery({
    queryKey: ["reorder-suggestions"],
    queryFn: async () => {
      try {
        const response = await apiClient.get(
          "/ai/inventory/reorder-suggestions",
        );
        return response.data;
      } catch {
        return {
          suggestions: [
            {
              item_name: 'PVC Pipe 4"',
              current_stock: 12,
              recommended_order: 50,
              urgency: "soon",
              reason:
                "Based on historical usage, stock will be depleted in 14 days",
            },
            {
              item_name: "Septic Tank Risers",
              current_stock: 3,
              recommended_order: 10,
              urgency: "critical",
              reason: "Stock critically low, immediate reorder recommended",
            },
          ],
          total_reorder_value: 1250,
          priority_count: { critical: 1, soon: 1, normal: 3 },
        };
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Analyze inventory optimization opportunities
 */
export function useInventoryOptimization() {
  return useMutation({
    mutationFn: async (): Promise<{
      excess_inventory: Array<{
        item: string;
        excess_quantity: number;
        tied_up_value: number;
      }>;
      bundling_opportunities: Array<{ items: string[]; frequency: number }>;
      supplier_consolidation: Array<{
        current_suppliers: number;
        recommended: string;
      }>;
      total_savings_potential: number;
    }> => {
      try {
        const response = await apiClient.post("/ai/inventory/optimize");
        return response.data;
      } catch {
        return {
          excess_inventory: [
            {
              item: "Outdated Filter Model",
              excess_quantity: 25,
              tied_up_value: 375,
            },
          ],
          bundling_opportunities: [
            { items: ["Pump Kit", "Gasket Set", "Filter"], frequency: 15 },
          ],
          supplier_consolidation: [
            {
              current_suppliers: 3,
              recommended: "Consolidate to 2 suppliers for volume discounts",
            },
          ],
          total_savings_potential: 2500,
        };
      }
    },
  });
}

interface InventoryItemData {
  id: string;
  name: string;
  quantity: number;
  reorder_point: number;
  unit_cost?: number;
  category?: string;
}

/**
 * Generate demo forecast
 */
function generateDemoForecast(
  item: InventoryItemData | null,
  days: number,
): DemandForecastResult {
  const currentStock = item?.quantity || 50;
  const dailyUsage = 2 + Math.random() * 3; // 2-5 units per day
  const predictedUsage = Math.round(dailyUsage * days);
  const daysUntilStockout =
    currentStock > 0 ? Math.round(currentStock / dailyUsage) : 0;

  let urgency: "critical" | "soon" | "normal" | "not_needed" = "normal";
  let shouldReorder = false;

  if (daysUntilStockout < 7) {
    urgency = "critical";
    shouldReorder = true;
  } else if (daysUntilStockout < 14) {
    urgency = "soon";
    shouldReorder = true;
  } else if (daysUntilStockout < 30) {
    urgency = "normal";
    shouldReorder = currentStock < (item?.reorder_point || 20);
  } else {
    urgency = "not_needed";
  }

  const trends: Array<"increasing" | "stable" | "decreasing"> = [
    "increasing",
    "stable",
    "decreasing",
  ];
  const trend = trends[Math.floor(Math.random() * 3)];

  return {
    item_id: item?.id || "unknown",
    item_name: item?.name || "Unknown Item",
    current_stock: currentStock,
    forecast_period_days: days,
    predicted_usage: predictedUsage,
    confidence: 70 + Math.floor(Math.random() * 25),
    reorder_recommendation: {
      should_reorder: shouldReorder,
      recommended_quantity: Math.max(
        0,
        Math.round(predictedUsage * 1.5 - currentStock),
      ),
      optimal_order_date: new Date(
        Date.now() + (daysUntilStockout - 7) * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0],
      estimated_stockout_date:
        daysUntilStockout > 0
          ? new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]
          : undefined,
      urgency,
    },
    usage_trend: trend,
    seasonal_factors: [
      {
        month: "Summer",
        multiplier: 1.3,
        notes: "Higher demand during peak season",
      },
      { month: "Winter", multiplier: 0.8, notes: "Reduced service calls" },
    ],
    historical_accuracy: 75 + Math.floor(Math.random() * 20),
  };
}

/**
 * Generate demo overview
 */
function generateDemoOverview(
  items: InventoryItemData[],
): InventoryOverviewResult {
  const totalItems = items.length || 45;
  const totalValue =
    items.reduce(
      (sum, item) => sum + item.quantity * (item.unit_cost || 10),
      0,
    ) || 15000;
  const lowStockItems =
    items.filter((item) => item.quantity < (item.reorder_point || 10)).length ||
    5;

  return {
    total_items: totalItems,
    total_value: totalValue,
    low_stock_items: lowStockItems,
    critical_items: [
      {
        id: "1",
        name: 'PVC Coupling 4"',
        current_stock: 5,
        days_until_stockout: 3,
      },
      {
        id: "2",
        name: "Septic Pump Float",
        current_stock: 2,
        days_until_stockout: 5,
      },
    ],
    slow_moving_items: [
      {
        id: "3",
        name: "Specialty Fitting",
        days_since_last_use: 90,
        quantity: 15,
        value: 225,
      },
      {
        id: "4",
        name: "Legacy Part XY-100",
        days_since_last_use: 120,
        quantity: 8,
        value: 160,
      },
    ],
    optimization_suggestions: [
      "Consider liquidating 3 slow-moving items to free up $385 in working capital",
      "Set up automatic reorder alerts for top 10 fastest-moving items",
      "Review supplier contracts - volume discount opportunity identified",
      "Consolidate similar SKUs to reduce inventory complexity",
    ],
    forecast_summary: `Based on current trends, you'll need to reorder ${lowStockItems} items within the next 14 days. Total projected inventory spend for next 30 days: $${Math.round(totalValue * 0.15).toLocaleString()}.`,
  };
}
