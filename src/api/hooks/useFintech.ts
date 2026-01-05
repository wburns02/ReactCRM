/**
 * Fintech API Hooks
 * Customer financing, technician payouts, cash flow intelligence
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  financingApplicationSchema,
  financingOfferSchema,
  technicianPayoutSchema,
  technicianEarningsSchema,
  cashFlowForecastSchema,
  arAgingSchema,
  revenueIntelligenceSchema,
} from '@/api/types/fintech';
import type {
  FinancingApplication,
  FinancingOffer,
  FinancingPrequalRequest,
  TechnicianPayout,
  TechnicianEarnings,
  InstantPayoutRequest,
  CashFlowForecast,
  CashFlowPeriod,
  ARAgingReport,
  RevenueIntelligence,
} from '@/api/types/fintech';
import { z } from 'zod';

// Query keys
export const fintechKeys = {
  financing: {
    all: ['financing'] as const,
    applications: (customerId?: string) =>
      [...fintechKeys.financing.all, 'applications', customerId] as const,
    application: (id: string) =>
      [...fintechKeys.financing.all, 'application', id] as const,
    offers: (amount: number) =>
      [...fintechKeys.financing.all, 'offers', amount] as const,
  },
  payouts: {
    all: ['payouts'] as const,
    technician: (technicianId: string) =>
      [...fintechKeys.payouts.all, 'technician', technicianId] as const,
    earnings: (technicianId: string, periodStart?: string) =>
      [...fintechKeys.payouts.all, 'earnings', technicianId, periodStart] as const,
  },
  cashFlow: {
    all: ['cashFlow'] as const,
    forecast: (period: CashFlowPeriod) =>
      [...fintechKeys.cashFlow.all, 'forecast', period] as const,
    arAging: () =>
      [...fintechKeys.cashFlow.all, 'ar-aging'] as const,
    revenue: (startDate?: string, endDate?: string) =>
      [...fintechKeys.cashFlow.all, 'revenue', startDate, endDate] as const,
  },
};

// ============================================
// Customer Financing Hooks
// ============================================

/**
 * Get available financing offers for an amount
 */
export function useFinancingOffers(amount: number) {
  return useQuery({
    queryKey: fintechKeys.financing.offers(amount),
    queryFn: async (): Promise<FinancingOffer[]> => {
      const { data } = await apiClient.get('/financing/offers', {
        params: { amount },
      });
      return z.array(financingOfferSchema).parse(data.offers || data);
    },
    enabled: amount > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get financing applications for a customer
 */
export function useFinancingApplications(customerId?: string) {
  return useQuery({
    queryKey: fintechKeys.financing.applications(customerId),
    queryFn: async (): Promise<FinancingApplication[]> => {
      const params = customerId ? { customer_id: customerId } : {};
      const { data } = await apiClient.get('/financing/applications', { params });
      return z.array(financingApplicationSchema).parse(data.applications || data);
    },
  });
}

/**
 * Get single financing application
 */
export function useFinancingApplication(id: string) {
  return useQuery({
    queryKey: fintechKeys.financing.application(id),
    queryFn: async (): Promise<FinancingApplication> => {
      const { data } = await apiClient.get(`/financing/applications/${id}`);
      return financingApplicationSchema.parse(data.application || data);
    },
    enabled: !!id,
  });
}

/**
 * Request financing prequalification
 */
export function useRequestFinancing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: FinancingPrequalRequest): Promise<FinancingApplication> => {
      const { data } = await apiClient.post('/financing/prequalify', request);
      return financingApplicationSchema.parse(data.application || data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: fintechKeys.financing.applications(data.customer_id)
      });
    },
  });
}

/**
 * Cancel financing application
 */
