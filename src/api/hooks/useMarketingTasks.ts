/**
 * Marketing Tasks Hooks
 *
 * React Query hooks for the Marketing Tasks Dashboard.
 * Fetches data from the ecbtx-seo-service Docker containers.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import type {
  MarketingTasksResponse,
  ServiceHealth,
  MarketingAlert,
  ScheduledTask,
  MarketingTaskSite,
  MarketingMetrics,
} from "../types/marketingTasks.ts";

// Query Keys
export const marketingTasksKeys = {
  all: ["marketing-tasks"] as const,
  dashboard: () => [...marketingTasksKeys.all, "dashboard"] as const,
  services: () => [...marketingTasksKeys.all, "services"] as const,
  service: (name: string) =>
    [...marketingTasksKeys.all, "services", name] as const,
  alerts: () => [...marketingTasksKeys.all, "alerts"] as const,
  scheduledTasks: () => [...marketingTasksKeys.all, "scheduled"] as const,
  sites: () => [...marketingTasksKeys.all, "sites"] as const,
  metrics: () => [...marketingTasksKeys.all, "metrics"] as const,
};

/**
 * Get Marketing Tasks Dashboard Data
 * Main hook that fetches all dashboard data including services, alerts, and metrics
 */
export function useMarketingTasks() {
  return useQuery({
    queryKey: marketingTasksKeys.dashboard(),
    queryFn: async (): Promise<MarketingTasksResponse> => {
      const response =
        await apiClient.get<MarketingTasksResponse>("/marketing-hub/tasks");
      return response.data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

/**
 * Get Service Health Status for all services
 */
export function useServiceHealth() {
  return useQuery({
    queryKey: marketingTasksKeys.services(),
    queryFn: async (): Promise<ServiceHealth[]> => {
      const response = await apiClient.get<ServiceHealth[]>(
        "/marketing-hub/tasks/services",
      );
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get health status of a specific service
 */
export function useSingleServiceHealth(serviceName: string) {
  return useQuery({
    queryKey: marketingTasksKeys.service(serviceName),
    queryFn: async (): Promise<ServiceHealth> => {
      const response = await apiClient.get<ServiceHealth>(
        `/marketing-hub/tasks/services/${serviceName}`,
      );
      return response.data;
    },
    enabled: !!serviceName,
  });
}

/**
 * Get marketing alerts
 */
export function useMarketingAlerts() {
  return useQuery({
    queryKey: marketingTasksKeys.alerts(),
    queryFn: async (): Promise<MarketingAlert[]> => {
      const response = await apiClient.get<MarketingAlert[]>(
        "/marketing-hub/tasks/alerts",
      );
      return response.data;
    },
    refetchInterval: 60000,
  });
}

/**
 * Get scheduled tasks
 */
export function useScheduledTasks() {
  return useQuery({
    queryKey: marketingTasksKeys.scheduledTasks(),
    queryFn: async (): Promise<ScheduledTask[]> => {
      const response = await apiClient.get<ScheduledTask[]>(
        "/marketing-hub/tasks/scheduled",
      );
      return response.data;
    },
  });
}

/**
 * Get configured sites
 */
export function useMarketingSites() {
  return useQuery({
    queryKey: marketingTasksKeys.sites(),
    queryFn: async (): Promise<MarketingTaskSite[]> => {
      const response = await apiClient.get<MarketingTaskSite[]>(
        "/marketing-hub/tasks/sites",
      );
      return response.data;
    },
  });
}

/**
 * Get marketing metrics
 */
export function useMarketingMetrics() {
  return useQuery({
    queryKey: marketingTasksKeys.metrics(),
    queryFn: async (): Promise<MarketingMetrics> => {
      const response = await apiClient.get<MarketingMetrics>(
        "/marketing-hub/tasks/metrics",
      );
      return response.data;
    },
    refetchInterval: 60000,
  });
}

// Mutations

/**
 * Trigger a health check for a specific service
 */
export function useTriggerHealthCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceName: string): Promise<ServiceHealth> => {
      const response = await apiClient.post<ServiceHealth>(
        `/marketing-hub/tasks/services/${serviceName}/check`,
      );
      return response.data;
    },
    onSuccess: (_data, serviceName) => {
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.service(serviceName),
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.services(),
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}

/**
 * Resolve an alert
 */
export function useResolveMarketingAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      alertId: string,
    ): Promise<{ success: boolean; message: string }> => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/marketing-hub/tasks/alerts/${alertId}/resolve`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.alerts(),
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}

/**
 * Trigger a scheduled task manually
 */
export function useTriggerScheduledTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      taskId: string,
    ): Promise<{ success: boolean; message: string; data?: unknown }> => {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data?: unknown;
      }>(`/marketing-hub/tasks/scheduled/${taskId}/run`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.scheduledTasks(),
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}

// =============================================================================
// CONTENT GENERATOR HOOKS (World-Class AI Content Generation)
// =============================================================================

// Types
export type ContentType = "blog" | "faq" | "gbp_post" | "service_description";
export type ToneType = "professional" | "friendly" | "casual" | "authoritative" | "educational";
export type AudienceType = "homeowners" | "businesses" | "property_managers" | "contractors" | "general";
export type AIModelType = "auto" | "openai/gpt-4o" | "openai/gpt-4o-mini" | "anthropic/claude-3.5-sonnet" | "local/qwen2.5:7b" | "local/llama3.1:70b";

interface AIModelInfo {
  id: string;
  display_name: string;
  description: string;
  provider: string;
  speed: "fast" | "medium" | "slow";
  quality: "good" | "great" | "excellent";
  cost: "free" | "low" | "medium" | "high";
  available: boolean;
  recommended_for: string[];
}

interface AIModelHealthResponse {
  models: AIModelInfo[];
  recommended_model: string;
  local_available: boolean;
  cloud_available: boolean;
}

interface ContentIdea {
  id: string;
  topic: string;
  description: string;
  suggested_type: ContentType;
  keywords: string[];
  estimated_word_count: number;
  difficulty: "easy" | "medium" | "hard";
  seasonality: string | null;
  hook: string;
}

interface IdeaGenerateRequest {
  keywords: string[];
  content_type?: ContentType;
  audience?: AudienceType;
  count?: number;
  seasonality?: string;
  model?: AIModelType;
}

interface IdeaGenerateResponse {
  success: boolean;
  ideas: ContentIdea[];
  model_used: string;
  generation_time_ms: number;
  demo_mode: boolean;
}

interface GeneratedContent {
  id: string;
  title: string;
  content: string;
  content_type: ContentType;
  meta_description: string | null;
  model_used: string;
  generation_time_ms: number;
  word_count: number;
  seo_score: number | null;
  readability_score: number | null;
  keyword_density: Record<string, number> | null;
}

interface ContentGenerateRequest {
  content_type: ContentType;
  topic: string;
  tone?: ToneType;
  audience?: AudienceType;
  target_keywords?: string[];
  word_count?: number;
  model?: AIModelType;
  include_cta?: boolean;
  include_meta?: boolean;
}

interface ContentGenerateResponse {
  success: boolean;
  content: GeneratedContent;
  demo_mode: boolean;
  message: string;
}

interface ContentVariant {
  variant_label: string;
  title: string;
  content: string;
  hook_style: string;
  seo_score: number | null;
  readability_score: number | null;
}

interface VariantGenerateRequest {
  content_type: ContentType;
  topic: string;
  tone?: ToneType;
  audience?: AudienceType;
  target_keywords?: string[];
  word_count?: number;
  model?: AIModelType;
  variant_count?: number;
  variation_style?: "tone" | "structure" | "hook" | "mixed";
}

interface VariantGenerateResponse {
  success: boolean;
  variant_group_id: string;
  content_type: ContentType;
  topic: string;
  variants: ContentVariant[];
  model_used: string;
  total_generation_time_ms: number;
  demo_mode: boolean;
}

interface SEOAnalyzeRequest {
  content: string;
  target_keywords?: string[];
  content_type?: ContentType;
}

interface KeywordAnalysis {
  keyword: string;
  count: number;
  density: number;
  in_title: boolean;
  in_first_paragraph: boolean;
  in_headings: boolean;
  optimal: boolean;
}

interface SEOAnalyzeResponse {
  success: boolean;
  overall_score: number;
  keyword_analysis: KeywordAnalysis[];
  missing_keywords: string[];
  has_headings: boolean;
  heading_count: number;
  suggestions: string[];
  suggested_meta_description: string | null;
}

interface ReadabilityAnalyzeRequest {
  content: string;
}

interface ReadabilityAnalyzeResponse {
  success: boolean;
  flesch_reading_ease: number;
  flesch_kincaid_grade: number;
  word_count: number;
  sentence_count: number;
  avg_words_per_sentence: number;
  avg_syllables_per_word: number;
  reading_level: string;
  target_audience: string;
  suggestions: string[];
}

// Query Keys
export const contentGeneratorKeys = {
  all: ["content-generator"] as const,
  models: () => [...contentGeneratorKeys.all, "models"] as const,
  modelsHealth: () => [...contentGeneratorKeys.all, "models", "health"] as const,
  ideas: () => [...contentGeneratorKeys.all, "ideas"] as const,
  library: (filters?: Record<string, unknown>) => [...contentGeneratorKeys.all, "library", filters] as const,
};

/**
 * Get available AI models
 */
export function useAIModels() {
  return useQuery({
    queryKey: contentGeneratorKeys.models(),
    queryFn: async (): Promise<AIModelInfo[]> => {
      const response = await apiClient.get<AIModelInfo[]>("/content-generator/models");
      return response.data;
    },
    staleTime: 60000,
  });
}

/**
 * Get AI model health status
 */
export function useAIModelHealth() {
  return useQuery({
    queryKey: contentGeneratorKeys.modelsHealth(),
    queryFn: async (): Promise<AIModelHealthResponse> => {
      const response = await apiClient.get<AIModelHealthResponse>("/content-generator/models/health");
      return response.data;
    },
    staleTime: 30000,
  });
}

/**
 * Generate content ideas using AI
 */
export function useGenerateIdeas() {
  return useMutation({
    mutationFn: async (request: IdeaGenerateRequest): Promise<IdeaGenerateResponse> => {
      const response = await apiClient.post<IdeaGenerateResponse>(
        "/content-generator/ideas/generate",
        request,
      );
      return response.data;
    },
  });
}

/**
 * Generate AI content (new world-class endpoint)
 */
export function useGenerateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ContentGenerateRequest): Promise<ContentGenerateResponse> => {
      const response = await apiClient.post<ContentGenerateResponse>(
        "/content-generator/generate",
        request,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["marketing", "content"],
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}

/**
 * Generate multiple content variants for A/B testing
 */
export function useGenerateVariants() {
  return useMutation({
    mutationFn: async (request: VariantGenerateRequest): Promise<VariantGenerateResponse> => {
      const response = await apiClient.post<VariantGenerateResponse>(
        "/content-generator/generate/variants",
        request,
      );
      return response.data;
    },
  });
}

/**
 * Analyze content for SEO
 */
export function useAnalyzeSEO() {
  return useMutation({
    mutationFn: async (request: SEOAnalyzeRequest): Promise<SEOAnalyzeResponse> => {
      const response = await apiClient.post<SEOAnalyzeResponse>(
        "/content-generator/analyze/seo",
        request,
      );
      return response.data;
    },
  });
}

/**
 * Analyze content readability
 */
export function useAnalyzeReadability() {
  return useMutation({
    mutationFn: async (request: ReadabilityAnalyzeRequest): Promise<ReadabilityAnalyzeResponse> => {
      const response = await apiClient.post<ReadabilityAnalyzeResponse>(
        "/content-generator/analyze/readability",
        request,
      );
      return response.data;
    },
  });
}

// Legacy hook for backwards compatibility (maps to new endpoint)
interface LegacyContentGenerateRequest {
  contentType: ContentType;
  topic: string;
  targetLength?: number;
  tone?: string;
}

interface LegacyContentGenerateResponse {
  success: boolean;
  content: string;
  contentType: string;
  topic: string;
  demoMode: boolean;
  message: string;
}

/**
 * @deprecated Use useGenerateContent instead
 */
export function useLegacyGenerateContent() {
  const generateMutation = useGenerateContent();

  return useMutation({
    mutationFn: async (request: LegacyContentGenerateRequest): Promise<LegacyContentGenerateResponse> => {
      const result = await generateMutation.mutateAsync({
        content_type: request.contentType,
        topic: request.topic,
        word_count: request.targetLength || 500,
        tone: (request.tone as ToneType) || "professional",
      });

      return {
        success: result.success,
        content: result.content.content,
        contentType: result.content.content_type,
        topic: request.topic,
        demoMode: result.demo_mode,
        message: result.message,
      };
    },
  });
}

// =============================================================================
// GBP SYNC HOOKS
// =============================================================================

interface GBPStatus {
  success: boolean;
  connected: boolean;
  lastSync: string;
  profileName: string;
  profileUrl: string;
  stats: {
    totalPosts: number;
    totalReviews: number;
    averageRating: number;
    pendingResponses: number;
    viewsThisMonth: number;
    callsThisMonth: number;
  };
  demoMode: boolean;
  message?: string;
}

interface GBPSyncResponse {
  success: boolean;
  message: string;
  syncedAt: string;
  demoMode: boolean;
}

interface GBPPostRequest {
  title: string;
  content: string;
  callToAction?: string;
  actionUrl?: string;
}

interface GBPPostResponse {
  success: boolean;
  postId: string;
  message: string;
  publishedAt: string;
  demoMode: boolean;
}

/**
 * Get GBP sync status
 */
export function useGBPStatus() {
  return useQuery({
    queryKey: [...marketingTasksKeys.all, "gbp", "status"],
    queryFn: async (): Promise<GBPStatus> => {
      const response = await apiClient.get<GBPStatus>(
        "/marketing-hub/tasks/gbp/status",
      );
      return response.data;
    },
    staleTime: 60000,
  });
}

/**
 * Trigger GBP sync
 */
export function useTriggerGBPSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<GBPSyncResponse> => {
      const response = await apiClient.post<GBPSyncResponse>(
        "/marketing-hub/tasks/gbp/sync",
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...marketingTasksKeys.all, "gbp"],
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}

/**
 * Create and publish a GBP post
 */
export function useCreateGBPPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GBPPostRequest): Promise<GBPPostResponse> => {
      const response = await apiClient.post<GBPPostResponse>(
        "/marketing-hub/tasks/gbp/post",
        request,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...marketingTasksKeys.all, "gbp"],
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}
