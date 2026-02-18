import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  anthropicStatusSchema,
  anthropicTestResultSchema,
  anthropicUsageSummarySchema,
  type AnthropicStatus,
  type AnthropicTestResult,
  type AnthropicUsageSummary,
} from "../types/anthropic.ts";

/**
 * Query keys for Anthropic integration
 */
export const anthropicKeys = {
  all: ["anthropic"] as const,
  status: () => [...anthropicKeys.all, "status"] as const,
  usage: (period: string) => [...anthropicKeys.all, "usage", period] as const,
};

/**
 * Get Anthropic connection status
 */
export function useAnthropicStatus() {
  return useQuery({
    queryKey: anthropicKeys.status(),
    queryFn: async (): Promise<AnthropicStatus> => {
      const { data } = await apiClient.get("/ai-providers/anthropic/status");
      return validateResponse(anthropicStatusSchema, data, "/ai-providers/anthropic/status");
    },
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Connect Anthropic with API key
 */
export function useAnthropicConnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      api_key: string;
      model?: string;
      set_as_primary?: boolean;
      features?: Record<string, boolean>;
    }) => {
      const { data } = await apiClient.post("/ai-providers/anthropic/connect", params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: anthropicKeys.all });
    },
  });
}

/**
 * Disconnect Anthropic
 */
export function useAnthropicDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/ai-providers/anthropic/disconnect");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: anthropicKeys.all });
    },
  });
}

/**
 * Test Anthropic connection
 */
export function useAnthropicTest() {
  return useMutation({
    mutationFn: async (): Promise<AnthropicTestResult> => {
      const { data } = await apiClient.post("/ai-providers/anthropic/test");
      return validateResponse(anthropicTestResultSchema, data, "/ai-providers/anthropic/test");
    },
  });
}

/**
 * Update Anthropic config (model, features, primary)
 */
export function useAnthropicUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      model?: string;
      is_primary?: boolean;
      features?: Record<string, boolean>;
    }) => {
      const { data } = await apiClient.patch("/ai-providers/anthropic/config", params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: anthropicKeys.all });
    },
  });
}

/**
 * Get Anthropic usage statistics
 */
export function useAnthropicUsage(period: string = "month") {
  return useQuery({
    queryKey: anthropicKeys.usage(period),
    queryFn: async (): Promise<AnthropicUsageSummary> => {
      const { data } = await apiClient.get(`/ai-providers/anthropic/usage?period=${period}`);
      return validateResponse(anthropicUsageSummarySchema, data, "/ai-providers/anthropic/usage");
    },
    staleTime: 60_000,
  });
}
