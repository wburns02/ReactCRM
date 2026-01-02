import { describe, it, expect } from 'vitest';
import {
  aiDispatchActionSchema,
  aiDispatchSuggestionSchema,
  aiDispatchSuggestionsResponseSchema,
  aiDispatchStatsSchema,
  aiDispatchHistorySchema,
  aiDispatchRequestSchema,
  aiDispatchResponseSchema,
  executeActionResponseSchema,
  autoAssignResponseSchema,
  routeOptimizeResponseSchema,
  workOrderPredictionsSchema,
} from '../types/aiDispatch';

/**
 * Contract tests for AI Dispatch API
 *
 * Validates Zod schemas for the Agentic AI Dispatch feature.
 * Ensures type safety between frontend and backend.
 */

// Test fixtures
const validAction = {
  id: 'action-1',
  type: 'primary' as const,
  label: 'Schedule Job',
  description: 'Schedule this job for John at 9 AM',
  payload: { technician_id: 1, time: '09:00' },
};

const validSuggestion = {
  id: 'sugg-123',
  type: 'assign' as const,
  confidence: 0.92,
  title: 'Assign to John Smith',
  description: 'John is nearby and has the right skills',
  reasoning: 'Based on proximity (2 miles away) and HVAC certification',
  work_order_id: 'wo-456',
  technician_id: 1,
  suggested_time: '2026-01-02T09:00:00Z',
  estimated_impact: {
    time_saved_minutes: 30,
    cost_saved: 45,
    customer_satisfaction: 'high',
  },
  actions: [validAction],
  created_at: '2026-01-02T08:00:00Z',
  expires_at: '2026-01-02T12:00:00Z',
};

const validStats = {
  suggestions_today: 15,
  suggestions_accepted: 12,
  auto_executions: 5,
  time_saved_minutes: 120,
  acceptance_rate: 0.8,
};

const validHistory = {
  id: 'hist-1',
  prompt: 'Auto-assign all unscheduled jobs for this week',
  response: 'I assigned 5 jobs to available technicians based on skills and location.',
  suggestions_count: 5,
  executed: true,
  created_at: '2026-01-01T10:00:00Z',
  user_id: 1,
};

