/**
 * AI Assistant Main Hook
 *
 * Primary interface for interacting with the Unified AI Assistant
 * Provides conversation management, query processing, and action execution
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { AIOrchestratorImpl } from './AIOrchestrator';
import { QueryProcessor } from './QueryProcessor';
import { ContextManager } from './ContextManager';
import { ActionOrchestrator } from './ActionOrchestrator';
import { ActivityAIAdapter } from './adapters/ActivityAIAdapter';
import type {
  AIContext,
  AIConversation,
  AIMessage,
  AIResponse,
  AIAction,
  ActionResult,
  HealthStatus,
  AIDomain
} from '@/api/types/aiAssistant';

// ===== HOOK INTERFACE =====

export interface UseAIAssistantReturn {
  // Core operations
  sendMessage: (message: string) => Promise<AIResponse>;
  executeAction: (action: AIAction) => Promise<ActionResult>;
  rollbackAction: (actionId: string) => Promise<ActionResult>;

  // Conversation management
  conversation: AIConversation | null;
  messages: AIMessage[];
  isLoading: boolean;
  error: Error | null;

  // Context and health
  context: AIContext | null;
  health: Record<AIDomain, HealthStatus> | null;
  isHealthy: boolean;

  // Streaming support
  streamMessage: (message: string) => AsyncGenerator<Partial<AIResponse>>;

  // Utility methods
  clearConversation: () => void;
  refreshContext: () => Promise<void>;
  getActionHistory: () => Map<string, ActionResult>;
}

// ===== MAIN HOOK IMPLEMENTATION =====

export function useAIAssistant(conversationId?: string): UseAIAssistantReturn {
  const queryClient = useQueryClient();
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Initialize core services
  const { orchestrator, contextManager, actionOrchestrator } = useMemo(() => {
    const contextManager = new ContextManager();
    const queryProcessor = new QueryProcessor();
    const actionOrchestrator = new ActionOrchestrator();

    const orchestrator = new AIOrchestratorImpl(
      queryProcessor,
      contextManager,
      actionOrchestrator
    );

    // Register AI adapters
    orchestrator.registerAdapter(new ActivityAIAdapter());
    // TODO: Register other adapters (DispatchAI, TicketAI, etc.)

    return { orchestrator, contextManager, actionOrchestrator };
  }, []);

  // Get current context
  const contextQuery = useQuery({
    queryKey: ['ai-context', conversationId],
    queryFn: async (): Promise<AIContext> => {
      // Get user ID from auth context - would integrate with your auth system
      const userId = 'current_user'; // Placeholder
      const sessionId = conversationId || 'new_session';

      return contextManager.aggregateContext(userId, sessionId);
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  // Get adapter health status
  const healthQuery = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => orchestrator.getAdapterHealth(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Check health every minute
  });

  // Get conversation messages
  const messagesQuery = useQuery({
    queryKey: ['ai-messages', conversationId],
    queryFn: async (): Promise<AIMessage[]> => {
      if (!conversationId) return [];

      // TODO: Implement conversation storage and retrieval
      // For now, return empty array
      return [];
    },
    enabled: !!conversationId,
    staleTime: 0, // Always fresh
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string): Promise<AIResponse> => {
      if (!contextQuery.data) {
        throw new Error('Context not available');
      }

      setError(null);

      try {
        // Process the message through the orchestrator
        const response = await orchestrator.processQuery(message, contextQuery.data);

        // Update conversation state
        await updateConversationWithMessage(message, response);

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ai-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', conversationId] });
    },
    onError: (error) => {
      console.error('AI Assistant message error:', error);
      setError(error instanceof Error ? error : new Error('Unknown error'));
    }
  });

  // Execute action mutation
  const executeActionMutation = useMutation({
    mutationFn: async (action: AIAction): Promise<ActionResult> => {
      if (!contextQuery.data) {
        throw new Error('Context not available');
      }

      setError(null);

      try {
        return await orchestrator.executeAction(action, contextQuery.data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Action execution failed');
        setError(error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate related data that might have been affected by the action
      queryClient.invalidateQueries({ queryKey: ['ai-context'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('AI Assistant action error:', error);
      setError(error instanceof Error ? error : new Error('Unknown error'));
    }
  });

  // Rollback action mutation
  const rollbackActionMutation = useMutation({
    mutationFn: async (actionId: string): Promise<ActionResult> => {
      setError(null);

      try {
        return await actionOrchestrator.rollbackAction(actionId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Rollback failed');
        setError(error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-context'] });
    },
    onError: (error) => {
      console.error('AI Assistant rollback error:', error);
      setError(error instanceof Error ? error : new Error('Unknown error'));
    }
  });

  // Helper function to update conversation
  const updateConversationWithMessage = useCallback(async (
    userMessage: string,
    response: AIResponse
  ): Promise<void> => {
    const now = new Date().toISOString();

    // Create user message
    const userMsg: AIMessage = {
      id: `msg_${Date.now()}_user`,
      conversationId: response.conversationId,
      role: 'user',
      content: userMessage,
      timestamp: now
    };

    // Create assistant message
    const assistantMsg: AIMessage = {
      id: response.id,
      conversationId: response.conversationId,
      role: 'assistant',
      content: typeof response.primaryResult === 'string'
        ? response.primaryResult
        : JSON.stringify(response.primaryResult),
      timestamp: response.timestamp,
      confidence: response.confidence,
      actions: response.suggestedActions,
      metadata: {
        suggestions: response.actionableInsights.map(insight => ({
          id: `suggestion_${Date.now()}`,
          type: 'quick_action',
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence
        })),
        context: {
          domains_involved: response.processing.domains_involved,
          processing_time: response.processing.duration_ms
        }
      }
    };

    // Update conversation state
    if (conversation) {
      setConversation({
        ...conversation,
        messages: [...conversation.messages, userMsg, assistantMsg],
        lastActiveAt: now
      });
    } else {
      // Create new conversation
      const newConversation: AIConversation = {
        id: response.conversationId,
        userId: contextQuery.data?.user.id || 'unknown',
        sessionId: response.conversationId,
        messages: [userMsg, assistantMsg],
        context: contextQuery.data!,
        settings: {
          autoSave: true,
          retentionDays: 30,
          shareWithTeam: false,
          encryptSensitiveData: true,
          auditLevel: 'standard'
        },
        createdAt: now,
        lastActiveAt: now,
        status: 'active'
      };
      setConversation(newConversation);
    }
  }, [conversation, contextQuery.data]);

  // Streaming message support
  const streamMessage = useCallback(async function* (message: string): AsyncGenerator<Partial<AIResponse>> {
    if (!contextQuery.data) {
      throw new Error('Context not available');
    }

    setError(null);

    try {
      for await (const chunk of orchestrator.streamQuery(message, contextQuery.data)) {
        yield chunk;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Streaming failed');
      setError(error);
      throw error;
    }
  }, [orchestrator, contextQuery.data]);

  // Utility methods
  const clearConversation = useCallback(() => {
    setConversation(null);
    setError(null);
    queryClient.removeQueries({ queryKey: ['ai-messages', conversationId] });
    queryClient.removeQueries({ queryKey: ['ai-conversation', conversationId] });
  }, [queryClient, conversationId]);

  const refreshContext = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['ai-context'] });
    await contextQuery.refetch();
  }, [queryClient, contextQuery]);

  const getActionHistory = useCallback((): Map<string, ActionResult> => {
    return actionOrchestrator.getExecutionHistory();
  }, [actionOrchestrator]);

  // Compute derived state
  const isLoading = sendMessageMutation.isPending ||
                   executeActionMutation.isPending ||
                   rollbackActionMutation.isPending;

  const isHealthy = healthQuery.data ?
    Object.values(healthQuery.data).some(health => health.status === 'healthy') :
    false;

  const messages = conversation?.messages || messagesQuery.data || [];

  return {
    // Core operations
    sendMessage: sendMessageMutation.mutateAsync,
    executeAction: executeActionMutation.mutateAsync,
    rollbackAction: rollbackActionMutation.mutateAsync,

    // Conversation state
    conversation,
    messages,
    isLoading,
    error,

    // Context and health
    context: contextQuery.data || null,
    health: healthQuery.data || null,
    isHealthy,

    // Streaming
    streamMessage,

    // Utilities
    clearConversation,
    refreshContext,
    getActionHistory
  };
}

// ===== CONVENIENCE HOOKS =====

/**
 * Quick hook for sending AI queries without full conversation management
 */
