import { z } from "zod";

export const pricingConditionSchema = z.object({
  field: z.enum(["service_type", "customer_type", "day_of_week", "time_of_day", "season", "distance", "tank_size", "urgency", "custom"]),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "in", "not_in", "between"]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]),
});

export const pricingAdjustmentSchema = z.object({
  type: z.enum(["percentage", "fixed_amount", "tiered"]),
  value: z.number().optional(),
  tiers: z.array(z.object({ min: z.number(), max: z.number().optional(), rate: z.number() })).optional(),
});

export const pricingRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["multiplier", "fixed", "tiered", "time_based"]),
  conditions: z.array(pricingConditionSchema),
  adjustment: pricingAdjustmentSchema,
  priority: z.number(),
  is_active: z.boolean(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const basePriceSchema = z.object({
  id: z.string(),
  service_type: z.string(),
  name: z.string(),
  base_price: z.number(),
  unit: z.enum(["flat", "per_gallon", "per_hour", "per_foot"]),
  min_charge: z.number().optional(),
  description: z.string().optional(),
  is_active: z.boolean(),
});

export const pricingStatsSchema = z.object({
  total_rules: z.number(),
  active_rules: z.number(),
  quotes_generated_today: z.number(),
  average_quote_value: z.number(),
  most_applied_rule: z.string(),
});
