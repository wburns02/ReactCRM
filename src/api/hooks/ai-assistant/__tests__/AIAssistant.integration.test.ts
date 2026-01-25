/**
 * AI Assistant Integration Tests
 *
 * Tests the complete AI Assistant system integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ActivityAIAdapter } from '../adapters/ActivityAIAdapter';
import { QueryProcessor } from '../QueryProcessor';
import { ContextManager } from '../ContextManager';
import { ActionOrchestrator } from '../ActionOrchestrator';
import type { AIContext } from '@/api/types/aiAssistant';

// Mock API client
vi.mock('../../../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/customers/123' })
}));

// Test wrapper with QueryClient
function _createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return queryClient;
}

describe('AI Assistant Integration', () => {
  let mockContext: AIContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock context
    mockContext = {
      user: {
        id: 'test_user',
        role: 'manager',
        permissions: ['read:customers', 'write:tickets', 'execute:ai_actions'],
        preferences: {
          communicationStyle: 'detailed',
          notificationFrequency: 'immediate',
          autoExecuteThreshold: 0.85,
          preferredResponseFormat: 'structured',
          voiceEnabled: true,
          proactiveSuggestions: true,
          executiveMode: {
            enabled: false,
            confidenceThreshold: 0.9,
            allowedTypes: ['create', 'update'],
            maxAutoExecutionsPerHour: 10,
            showNotifications: true,
            requireConnection: true
          }
        }
      },
      app: {
        currentPage: '/customers/123',
        currentEntity: {
          type: 'customer',
          id: '123',
          data: { name: 'Test Customer' }
        },
        recentActivity: [],
        navigationHistory: [],
        viewport: {
          width: 1920,
          height: 1080,
          isMobile: false,
          isTablet: false,
          orientation: 'landscape'
        }
      },
      domain: {
        customers: [{
          id: '123',
          name: 'Test Customer',
          tier: 'standard',
          risk_level: 'low',
          recent_interactions: 5
        }]
      },
      session: {
        conversationHistory: [],
        activeIntents: [],
        pendingActions: [],
        executedActions: []
      }
    };
  });

  describe('Activity AI Adapter', () => {
    it('should process customer activity summary query', async () => {
      const adapter = new ActivityAIAdapter();

      const query = {
        type: 'summary' as const,
        customerId: '123'
      };

      // Mock successful API response
      const mockApiResponse = {
        summary: 'Customer has been actively engaged',
        key_points: ['Regular communication', 'Payment up to date'],
        action_items: ['Follow up on service'],
        sentiment: 'positive' as const,
        topics: ['Service'],
        interaction_quality: 8
      };

      vi.mocked(import('../../../client')).apiClient.get.mockResolvedValue({
        data: mockApiResponse
      });

      const result = await adapter.query(query, mockContext);

      expect(result.domain).toBe('customer-activity');
      expect(result.result.primary).toMatchObject(mockApiResponse);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle API failures gracefully with demo data', async () => {
      const adapter = new ActivityAIAdapter();

      const query = {
        type: 'summary' as const,
        customerId: '123'
      };

      // Mock API failure
      vi.mocked(import('../../../client')).apiClient.get
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValue({ data: { items: [] } }); // Activities endpoint (regex paths use forward slashes)

      const result = await adapter.query(query, mockContext);

      expect(result.domain).toBe('customer-activity');
      expect(result.result.primary.summary).toContain('No recent activity');
      expect(result.result.metadata?.demo_data_used).toBe(true);
    });

    it('should validate query parameters correctly', async () => {
      const adapter = new ActivityAIAdapter();

      const invalidQuery = {
        type: 'summary' as const
        // Missing customerId
      };

      await expect(adapter.query(invalidQuery, mockContext))
        .rejects.toThrow('Customer ID required');
    });
  });

  describe('Query Processor', () => {
    it('should classify intents correctly', async () => {
      const processor = new QueryProcessor();

      const testCases = [
        {
          query: 'Show me John Smith\'s activity summary',
          expectedType: 'query' as const,
          expectedOperation: 'search'
        },
        {
          query: 'Create a ticket for heating issue',
          expectedType: 'action' as const,
          expectedOperation: 'create'
        },
        {
          query: 'What customers need follow-up calls?',
          expectedType: 'query' as const,
          expectedOperation: 'search'
        }
      ];

      for (const testCase of testCases) {
        const result = await processor.processNaturalLanguage(testCase.query, mockContext);

        expect(result.intent.type).toBe(testCase.expectedType);
        expect(result.intent.operation).toBe(testCase.expectedOperation);
        expect(result.naturalLanguageQuery).toBe(testCase.query);
      }
    });

    it('should extract entities from queries', () => {
      const processor = new QueryProcessor();

      const query = 'Show me customer John Smith\'s work order #WO123 scheduled for today';
      const entities = processor.extractEntities(query);

      const entityTypes = entities.map(e => e.type);
      expect(entityTypes).toContain('customer');
      expect(entityTypes).toContain('work_order');
      expect(entityTypes).toContain('date');
    });
  });

  describe('Context Manager', () => {
    it('should aggregate context from multiple sources', async () => {
      const contextManager = new ContextManager();

      const context = await contextManager.aggregateContext('test_user', 'test_session');

      expect(context.user.id).toBe('test_user');
      expect(context.app.currentPage).toBeDefined();
      expect(context.session).toBeDefined();
    });

    it('should cache context appropriately', async () => {
      const contextManager = new ContextManager();

      // First call
      const context1 = await contextManager.aggregateContext('test_user', 'test_session');

      // Second call (should use cache)
      const context2 = await contextManager.aggregateContext('test_user', 'test_session');

      expect(context1).toBe(context2); // Should be same object from cache
    });
  });

  describe('Action Orchestrator', () => {
    it('should validate actions before execution', async () => {
      const orchestrator = new ActionOrchestrator();

      const invalidAction = {
        id: 'test_action',
        type: 'create' as const,
        domain: 'tickets' as const,
        operation: 'create_ticket',
        payload: {
          // Missing required customerId
          description: 'Test ticket'
        },
        requirements: [],
        status: 'pending' as const,
        confidence: 0.8
      };

      const result = await orchestrator.executeAction(invalidAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Customer ID required');
    });

    it('should execute valid actions successfully', async () => {
      const orchestrator = new ActionOrchestrator();

      const validAction = {
        id: 'test_action',
        type: 'create' as const,
        domain: 'tickets' as const,
        operation: 'create_ticket',
        payload: {
          customerId: '123',
          description: 'Test ticket for heating issue',
          priority: 'medium'
        },
        requirements: [{
          type: 'permission' as const,
          description: 'User can create tickets',
          satisfied: true
        }],
        status: 'pending' as const,
        confidence: 0.9
      };

      // Mock successful API response
      vi.mocked(import('../../../client')).apiClient.post.mockResolvedValue({
        data: { id: 'ticket_456', status: 'created' }
      });

      const result = await orchestrator.executeAction(validAction, mockContext);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.affectedEntities).toHaveLength(1);
      expect(result.affectedEntities[0].type).toBe('customer');
    });
  });

  describe('End-to-End AI Assistant', () => {
    it('should integrate all components correctly', async () => {
      const queryProcessor = new QueryProcessor();
      const _contextManager = new ContextManager();
      const _actionOrchestrator = new ActionOrchestrator();

      // Test query processing
      const query = await queryProcessor.processNaturalLanguage(
        'Show me customer activity summary',
        mockContext
      );

      expect(query.intent.type).toBe('query');
      expect(query.naturalLanguageQuery).toBe('Show me customer activity summary');
    });

    it('should handle ActivityAI adapter integration', async () => {
      const adapter = new ActivityAIAdapter();

      // Test health check
      const health = await adapter.healthCheck();
      expect(health.status).toBeDefined();

      // Test schema
      const schema = adapter.getSchema();
      expect(schema.query_schema).toBeDefined();
      expect(schema.response_schema).toBeDefined();

      // Test examples
      const examples = adapter.getExamples();
      expect(examples.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      const adapter = new ActivityAIAdapter();

      const invalidQuery = {
        type: 'invalid_type' as any
      };

      await expect(adapter.query(invalidQuery, mockContext))
        .rejects.toThrow('Unsupported ActivityAI query type');
    });

    it('should handle adapter health check failures', async () => {
      const adapter = new ActivityAIAdapter();

      // Mock adapter failure by overriding performHealthCheck
      const originalPerformHealthCheck = adapter['performHealthCheck'];
      adapter['performHealthCheck'] = vi.fn().mockRejectedValue(new Error('Adapter offline'));

      const health = await adapter.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.issues).toContain('Adapter offline');

      // Restore original method
      adapter['performHealthCheck'] = originalPerformHealthCheck;
    });
  });
});