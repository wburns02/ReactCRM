import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Dynamic Pricing Types
 */
export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  type: 'multiplier' | 'fixed' | 'tiered' | 'time_based';
  conditions: PricingCondition[];
  adjustment: PricingAdjustment;
  priority: number;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

export interface PricingCondition {
  field: 'service_type' | 'customer_type' | 'day_of_week' | 'time_of_day' | 'season' | 'distance' | 'tank_size' | 'urgency' | 'custom';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between';
  value: string | number | string[] | number[];
}

export interface PricingAdjustment {
  type: 'percentage' | 'fixed_amount' | 'tiered';
  value?: number; // For percentage or fixed
  tiers?: PricingTier[]; // For tiered pricing
}

export interface PricingTier {
  min: number;
  max?: number;
  rate: number;
}

export interface BasePrice {
  id: string;
  service_type: string;
  name: string;
  base_price: number;
  unit: 'flat' | 'per_gallon' | 'per_hour' | 'per_foot';
  min_charge?: number;
  description?: string;
  is_active: boolean;
}

export interface PriceQuote {
  service_type: string;
  base_price: number;
  adjustments: AppliedAdjustment[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  breakdown: QuoteBreakdown[];
  valid_until: string;
}

export interface AppliedAdjustment {
  rule_id: string;
  rule_name: string;
  type: string;
  amount: number;
  reason: string;
}

export interface QuoteBreakdown {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PricingRequest {
  service_type: string;
  customer_id?: number;
  customer_type?: string;
  property_address?: string;
  tank_size_gallons?: number;
  distance_miles?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  is_emergency?: boolean;
  custom_fields?: Record<string, unknown>;
}

export interface PricingStats {
  total_rules: number;
  active_rules: number;
  quotes_generated_today: number;
  average_quote_value: number;
  most_applied_rule: string;
}

/**
 * Query keys for Pricing
 */
export const pricingKeys = {
  all: ['pricing'] as const,
  rules: () => [...pricingKeys.all, 'rules'] as const,
  rule: (id: string) => [...pricingKeys.all, 'rule', id] as const,
  basePrices: () => [...pricingKeys.all, 'base-prices'] as const,
  basePrice: (id: string) => [...pricingKeys.all, 'base-price', id] as const,
  stats: () => [...pricingKeys.all, 'stats'] as const,
  quote: (params: PricingRequest) => [...pricingKeys.all, 'quote', params] as const,
};

/**
 * Get all pricing rules
 */
export function usePricingRules() {
  return useQuery({
    queryKey: pricingKeys.rules(),
    queryFn: async (): Promise<PricingRule[]> => {
      const { data } = await apiClient.get('/pricing/rules');
      return data.rules || [];
    },
  });
}

/**
 * Get single pricing rule
 */
export function usePricingRule(id: string) {
  return useQuery({
    queryKey: pricingKeys.rule(id),
    queryFn: async (): Promise<PricingRule> => {
      const { data } = await apiClient.get(`/pricing/rules/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create pricing rule
 */
export function useCreatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>): Promise<PricingRule> => {
      const { data } = await apiClient.post('/pricing/rules', rule);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.rules() });
    },
  });
}

/**
 * Update pricing rule
 */
export function useUpdatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...rule }: Partial<PricingRule> & { id: string }): Promise<PricingRule> => {
      const { data } = await apiClient.put(`/pricing/rules/${id}`, rule);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.rules() });
      queryClient.invalidateQueries({ queryKey: pricingKeys.rule(variables.id) });
    },
  });
}

/**
 * Delete pricing rule
 */
export function useDeletePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/pricing/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.rules() });
    },
  });
}

/**
 * Reorder pricing rules (by priority)
 */
export function useReorderPricingRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleIds: string[]): Promise<void> => {
      await apiClient.post('/pricing/rules/reorder', { rule_ids: ruleIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.rules() });
    },
  });
}

/**
 * Get base prices
 */
export function useBasePrices() {
  return useQuery({
    queryKey: pricingKeys.basePrices(),
    queryFn: async (): Promise<BasePrice[]> => {
      const { data } = await apiClient.get('/pricing/base-prices');
      return data.prices || [];
    },
  });
}

/**
 * Create base price
 */
export function useCreateBasePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (price: Omit<BasePrice, 'id'>): Promise<BasePrice> => {
      const { data } = await apiClient.post('/pricing/base-prices', price);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.basePrices() });
    },
  });
}

/**
 * Update base price
 */
export function useUpdateBasePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...price }: Partial<BasePrice> & { id: string }): Promise<BasePrice> => {
      const { data } = await apiClient.put(`/pricing/base-prices/${id}`, price);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.basePrices() });
    },
  });
}

/**
 * Delete base price
 */
export function useDeleteBasePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/pricing/base-prices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.basePrices() });
    },
  });
}

/**
 * Generate price quote
 */
export function useGenerateQuote() {
  return useMutation({
    mutationFn: async (request: PricingRequest): Promise<PriceQuote> => {
      const { data } = await apiClient.post('/pricing/quote', request);
      return data;
    },
  });
}

/**
 * Get pricing stats
 */
export function usePricingStats() {
  return useQuery({
    queryKey: pricingKeys.stats(),
    queryFn: async (): Promise<PricingStats> => {
      const { data } = await apiClient.get('/pricing/stats');
      return data;
    },
  });
}

/**
 * Test pricing rule
 */
export function useTestPricingRule() {
  return useMutation({
    mutationFn: async (params: {
      rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>;
      request: PricingRequest;
    }): Promise<{
      would_apply: boolean;
      adjustment_amount?: number;
      reason?: string;
    }> => {
      const { data } = await apiClient.post('/pricing/rules/test', params);
      return data;
    },
  });
}

/**
 * Get common pricing presets
 */
export function usePricingPresets() {
  return useQuery({
    queryKey: [...pricingKeys.all, 'presets'],
    queryFn: async (): Promise<{
      name: string;
      description: string;
      rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>;
    }[]> => {
      const { data } = await apiClient.get('/pricing/presets');
      return data.presets || [];
    },
  });
}
