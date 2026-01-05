import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Agentic AI Dispatch Types
 *
 * The 2026 differentiator: AI that *executes*, not just *suggests*
 */

export interface AIDispatchSuggestion {
  id: string;
  type: 'assign' | 'reschedule' | 'route_optimize' | 'parts_order' | 'follow_up';
  confidence: number; // 0-1
  title: string;
  description: string;
  reasoning: string;
  work_order_id?: string;
  technician_id?: number;
  suggested_time?: string;
  estimated_impact: {
    time_saved_minutes?: number;
    cost_saved?: number;
    customer_satisfaction?: string;
  };
  actions: AIDispatchAction[];
  created_at: string;
  expires_at: string;
}

export interface AIDispatchAction {
  id: string;
  type: 'primary' | 'secondary';
  label: string;
  description?: string;
  payload: Record<string, unknown>;
}

export interface AIDispatchContext {
  work_orders: {
    id: string;
    status: string;
    priority: string;
    service_type: string;
    customer_name: string;
    address: string;
    scheduled_date?: string;
    estimated_duration?: number;
  }[];
  technicians: {
    id: number;
    name: string;
    skills: string[];
    current_location?: { lat: number; lng: number };
    available_from?: string;
    jobs_today: number;
  }[];
  constraints?: {
    max_drive_time_minutes?: number;
    prefer_same_technician?: boolean;
    respect_territories?: boolean;
  };
}

export interface AIDispatchRequest {
  prompt: string;
  context?: Partial<AIDispatchContext>;
  auto_execute?: boolean;
}

export interface AIDispatchResponse {
  suggestions: AIDispatchSuggestion[];
  natural_response: string;
  execution_result?: {
    success: boolean;
    message: string;
    changes_made: string[];
  };
}

export interface AIDispatchHistory {
  id: string;
  prompt: string;
  response: string;
  suggestions_count: number;
  executed: boolean;
  created_at: string;
  user_id: number;
}

export interface AIDispatchStats {
  suggestions_today: number;
  suggestions_accepted: number;
  auto_executions: number;
  time_saved_minutes: number;
  acceptance_rate: number;
}

/**
 * Query keys for AI Dispatch
 */
export const aiDispatchKeys = {
  all: ['ai-dispatch'] as const,
  suggestions: () => [...aiDispatchKeys.all, 'suggestions'] as const,
  history: () => [...aiDispatchKeys.all, 'history'] as const,
  stats: () => [...aiDispatchKeys.all, 'stats'] as const,
};

/**
 * Get pending AI dispatch suggestions
 * Returns empty array if endpoint not implemented yet (404)
 *
 * NOTE: The /ai/dispatch/suggestions endpoint may not exist in all backend deployments.
 * This hook gracefully handles 404 by returning an empty array.
 * The browser console will still log the 404 as "Failed to load resource" - this is
 * expected browser behavior and not a bug. We minimize frequency with staleTime and retry:false.
 */
export function useAIDispatchSuggestions() {
  return useQuery({
    queryKey: aiDispatchKeys.suggestions(),
    queryFn: async (): Promise<AIDispatchSuggestion[]> => {
      try {
        const { data } = await apiClient.get('/ai/dispatch/suggestions');
        return data.suggestions || [];
      } catch (error: unknown) {
        // Return empty array if endpoint not implemented (404)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return [];
          }
        }
        throw error;
      }
    },
    // Disable retries for unimplemented endpoints to reduce console errors
    retry: false,
    // Longer stale time since endpoint may not exist
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Only refetch when window regains focus, not on interval
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Send a natural language prompt to the AI dispatch assistant
 */
export function useAIDispatchPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AIDispatchRequest): Promise<AIDispatchResponse> => {
      const { data } = await apiClient.post('/ai/dispatch/prompt', request);
      return data;
    },
    onSuccess: () => {
      // Refresh suggestions after prompt
      queryClient.invalidateQueries({ queryKey: aiDispatchKeys.suggestions() });
    },
  });
}

/**
 * Execute a suggested action
 */
export function useExecuteAIAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      suggestion_id: string;
      action_id: string;
    }): Promise<{ success: boolean; message: string }> => {
      const { data } = await apiClient.post(
        `/ai/dispatch/suggestions/${params.suggestion_id}/execute`,
        { action_id: params.action_id }
      );
      return data;
    },
    onSuccess: () => {
      // Refresh all related data
      queryClient.invalidateQueries({ queryKey: aiDispatchKeys.suggestions() });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

/**
 * Dismiss a suggestion
 */
export function useDismissAISuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      suggestion_id: string;
      reason?: string;
    }): Promise<void> => {
      await apiClient.post(
        `/ai/dispatch/suggestions/${params.suggestion_id}/dismiss`,
        { reason: params.reason }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiDispatchKeys.suggestions() });
    },
  });
}

