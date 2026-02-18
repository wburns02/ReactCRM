import { z } from "zod";

/**
 * Anthropic Claude AI provider status
 */
export const anthropicStatusSchema = z.object({
  provider: z.string(),
  connected: z.boolean(),
  is_primary: z.boolean(),
  model: z.string().nullable().optional(),
  available_models: z.array(z.string()),
  features_enabled: z.record(z.string(), z.boolean()),
  connected_by: z.string().nullable().optional(),
  connected_at: z.string().nullable().optional(),
  last_used_at: z.string().nullable().optional(),
  api_key_configured: z.boolean(),
  api_key_source: z.string(),
});

export type AnthropicStatus = z.infer<typeof anthropicStatusSchema>;

/**
 * Test connection result
 */
export const anthropicTestResultSchema = z.object({
  success: z.boolean(),
  model: z.string(),
  response_time_ms: z.number(),
  message: z.string(),
});

export type AnthropicTestResult = z.infer<typeof anthropicTestResultSchema>;

/**
 * Usage summary
 */
export const usageByFeatureSchema = z.object({
  feature: z.string(),
  feature_label: z.string(),
  requests: z.number(),
  tokens: z.number(),
  cost_usd: z.number(),
});

export const usageByDaySchema = z.object({
  date: z.string(),
  requests: z.number(),
  tokens: z.number(),
  cost_usd: z.number(),
});

export const anthropicUsageSummarySchema = z.object({
  provider: z.string(),
  period: z.string(),
  total_requests: z.number(),
  total_tokens: z.number(),
  total_cost_usd: z.number(),
  by_feature: z.array(usageByFeatureSchema),
  by_day: z.array(usageByDaySchema),
});

export type AnthropicUsageSummary = z.infer<typeof anthropicUsageSummarySchema>;

/**
 * Feature labels for display
 */
export const AI_FEATURE_LABELS: Record<string, string> = {
  chat: "AI Chat",
  summarization: "Text Summarization",
  sentiment: "Sentiment Analysis",
  dispatch: "Dispatch Optimization",
  call_analysis: "Call Analysis",
  content_generation: "Content Generation",
};

/**
 * Available models
 */
export const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Fast, intelligent" },
] as const;