export function useCancelFinancing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string): Promise<void> => {
      await apiClient.post(`/financing/applications/${applicationId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fintechKeys.financing.all });
    },
  });
}

/**
 * Generate financing link to send to customer
 */
export function useGenerateFinancingLink() {
  return useMutation({
    mutationFn: async (params: {
      customer_id: string;
      amount: number;
      invoice_id?: string;
    }): Promise<{ link: string; expires_at: string }> => {
      const { data } = await apiClient.post('/financing/generate-link', params);
      return data;
    },
  });
}

// ============================================
// Technician Payout Hooks
// ============================================

/**
 * Get technician's current earnings
 */
export function useTechnicianEarnings(technicianId: string, periodStart?: string) {
  return useQuery({
    queryKey: fintechKeys.payouts.earnings(technicianId, periodStart),
    queryFn: async (): Promise<TechnicianEarnings> => {
      const params = periodStart ? { period_start: periodStart } : {};
      const { data } = await apiClient.get(
        `/payouts/technicians/${technicianId}/earnings`,
        { params }
      );
      return technicianEarningsSchema.parse(data.earnings || data);
    },
    enabled: !!technicianId,
  });
}

/**
 * Get technician's payout history
 */
export function useTechnicianPayouts(technicianId: string) {
  return useQuery({
    queryKey: fintechKeys.payouts.technician(technicianId),
    queryFn: async (): Promise<TechnicianPayout[]> => {
      const { data } = await apiClient.get(`/payouts/technicians/${technicianId}`);
      return z.array(technicianPayoutSchema).parse(data.payouts || data);
    },
    enabled: !!technicianId,
  });
}

/**
 * Request instant payout for technician
 */
export function useRequestInstantPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InstantPayoutRequest): Promise<TechnicianPayout> => {
      const { data } = await apiClient.post('/payouts/instant', request);
      return technicianPayoutSchema.parse(data.payout || data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: fintechKeys.payouts.technician(data.technician_id)
      });
      queryClient.invalidateQueries({
        queryKey: fintechKeys.payouts.earnings(data.technician_id)
      });
    },
  });
}

/**
 * Get instant payout fee estimate
 */
export function useInstantPayoutFee(amount: number) {
  return useQuery({
    queryKey: ['payouts', 'fee', amount],
    queryFn: async (): Promise<{ fee: number; net_amount: number }> => {
      const { data } = await apiClient.get('/payouts/instant/fee', {
        params: { amount },
      });
      return data;
    },
    enabled: amount > 0,
  });
}

// ============================================
// Cash Flow Intelligence Hooks
// ============================================

/**
 * Get cash flow forecast
 */
export function useCashFlowForecast(period: CashFlowPeriod = 'weekly') {
  return useQuery({
    queryKey: fintechKeys.cashFlow.forecast(period),
    queryFn: async (): Promise<CashFlowForecast> => {
      const { data } = await apiClient.get('/analytics/cash-flow/forecast', {
        params: { period },
      });
      return cashFlowForecastSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get accounts receivable aging report
 */
export function useARAgingReport() {
  return useQuery({
    queryKey: fintechKeys.cashFlow.arAging(),
    queryFn: async (): Promise<ARAgingReport> => {
      const { data } = await apiClient.get('/analytics/ar-aging');
      return arAgingSchema.parse(data);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get revenue intelligence
 */
export function useRevenueIntelligence(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: fintechKeys.cashFlow.revenue(startDate, endDate),
    queryFn: async (): Promise<RevenueIntelligence> => {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await apiClient.get('/analytics/revenue-intelligence', { params });
      return revenueIntelligenceSchema.parse(data);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Send payment reminder
 */
export function useSendPaymentReminder() {
  return useMutation({
    mutationFn: async (params: {
      customer_id: string;
      invoice_ids: string[];
      channel: 'email' | 'sms' | 'both';
    }): Promise<{ sent: boolean; message: string }> => {
      const { data } = await apiClient.post('/analytics/send-reminder', params);
      return data;
    },
  });
}

/**
 * Get collection recommendations
 */
export function useCollectionRecommendations() {
  return useQuery({
    queryKey: ['cashFlow', 'collection-recommendations'],
    queryFn: async (): Promise<{
      recommendations: {
        customer_id: string;
        customer_name: string;
        total_overdue: number;
        days_overdue: number;
        priority: 'high' | 'medium' | 'low';
        recommended_action: string;
        success_probability: number;
      }[];
    }> => {
      const { data } = await apiClient.get('/analytics/collection-recommendations');
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