/**
 * Get AI dispatch history
 * Returns empty array if endpoint not implemented yet (404)
 */
export function useAIDispatchHistory(limit?: number) {
  return useQuery({
    queryKey: aiDispatchKeys.history(),
    queryFn: async (): Promise<AIDispatchHistory[]> => {
      try {
        const params = limit ? `?limit=${limit}` : '';
        const { data } = await apiClient.get(`/ai/dispatch/history${params}`);
        return data.history || [];
      } catch (error: unknown) {
        // Return empty array if endpoint not implemented (404)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return [];
          }
        }
        throw error;
      }
    },
  });
}

/**
 * Default stats when endpoint not implemented
 */
const DEFAULT_AI_STATS: AIDispatchStats = {
  suggestions_today: 0,
  suggestions_accepted: 0,
  auto_executions: 0,
  time_saved_minutes: 0,
  acceptance_rate: 0,
};

/**
 * Get AI dispatch stats
 * Returns default stats if endpoint not implemented yet (404)
 */
export function useAIDispatchStats() {
  return useQuery({
    queryKey: aiDispatchKeys.stats(),
    queryFn: async (): Promise<AIDispatchStats> => {
      try {
        const { data } = await apiClient.get('/ai/dispatch/stats');
        return data;
      } catch (error: unknown) {
        // Return default stats if endpoint not implemented (404)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return DEFAULT_AI_STATS;
          }
        }
        throw error;
      }
    },
  });
}

/**
 * Auto-assign work orders using AI
 */
export function useAIAutoAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      work_order_ids: string[];
      constraints?: AIDispatchContext['constraints'];
    }): Promise<{
      assignments: { work_order_id: string; technician_id: number; scheduled_time: string }[];
      failures: { work_order_id: string; reason: string }[];
    }> => {
      const { data } = await apiClient.post('/ai/dispatch/auto-assign', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

/**
 * Optimize routes for a day
 */
export function useAIRouteOptimize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      date: string;
      technician_ids?: number[];
    }): Promise<{
      optimized_routes: {
        technician_id: number;
        route: { work_order_id: string; order: number; eta: string }[];
        total_distance_miles: number;
        total_time_minutes: number;
      }[];
      savings: {
        distance_saved_miles: number;
        time_saved_minutes: number;
      };
    }> => {
      const { data } = await apiClient.post('/ai/dispatch/optimize-routes', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

/**
 * Default predictions when endpoint not implemented
 */
const DEFAULT_PREDICTIONS = {
  estimated_duration_minutes: 0,
  predicted_parts: [],
  similar_jobs: [],
  recommended_technician: null,
};

/**
 * Get AI predictions for a work order
 * Returns default predictions if endpoint not implemented yet (404)
 */
export function useAIWorkOrderPredictions(workOrderId: string) {
  return useQuery({
    queryKey: [...aiDispatchKeys.all, 'predictions', workOrderId],
    queryFn: async (): Promise<{
      estimated_duration_minutes: number;
      predicted_parts: { name: string; probability: number }[];
      similar_jobs: { id: string; solution: string; success: boolean }[];
      recommended_technician: { id: number; name: string; reason: string } | null;
    }> => {
      try {
        const { data } = await apiClient.get(`/ai/dispatch/work-orders/${workOrderId}/predictions`);
        return data;
      } catch (error: unknown) {
        // Return default predictions if endpoint not implemented (404)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return DEFAULT_PREDICTIONS;
          }
        }
        throw error;
      }
    },
    enabled: !!workOrderId,
  });
}

/**
 * Extended technician info for dispatch display
 */
export interface TechnicianDispatchInfo {
  id: number;
  name: string;
  avatar_url?: string;
  skills: string[];
  current_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  distance_miles?: number;
  eta_minutes?: number;
  jobs_today: number;
  is_available: boolean;
  next_available_at?: string;
}

/**
 * Get technician availability and location for dispatch
 * Returns empty array if endpoint not implemented yet (404)
 */
