import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  PnLResponseSchema,
  CashFlowForecastSchema,
  ARAgingResponseSchema,
  MarginsByTypeResponseSchema,
  TechProfitabilityResponseSchema,
  ContractRevenueResponseSchema,
  type PnLResponse,
  type CashFlowForecast,
  type ARAgingResponse,
  type MarginsByTypeResponse,
  type TechProfitabilityResponse,
  type ContractRevenueResponse,
} from "@/api/types/financialAnalytics";

export function usePnL(period: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["financial", "pnl", period, startDate, endDate],
    queryFn: async (): Promise<PnLResponse> => {
      const params = new URLSearchParams({ period });
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const { data } = await apiClient.get(`/analytics/financial/pnl?${params}`);
      return PnLResponseSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useCashFlowForecast() {
  return useQuery({
    queryKey: ["financial", "cash-flow-forecast"],
    queryFn: async (): Promise<CashFlowForecast> => {
      const { data } = await apiClient.get("/analytics/financial/cash-flow-forecast");
      return CashFlowForecastSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useARaging() {
  return useQuery({
    queryKey: ["financial", "ar-aging"],
    queryFn: async (): Promise<ARAgingResponse> => {
      const { data } = await apiClient.get("/analytics/financial/ar-aging");
      return ARAgingResponseSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useMarginsByType() {
  return useQuery({
    queryKey: ["financial", "margins-by-type"],
    queryFn: async (): Promise<MarginsByTypeResponse> => {
      const { data } = await apiClient.get("/analytics/financial/margins-by-type");
      return MarginsByTypeResponseSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useTechProfitability() {
  return useQuery({
    queryKey: ["financial", "tech-profitability"],
    queryFn: async (): Promise<TechProfitabilityResponse> => {
      const { data } = await apiClient.get("/analytics/financial/tech-profitability");
      return TechProfitabilityResponseSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useContractRevenue() {
  return useQuery({
    queryKey: ["financial", "contract-revenue"],
    queryFn: async (): Promise<ContractRevenueResponse> => {
      const { data } = await apiClient.get("/analytics/financial/contract-revenue");
      return ContractRevenueResponseSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}