export function useAIQuery() {
  const { sendMessage, isLoading, error } = useAIAssistant();

  const query = useCallback(async (message: string): Promise<AIResponse> => {
    return sendMessage(message);
  }, [sendMessage]);

  return { query, isLoading, error };
}

/**
 * Hook for AI action execution with history tracking
 */
export function useAIActions() {
  const { executeAction, rollbackAction, getActionHistory, isLoading, error } = useAIAssistant();

  return {
    executeAction,
    rollbackAction,
    getActionHistory,
    isLoading,
    error
  };
}

/**
 * Hook for monitoring AI assistant health
 */
export function useAIHealth() {
  const { health, isHealthy } = useAIAssistant();

  const unhealthyDomains = useMemo(() => {
    if (!health) return [];
    return Object.entries(health)
      .filter(([_, status]) => status.status !== 'healthy')
      .map(([domain]) => domain as AIDomain);
  }, [health]);

  const averageResponseTime = useMemo(() => {
    if (!health) return 0;
    const responseTimes = Object.values(health).map(h => h.response_time_ms);
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }, [health]);

  return {
    health,
    isHealthy,
    unhealthyDomains,
    averageResponseTime
  };
}

// ===== QUERY KEYS =====

export const aiAssistantKeys = {
  all: ['ai-assistant'] as const,
  context: (conversationId?: string) => [...aiAssistantKeys.all, 'context', conversationId] as const,
  messages: (conversationId?: string) => [...aiAssistantKeys.all, 'messages', conversationId] as const,
  conversation: (conversationId?: string) => [...aiAssistantKeys.all, 'conversation', conversationId] as const,
  health: () => [...aiAssistantKeys.all, 'health'] as const,
};