export function useTechnicianDispatchInfo() {
  return useQuery({
    queryKey: [...aiDispatchKeys.all, 'technicians'],
    queryFn: async (): Promise<TechnicianDispatchInfo[]> => {
      try {
        const { data } = await apiClient.get('/ai/dispatch/technicians');
        return data.technicians || [];
      } catch (error: unknown) {
        // Return empty array if endpoint not implemented (404)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return [];
          }
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 30_000, // 30 seconds - technician locations change frequently
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get AI suggestions for a specific work order
 * Returns suggestions tailored to a particular job
 */
export function useAIWorkOrderSuggestions(workOrderId: string | undefined) {
  return useQuery({
    queryKey: [...aiDispatchKeys.all, 'work-order-suggestions', workOrderId],
    queryFn: async (): Promise<AIDispatchSuggestion[]> => {
      try {
        const { data } = await apiClient.get(`/ai/dispatch/work-orders/${workOrderId}/suggestions`);
        return data.suggestions || [];
      } catch (error: unknown) {
        // Return empty array if endpoint not implemented (404)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return [];
          }
        }
        throw error;
      }
    },
    enabled: !!workOrderId,
    retry: false,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Modify an existing suggestion (update parameters before executing)
 */
export function useModifyAISuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      suggestion_id: string;
      modifications: {
        technician_id?: number;
        suggested_time?: string;
        notes?: string;
      };
    }): Promise<AIDispatchSuggestion> => {
      const { data } = await apiClient.patch(
        `/ai/dispatch/suggestions/${params.suggestion_id}`,
        params.modifications
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiDispatchKeys.suggestions() });
    },
  });
}

/**
 * Request AI to analyze current schedule and generate new suggestions
 */
export function useRefreshAISuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ suggestions_generated: number }> => {
      const { data } = await apiClient.post('/ai/dispatch/analyze');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiDispatchKeys.suggestions() });
      queryClient.invalidateQueries({ queryKey: aiDispatchKeys.stats() });
    },
  });
}

/**
 * Executive Mode Settings
 *
 * Executive Mode enables autonomous execution of high-confidence AI suggestions.
 * When enabled, suggestions above the threshold are automatically executed without
 * human confirmation, making the AI truly "agentic".
 */
export interface ExecutiveModeSettings {
  /** Whether executive mode is enabled */
  enabled: boolean;
  /** Minimum confidence threshold for auto-execution (0.8-1.0 recommended) */
  confidenceThreshold: number;
  /** Suggestion types that can be auto-executed */
  allowedTypes: AIDispatchSuggestion['type'][];
  /** Maximum number of auto-executions per hour (safety limit) */
  maxAutoExecutionsPerHour: number;
  /** Show toast notification for each auto-execution */
  showNotifications: boolean;
  /** Require WebSocket connection for auto-execution */
  requireConnection: boolean;
}

const EXECUTIVE_MODE_STORAGE_KEY = 'ai-dispatch-executive-mode';

const DEFAULT_EXECUTIVE_SETTINGS: ExecutiveModeSettings = {
  enabled: false,
  confidenceThreshold: 0.9, // 90% confidence required
  allowedTypes: ['assign', 'reschedule', 'route_optimize'],
  maxAutoExecutionsPerHour: 10,
  showNotifications: true,
  requireConnection: true,
};

/**
 * Load executive mode settings from localStorage
 */
function loadExecutiveSettings(): ExecutiveModeSettings {
  try {
    const stored = localStorage.getItem(EXECUTIVE_MODE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_EXECUTIVE_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_EXECUTIVE_SETTINGS;
}

/**
 * Save executive mode settings to localStorage
 */
function saveExecutiveSettings(settings: ExecutiveModeSettings): void {
  try {
    localStorage.setItem(EXECUTIVE_MODE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for Executive Mode settings management
 *
 * Executive Mode turns the AI dispatch assistant into an autonomous agent
 * that can execute high-confidence suggestions without human approval.
 */
export function useExecutiveMode() {
  const [settings, setSettingsState] = useState<ExecutiveModeSettings>(loadExecutiveSettings);
  const [autoExecutionCount, setAutoExecutionCount] = useState(0);
  const lastResetRef = useRef<Date>(new Date());

  // Reset count every hour
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getTime() - lastResetRef.current.getTime() >= 3600000) {
        setAutoExecutionCount(0);
        lastResetRef.current = now;
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const setSettings = useCallback((update: Partial<ExecutiveModeSettings>) => {
    setSettingsState((prev) => {
      const newSettings = { ...prev, ...update };
      saveExecutiveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    setSettings({ enabled: !settings.enabled });
  }, [settings.enabled, setSettings]);

  const canAutoExecute = useCallback((suggestion: AIDispatchSuggestion): boolean => {
    if (!settings.enabled) return false;
    if (suggestion.confidence < settings.confidenceThreshold) return false;
    if (!settings.allowedTypes.includes(suggestion.type)) return false;
    if (autoExecutionCount >= settings.maxAutoExecutionsPerHour) return false;
    return true;
  }, [settings, autoExecutionCount]);

  const incrementAutoExecutionCount = useCallback(() => {
    setAutoExecutionCount((prev) => prev + 1);
  }, []);

  return {
    settings,
    setSettings,
    toggleEnabled,
    canAutoExecute,
    incrementAutoExecutionCount,
    autoExecutionCount,
    remainingAutoExecutions: settings.maxAutoExecutionsPerHour - autoExecutionCount,
  };
}
