import { z } from 'zod';

/**
 * AI Dispatch Zod Schemas
 *
 * Schema definitions for the Agentic AI Dispatch API.
 * Used for runtime validation and TypeScript type inference.
 */

/**
 * AI Dispatch Action Type schema
 */
export const aiDispatchActionTypeSchema = z.enum(['primary', 'secondary']);
export type AIDispatchActionType = z.infer<typeof aiDispatchActionTypeSchema>;

/**
 * AI Dispatch Action schema
 */
export const aiDispatchActionSchema = z.object({
  id: z.string(),
  type: aiDispatchActionTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export type AIDispatchAction = z.infer<typeof aiDispatchActionSchema>;

/**
 * AI Dispatch Suggestion Type schema
 */
export const aiDispatchSuggestionTypeSchema = z.enum([
  'assign',
  'reschedule',
  'route_optimize',
  'parts_order',
  'follow_up',
]);
export type AIDispatchSuggestionType = z.infer<typeof aiDispatchSuggestionTypeSchema>;

/**
 * Estimated Impact schema
 */
export const estimatedImpactSchema = z.object({
  time_saved_minutes: z.number().optional(),
  cost_saved: z.number().optional(),
  customer_satisfaction: z.string().optional(),
});

/**
 * AI Dispatch Suggestion schema
 */
export const aiDispatchSuggestionSchema = z.object({
  id: z.string(),
  type: aiDispatchSuggestionTypeSchema,
  confidence: z.number().min(0).max(1),
  title: z.string(),
  description: z.string(),
  reasoning: z.string(),
  work_order_id: z.string().optional(),
  technician_id: z.number().optional(),
  suggested_time: z.string().optional(),
  estimated_impact: estimatedImpactSchema,
  actions: z.array(aiDispatchActionSchema),
  created_at: z.string(),
  expires_at: z.string(),
});

export type AIDispatchSuggestion = z.infer<typeof aiDispatchSuggestionSchema>;

/**
 * AI Dispatch Suggestions Response schema
 */
export const aiDispatchSuggestionsResponseSchema = z.object({
  suggestions: z.array(aiDispatchSuggestionSchema),
});

/**
 * AI Dispatch Stats schema
 */
export const aiDispatchStatsSchema = z.object({
  suggestions_today: z.number(),
  suggestions_accepted: z.number(),
  auto_executions: z.number(),
  time_saved_minutes: z.number(),
  acceptance_rate: z.number().min(0).max(1),
});

export type AIDispatchStats = z.infer<typeof aiDispatchStatsSchema>;

/**
 * AI Dispatch History Entry schema
 */
export const aiDispatchHistorySchema = z.object({
  id: z.string(),
  prompt: z.string(),
  response: z.string(),
  suggestions_count: z.number(),
  executed: z.boolean(),
  created_at: z.string(),
  user_id: z.number(),
});

export type AIDispatchHistory = z.infer<typeof aiDispatchHistorySchema>;

/**
 * AI Dispatch Request schema
 */
export const aiDispatchRequestSchema = z.object({
  prompt: z.string().min(1),
  context: z.object({
    work_orders: z.array(z.object({
      id: z.string(),
      status: z.string(),
      priority: z.string(),
      service_type: z.string(),
      customer_name: z.string(),
      address: z.string(),
      scheduled_date: z.string().optional(),
      estimated_duration: z.number().optional(),
    })).optional(),
    technicians: z.array(z.object({
      id: z.number(),
      name: z.string(),
      skills: z.array(z.string()),
      current_location: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
      available_from: z.string().optional(),
      jobs_today: z.number(),
    })).optional(),
    constraints: z.object({
      max_drive_time_minutes: z.number().optional(),
      prefer_same_technician: z.boolean().optional(),
      respect_territories: z.boolean().optional(),
    }).optional(),
  }).optional(),
  auto_execute: z.boolean().optional(),
});

export type AIDispatchRequest = z.infer<typeof aiDispatchRequestSchema>;

/**
 * AI Dispatch Response schema
 */
export const aiDispatchResponseSchema = z.object({
  suggestions: z.array(aiDispatchSuggestionSchema),
  natural_response: z.string(),
  execution_result: z.object({
    success: z.boolean(),
    message: z.string(),
    changes_made: z.array(z.string()),
  }).optional(),
});

export type AIDispatchResponse = z.infer<typeof aiDispatchResponseSchema>;

/**
 * Execute Action Response schema
 */
export const executeActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type ExecuteActionResponse = z.infer<typeof executeActionResponseSchema>;

/**
 * Auto-assign Response schema
 */
export const autoAssignResponseSchema = z.object({
  assignments: z.array(z.object({
    work_order_id: z.string(),
    technician_id: z.number(),
    scheduled_time: z.string(),
  })),
  failures: z.array(z.object({
    work_order_id: z.string(),
    reason: z.string(),
  })),
});

export type AutoAssignResponse = z.infer<typeof autoAssignResponseSchema>;

/**
 * Route Optimization Response schema
 */
export const routeOptimizeResponseSchema = z.object({
  optimized_routes: z.array(z.object({
    technician_id: z.number(),
    route: z.array(z.object({
      work_order_id: z.string(),
      order: z.number(),
      eta: z.string(),
    })),
    total_distance_miles: z.number(),
    total_time_minutes: z.number(),
  })),
  savings: z.object({
    distance_saved_miles: z.number(),
    time_saved_minutes: z.number(),
  }),
});

export type RouteOptimizeResponse = z.infer<typeof routeOptimizeResponseSchema>;

/**
 * Work Order Predictions Response schema
 */
export const workOrderPredictionsSchema = z.object({
  estimated_duration_minutes: z.number(),
  predicted_parts: z.array(z.object({
    name: z.string(),
    probability: z.number(),
  })),
  similar_jobs: z.array(z.object({
    id: z.string(),
    solution: z.string(),
    success: z.boolean(),
  })),
  recommended_technician: z.object({
    id: z.number(),
    name: z.string(),
    reason: z.string(),
  }).nullable(),
});

export type WorkOrderPredictions = z.infer<typeof workOrderPredictionsSchema>;
