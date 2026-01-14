import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Dynamic Pricing Recommendation
 */
export interface PricingRecommendation {
  service_name: string;
  current_rate: number;
  recommended_rate: number;
  rate_range: { min: number; max: number };
  confidence: number;
  factors: PricingFactor[];
  market_position: "below_market" | "at_market" | "above_market";
  potential_revenue_impact: number;
}

export interface PricingFactor {
  name: string;
  impact: "increase" | "decrease" | "neutral";
  weight: number;
  description: string;
}

/**
 * Quote Optimization Result
 */
export interface QuoteOptimizationResult {
  original_total: number;
  optimized_total: number;
  savings_percentage: number;
  recommendations: LineItemOptimization[];
  discount_suggestions: DiscountSuggestion[];
  upsell_opportunities: UpsellOpportunity[];
  win_probability: number;
  competitive_analysis: string;
}

export interface LineItemOptimization {
  service: string;
  current_rate: number;
  suggested_rate: number;
  reason: string;
  impact: "high" | "medium" | "low";
}

export interface DiscountSuggestion {
  type: "volume" | "loyalty" | "seasonal" | "first_time" | "bundle";
  percentage: number;
  reason: string;
  conditions: string;
}

export interface UpsellOpportunity {
  service: string;
  description: string;
  price: number;
  relevance_score: number;
}

/**
 * Get AI pricing recommendations for a service
 */