describe('AI Dispatch API Contracts', () => {
  describe('aiDispatchActionSchema', () => {
    it('validates a complete action', () => {
      const result = aiDispatchActionSchema.safeParse(validAction);
      expect(result.success).toBe(true);
    });

    it('validates action without optional description', () => {
      const action = { ...validAction, description: undefined };
      const result = aiDispatchActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('validates primary and secondary action types', () => {
      expect(aiDispatchActionSchema.safeParse({ ...validAction, type: 'primary' }).success).toBe(true);
      expect(aiDispatchActionSchema.safeParse({ ...validAction, type: 'secondary' }).success).toBe(true);
    });

    it('rejects invalid action type', () => {
      const result = aiDispatchActionSchema.safeParse({ ...validAction, type: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('aiDispatchSuggestionSchema', () => {
    it('validates a complete suggestion', () => {
      const result = aiDispatchSuggestionSchema.safeParse(validSuggestion);
      expect(result.success).toBe(true);
    });

    it('validates all suggestion types', () => {
      const types = ['assign', 'reschedule', 'route_optimize', 'parts_order', 'follow_up'];
      types.forEach((type) => {
        const result = aiDispatchSuggestionSchema.safeParse({ ...validSuggestion, type });
        expect(result.success).toBe(true);
      });
    });

    it('validates confidence range 0-1', () => {
      expect(aiDispatchSuggestionSchema.safeParse({ ...validSuggestion, confidence: 0 }).success).toBe(true);
      expect(aiDispatchSuggestionSchema.safeParse({ ...validSuggestion, confidence: 1 }).success).toBe(true);
      expect(aiDispatchSuggestionSchema.safeParse({ ...validSuggestion, confidence: 0.5 }).success).toBe(true);
    });

    it('rejects confidence outside 0-1', () => {
      expect(aiDispatchSuggestionSchema.safeParse({ ...validSuggestion, confidence: -0.1 }).success).toBe(false);
      expect(aiDispatchSuggestionSchema.safeParse({ ...validSuggestion, confidence: 1.1 }).success).toBe(false);
    });

    it('validates suggestion without optional fields', () => {
      const minimal = {
        id: 'sugg-1',
        type: 'assign',
        confidence: 0.8,
        title: 'Test',
        description: 'Test desc',
        reasoning: 'Test reason',
        estimated_impact: {},
        actions: [],
        created_at: '2026-01-01T00:00:00Z',
        expires_at: '2026-01-01T01:00:00Z',
      };
      const result = aiDispatchSuggestionSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe('aiDispatchSuggestionsResponseSchema', () => {
    it('validates response with multiple suggestions', () => {
      const response = {
        suggestions: [validSuggestion, { ...validSuggestion, id: 'sugg-2' }],
      };
      const result = aiDispatchSuggestionsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.suggestions).toHaveLength(2);
      }
    });

    it('validates empty suggestions array', () => {
      const result = aiDispatchSuggestionsResponseSchema.safeParse({ suggestions: [] });
      expect(result.success).toBe(true);
    });
  });

  describe('aiDispatchStatsSchema', () => {
    it('validates complete stats', () => {
      const result = aiDispatchStatsSchema.safeParse(validStats);
      expect(result.success).toBe(true);
    });

    it('validates zero values', () => {
      const zeroStats = {
        suggestions_today: 0,
        suggestions_accepted: 0,
        auto_executions: 0,
        time_saved_minutes: 0,
        acceptance_rate: 0,
      };
      const result = aiDispatchStatsSchema.safeParse(zeroStats);
      expect(result.success).toBe(true);
    });

    it('validates acceptance_rate boundaries', () => {
      expect(aiDispatchStatsSchema.safeParse({ ...validStats, acceptance_rate: 0 }).success).toBe(true);
      expect(aiDispatchStatsSchema.safeParse({ ...validStats, acceptance_rate: 1 }).success).toBe(true);
      expect(aiDispatchStatsSchema.safeParse({ ...validStats, acceptance_rate: 1.1 }).success).toBe(false);
    });
  });

  describe('aiDispatchHistorySchema', () => {
    it('validates complete history entry', () => {
      const result = aiDispatchHistorySchema.safeParse(validHistory);
      expect(result.success).toBe(true);
    });

    it('validates executed false', () => {
      const result = aiDispatchHistorySchema.safeParse({ ...validHistory, executed: false });
      expect(result.success).toBe(true);
    });
  });

  describe('aiDispatchRequestSchema', () => {
    it('validates minimal request with just prompt', () => {
      const result = aiDispatchRequestSchema.safeParse({ prompt: 'Optimize routes' });
      expect(result.success).toBe(true);
    });

    it('validates request with full context', () => {
      const request = {
        prompt: 'Auto-assign unscheduled jobs',
        context: {
          work_orders: [{
            id: 'wo-1',
            status: 'pending',
            priority: 'high',
            service_type: 'pumping',
            customer_name: 'John Doe',
            address: '123 Main St',
            scheduled_date: '2026-01-02',
            estimated_duration: 60,
          }],
          technicians: [{
            id: 1,
            name: 'John Smith',
            skills: ['pumping', 'inspection'],
            current_location: { lat: 30.2672, lng: -97.7431 },
            available_from: '2026-01-02T08:00:00Z',
            jobs_today: 3,
          }],
          constraints: {
            max_drive_time_minutes: 30,
            prefer_same_technician: true,
            respect_territories: true,
          },
        },
        auto_execute: true,
      };
      const result = aiDispatchRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('rejects empty prompt', () => {
      const result = aiDispatchRequestSchema.safeParse({ prompt: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('aiDispatchResponseSchema', () => {
    it('validates response with execution result', () => {
      const response = {
        suggestions: [validSuggestion],
        natural_response: 'I scheduled John for the Smith job at 9 AM.',
        execution_result: {
          success: true,
          message: 'Job scheduled successfully',
          changes_made: ['Assigned work order WO-123 to John Smith'],
        },
      };
      const result = aiDispatchResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('validates response without execution result', () => {
      const response = {
        suggestions: [validSuggestion],
        natural_response: 'Here are my suggestions.',
      };
      const result = aiDispatchResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('executeActionResponseSchema', () => {
    it('validates success response', () => {
      const result = executeActionResponseSchema.safeParse({
        success: true,
        message: 'Action executed successfully',
      });
      expect(result.success).toBe(true);
    });

    it('validates failure response', () => {
      const result = executeActionResponseSchema.safeParse({
        success: false,
        message: 'Technician is not available at this time',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('autoAssignResponseSchema', () => {
    it('validates response with assignments and failures', () => {
      const response = {
        assignments: [
          { work_order_id: 'wo-1', technician_id: 1, scheduled_time: '2026-01-02T09:00:00Z' },
          { work_order_id: 'wo-2', technician_id: 2, scheduled_time: '2026-01-02T10:00:00Z' },
        ],
        failures: [
          { work_order_id: 'wo-3', reason: 'No technician with required skills available' },
        ],
      };
      const result = autoAssignResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignments).toHaveLength(2);
        expect(result.data.failures).toHaveLength(1);
      }
    });

    it('validates all successful assignments', () => {
      const response = {
        assignments: [
          { work_order_id: 'wo-1', technician_id: 1, scheduled_time: '2026-01-02T09:00:00Z' },
        ],
        failures: [],
      };
      const result = autoAssignResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('routeOptimizeResponseSchema', () => {
    it('validates optimized routes response', () => {
      const response = {
        optimized_routes: [{
          technician_id: 1,
          route: [
            { work_order_id: 'wo-1', order: 1, eta: '09:00' },
            { work_order_id: 'wo-2', order: 2, eta: '10:30' },
            { work_order_id: 'wo-3', order: 3, eta: '12:00' },
          ],
          total_distance_miles: 45.5,
          total_time_minutes: 180,
        }],
        savings: {
          distance_saved_miles: 12.3,
          time_saved_minutes: 25,
        },
      };
      const result = routeOptimizeResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('workOrderPredictionsSchema', () => {
    it('validates predictions with recommended technician', () => {
      const predictions = {
        estimated_duration_minutes: 90,
        predicted_parts: [
          { name: 'Filter', probability: 0.85 },
          { name: 'Pump seal', probability: 0.45 },
        ],
        similar_jobs: [
          { id: 'wo-old-1', solution: 'Replaced pump seal', success: true },
          { id: 'wo-old-2', solution: 'Full system flush', success: true },
        ],
        recommended_technician: {
          id: 1,
          name: 'John Smith',
          reason: 'Has completed 15 similar jobs with 95% success rate',
        },
      };
      const result = workOrderPredictionsSchema.safeParse(predictions);
      expect(result.success).toBe(true);
    });

    it('validates predictions without recommended technician', () => {
      const predictions = {
        estimated_duration_minutes: 60,
        predicted_parts: [],
        similar_jobs: [],
        recommended_technician: null,
      };
      const result = workOrderPredictionsSchema.safeParse(predictions);
      expect(result.success).toBe(true);
    });
  });
});
