/**
 * AI Assistant Exports
 *
 * Central exports for the Unified AI Assistant system
 */

// Main hook exports
export {
  useAIAssistant,
  useAIQuery,
  useAIActions,
  useAIHealth,
  aiAssistantKeys
} from './useAIAssistant';

// Core orchestration
export { AIOrchestratorImpl } from './AIOrchestrator';
export { QueryProcessor } from './QueryProcessor';
export { ContextManager, useContextManager } from './ContextManager';
export { ActionOrchestrator } from './ActionOrchestrator';

// Base adapter system
export {
  BaseAIAdapterImpl,
  type BaseAIAdapter,
  type UnifiedAIResponse,
  type AdapterSchema,
  type AdapterExample
} from './adapters/BaseAIAdapter';

// Specific adapters
export {
  ActivityAIAdapter,
  validateActivityQuery,
  type ActivityQuery,
  type ActivityResult
} from './adapters/ActivityAIAdapter';

export {
  DispatchAIAdapter,
  validateDispatchQuery,
  type DispatchQuery,
  type DispatchResult
} from './adapters/DispatchAIAdapter';

export {
  TicketAIAdapter,
  validateTicketQuery,
  type TicketQuery,
  type TicketResult
} from './adapters/TicketAIAdapter';

export {
  SearchAIAdapter,
  validateSearchQuery,
  type SearchQuery,
  type SearchResult
} from './adapters/SearchAIAdapter';

// Re-export types for convenience
export type {
  AIContext,
  AIConversation,
  AIMessage,
  AIResponse,
  AIQuery,
  AIIntent,
  AIAction,
  ActionResult,
  AIDomain,
  AICapability,
  UserRole,
  HealthStatus,
  ActionableInsight,
  AISuggestion,
  AIPreferences,
  ExecutiveModeSettings
} from '@/api/types/aiAssistant';