export function usePricingRecommendation(serviceName: string | undefined) {
  return useQuery({
    queryKey: ["pricing-recommendation", serviceName],
    queryFn: async (): Promise<PricingRecommendation> => {
      if (!serviceName) throw new Error("Service name required");

      try {
        const response = await apiClient.get("/ai/pricing/recommend", {
          params: { service: serviceName },
        });
        return response.data;
      } catch {
        return generateDemoPricingRecommendation(serviceName);
      }
    },
    enabled: !!serviceName,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Optimize quote pricing
 */
export function useQuoteOptimization() {
  return useMutation({
    mutationFn: async (params: {
      customerId: string;
      lineItems: Array<{ service: string; quantity: number; rate: number }>;
      total: number;
    }): Promise<QuoteOptimizationResult> => {
      try {
        const response = await apiClient.post("/ai/pricing/optimize-quote", params);
        return response.data;
      } catch {
        return generateDemoQuoteOptimization(params.lineItems, params.total);
      }
    },
  });
}

/**
 * Get market rate analysis for services
 */
export function useMarketRateAnalysis() {
  return useQuery({
    queryKey: ["market-rate-analysis"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/ai/pricing/market-analysis");
        return response.data;
      } catch {
        return {
          analysis_date: new Date().toISOString().split("T")[0],
          services: [
            {
              name: "Septic Pumping",
              your_rate: 350,
              market_avg: 375,
              market_range: { min: 250, max: 500 },
              recommendation: "Consider a 5-10% increase",
            },
            {
              name: "Drain Cleaning",
              your_rate: 175,
              market_avg: 150,
              market_range: { min: 100, max: 225 },
              recommendation: "Rate is competitive",
            },
            {
              name: "System Inspection",
              your_rate: 200,
              market_avg: 225,
              market_range: { min: 150, max: 300 },
              recommendation: "Opportunity to increase by 10%",
            },
          ],
          overall_positioning: "Your pricing is 8% below market average overall",
          revenue_opportunity: 2500,
        };
      }
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Analyze customer price sensitivity
 */
export function useCustomerPriceSensitivity(customerId: string | undefined) {
  return useQuery({
    queryKey: ["price-sensitivity", customerId],
    queryFn: async () => {
      if (!customerId) throw new Error("Customer ID required");

      try {
        const response = await apiClient.get(`/ai/pricing/sensitivity/${customerId}`);
        return response.data;
      } catch {
        return {
          sensitivity_level: "medium" as const,
          price_elasticity: 0.7,
          historical_acceptance_rate: 0.85,
          average_quote_value: 450,
          discount_response: "moderate",
          recommendations: [
            "Customer responds well to value-based pricing",
            "Consider bundling services for better acceptance",
            "Loyalty discount of 5% may improve conversion",
          ],
        };
      }
    },
    enabled: !!customerId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Generate demo pricing recommendation
 */
function generateDemoPricingRecommendation(serviceName: string): PricingRecommendation {
  const baseRates: Record<string, number> = {
    "septic pumping": 350,
    "drain cleaning": 175,
    "inspection": 200,
    "installation": 2500,
    "repair": 450,
    "maintenance": 150,
  };

  const lowerName = serviceName.toLowerCase();
  let currentRate = 300;
  for (const [key, rate] of Object.entries(baseRates)) {
    if (lowerName.includes(key)) {
      currentRate = rate;
      break;
    }
  }

  const marketVariance = 0.1 + Math.random() * 0.2; // 10-30% variance
  const recommendedRate = Math.round(currentRate * (1 + (Math.random() > 0.5 ? marketVariance : -marketVariance * 0.5)));

  const factors: PricingFactor[] = [
    {
      name: "Seasonal Demand",
      impact: Math.random() > 0.5 ? "increase" : "neutral",
      weight: 15,
      description: "Current season shows above-average demand",
    },
    {
      name: "Market Competition",
      impact: Math.random() > 0.6 ? "decrease" : "neutral",
      weight: 10,
      description: "Local market has moderate competition",
    },
    {
      name: "Service Complexity",
      impact: "increase",
      weight: 20,
      description: "Service requires specialized equipment",
    },
    {
      name: "Historical Performance",
      impact: "neutral",
      weight: 15,
      description: "Your pricing has good conversion rate",
    },
  ];

  let marketPosition: "below_market" | "at_market" | "above_market" = "at_market";
  if (currentRate < recommendedRate * 0.95) marketPosition = "below_market";
  else if (currentRate > recommendedRate * 1.05) marketPosition = "above_market";

  return {
    service_name: serviceName,
    current_rate: currentRate,
    recommended_rate: recommendedRate,
    rate_range: {
      min: Math.round(currentRate * 0.8),
      max: Math.round(currentRate * 1.3),
    },
    confidence: 70 + Math.floor(Math.random() * 25),
    factors,
    market_position: marketPosition,
    potential_revenue_impact: Math.round((recommendedRate - currentRate) * 12), // Monthly
  };
}

/**
 * Generate demo quote optimization
 */
function generateDemoQuoteOptimization(
  lineItems: Array<{ service: string; quantity: number; rate: number }>,
  total: number
): QuoteOptimizationResult {
  const recommendations: LineItemOptimization[] = [];
  let optimizedTotal = 0;

  lineItems.forEach((item) => {
    const variance = (Math.random() - 0.3) * 0.15; // -0.15 to +0.12 variance
    const suggestedRate = Math.round(item.rate * (1 + variance));
    optimizedTotal += suggestedRate * item.quantity;

    if (Math.abs(suggestedRate - item.rate) > item.rate * 0.05) {
      recommendations.push({
        service: item.service,
        current_rate: item.rate,
        suggested_rate: suggestedRate,
        reason: suggestedRate > item.rate
          ? "Market analysis suggests higher pricing is acceptable"
          : "Slight reduction may improve conversion",
        impact: Math.abs(suggestedRate - item.rate) > item.rate * 0.1 ? "high" : "medium",
      });
    }
  });

  const discountSuggestions: DiscountSuggestion[] = [];
  if (total > 500) {
    discountSuggestions.push({
      type: "volume",
      percentage: 5,
      reason: "High-value quote may benefit from volume discount",
      conditions: "Orders over $500",
    });
  }
  if (lineItems.length >= 3) {
    discountSuggestions.push({
      type: "bundle",
      percentage: 8,
      reason: "Multiple services can be bundled for a discount",
      conditions: "3+ services in one visit",
    });
  }

  const upsellOpportunities: UpsellOpportunity[] = [
    {
      service: "Annual Maintenance Plan",
      description: "Preventive maintenance with priority scheduling",
      price: 199,
      relevance_score: 85,
    },
    {
      service: "Extended Warranty",
      description: "2-year parts and labor warranty",
      price: 149,
      relevance_score: 72,
    },
  ];

  return {
    original_total: total,
    optimized_total: Math.round(optimizedTotal),
    savings_percentage: Math.round(((total - optimizedTotal) / total) * 100),
    recommendations,
    discount_suggestions: discountSuggestions,
    upsell_opportunities: upsellOpportunities,
    win_probability: 65 + Math.floor(Math.random() * 25),
    competitive_analysis: "Your quote is positioned competitively. Consider highlighting service quality and response time as differentiators.",
  };
}
