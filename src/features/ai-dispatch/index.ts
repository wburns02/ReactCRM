/**
 * AI Dispatch Feature Module
 *
 * Agentic AI Dispatch Assistant - The 2026 differentiator.
 * AI that *executes*, not just *suggests*.
 *
 * Components:
 * - AIDispatchPanel: Main dispatch command panel (floating or embedded)
 * - AIDispatchAssistant: Original assistant component
 * - AIDispatchStats: Stats widget for dashboards
 * - DispatchSuggestionCard: Individual suggestion display
 * - AICommandInput: Natural language interface with voice support
 */

// Main components
export { AIDispatchPanel } from './components/AIDispatchPanel';
export { AIDispatchAssistant } from './components/AIDispatchAssistant';
export { AIDispatchStats } from './components/AIDispatchStats';

// Suggestion components
export {
  DispatchSuggestionCard,
  DispatchSuggestionCardSkeleton,
  DispatchSuggestionCardSkeletonList,
} from './components/DispatchSuggestionCard';

// Input components
export { AICommandInput } from './components/AICommandInput';

// Re-export hooks and types for convenience
export {
  // Hooks
  useAIDispatchSuggestions,
  useAIDispatchPrompt,
  useExecuteAIAction,
  useDismissAISuggestion,
  useAIDispatchHistory,
  useAIDispatchStats,
  useAIAutoAssign,
  useAIRouteOptimize,
  useAIWorkOrderPredictions,
  useTechnicianDispatchInfo,
  useAIWorkOrderSuggestions,
  useModifyAISuggestion,
  useRefreshAISuggestions,
  // Query keys
  aiDispatchKeys,
  // Types
  type AIDispatchSuggestion,
  type AIDispatchAction,
  type AIDispatchContext,
  type AIDispatchRequest,
  type AIDispatchResponse,
  type AIDispatchHistory,
  type AIDispatchStats as AIDispatchStatsType,
  type TechnicianDispatchInfo,
} from '@/api/hooks/useAIDispatch';
