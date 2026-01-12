/**
 * Onboarding & Training API Hooks
 * Setup wizard, tutorials, and help system
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  onboardingProgressSchema,
  importJobSchema,
  tutorialSchema,
  userTutorialProgressSchema,
  releaseNoteSchema,
  helpArticleSchema,
  helpCategorySchema,
  chatMessageSchema,
  supportTicketSchema,
} from "@/api/types/onboarding";
import type {
  OnboardingProgress,
  SetupStep,
  ImportJob,
  ImportSource,
  ImportMapping,
  Tutorial,
  UserTutorialProgress,
  ReleaseNote,
  HelpArticle,
  HelpCategory,
  ChatMessage,
  SupportTicket,
} from "@/api/types/onboarding";
import { z } from "zod";

// Query keys
export const onboardingKeys = {
  progress: {
    all: ["onboarding", "progress"] as const,
    current: () => [...onboardingKeys.progress.all, "current"] as const,
  },
  import: {
    all: ["onboarding", "import"] as const,
    jobs: () => [...onboardingKeys.import.all, "jobs"] as const,
    job: (id: string) => [...onboardingKeys.import.all, "job", id] as const,
    preview: () => [...onboardingKeys.import.all, "preview"] as const,
  },
  tutorials: {
    all: ["onboarding", "tutorials"] as const,
    list: (feature?: string) =>
      [...onboardingKeys.tutorials.all, "list", feature] as const,
    detail: (id: string) =>
      [...onboardingKeys.tutorials.all, "detail", id] as const,
    progress: () => [...onboardingKeys.tutorials.all, "progress"] as const,
    recommended: () =>
      [...onboardingKeys.tutorials.all, "recommended"] as const,
  },
  help: {
    all: ["onboarding", "help"] as const,
    categories: () => [...onboardingKeys.help.all, "categories"] as const,
    articles: (category?: string) =>
      [...onboardingKeys.help.all, "articles", category] as const,
    article: (id: string) =>
      [...onboardingKeys.help.all, "article", id] as const,
    search: (query: string) =>
      [...onboardingKeys.help.all, "search", query] as const,
    chat: () => [...onboardingKeys.help.all, "chat"] as const,
  },
  releases: {
    all: ["onboarding", "releases"] as const,
    list: () => [...onboardingKeys.releases.all, "list"] as const,
    latest: () => [...onboardingKeys.releases.all, "latest"] as const,
    unread: () => [...onboardingKeys.releases.all, "unread"] as const,
  },
};

// ============================================
// Setup Wizard Hooks
// ============================================

/**
 * Get current onboarding progress
 */
export function useOnboardingProgress() {
  return useQuery({
    queryKey: onboardingKeys.progress.current(),
    queryFn: async (): Promise<OnboardingProgress> => {
      const { data } = await apiClient.get("/onboarding/progress");
      return onboardingProgressSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update step status
 */
export function useUpdateSetupStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      step_id: string;
      status: SetupStep["status"];
      data?: Record<string, unknown>;
    }): Promise<OnboardingProgress> => {
      const { data } = await apiClient.patch(
        `/onboarding/steps/${params.step_id}`,
        {
          status: params.status,
          data: params.data,
        },
      );
      return onboardingProgressSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingKeys.progress.current(), data);
    },
  });
}

/**
 * Skip a setup step
 */
export function useSkipSetupStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stepId: string): Promise<OnboardingProgress> => {
      const { data } = await apiClient.post(`/onboarding/steps/${stepId}/skip`);
      return onboardingProgressSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingKeys.progress.current(), data);
    },
  });
}

/**
 * Complete onboarding
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.post("/onboarding/complete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress.all });
    },
  });
}

// ============================================
// Data Import Hooks
// ============================================

/**
 * Get import jobs
 */
export function useImportJobs() {
  return useQuery({
    queryKey: onboardingKeys.import.jobs(),
    queryFn: async (): Promise<ImportJob[]> => {
      const { data } = await apiClient.get("/onboarding/import/jobs");
      return z.array(importJobSchema).parse(data.jobs || data);
    },
  });
}

/**
 * Get single import job
 */
export function useImportJob(id: string) {
  return useQuery({
    queryKey: onboardingKeys.import.job(id),
    queryFn: async (): Promise<ImportJob> => {
      const { data } = await apiClient.get(`/onboarding/import/jobs/${id}`);
      return importJobSchema.parse(data.job || data);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const job = query.state.data as ImportJob | undefined;
      // Poll while processing
      return job?.status === "processing" || job?.status === "validating"
        ? 2000
        : false;
    },
  });
}

/**
 * Upload file for import preview
 */
export function useUploadImportFile() {
  return useMutation({
    mutationFn: async (params: {
      file: File;
      source: ImportSource;
      entity_type: string;
    }): Promise<{
      preview_rows: Record<string, unknown>[];
      detected_fields: string[];
      suggested_mappings: ImportMapping[];
    }> => {
      const formData = new FormData();
      formData.append("file", params.file);
      formData.append("source", params.source);
      formData.append("entity_type", params.entity_type);

      const { data } = await apiClient.post(
        "/onboarding/import/preview",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return data;
    },
  });
}

/**
 * Start import job
 */
export function useStartImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      source: ImportSource;
      entity_type: string;
      file_id: string;
      mappings: ImportMapping[];
    }): Promise<ImportJob> => {
      const { data } = await apiClient.post("/onboarding/import/start", params);
      return importJobSchema.parse(data.job || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.import.jobs() });
    },
  });
}

/**
 * Connect to external CRM for import
 */
export function useConnectExternalCRM() {
  return useMutation({
    mutationFn: async (params: {
      source: ImportSource;
      credentials: Record<string, string>;
    }): Promise<{ auth_url?: string; connected: boolean }> => {
      const { data } = await apiClient.post(
        "/onboarding/import/connect",
        params,
      );
      return data;
    },
  });
}

// ============================================
// Tutorial Hooks
// ============================================

/**
 * Get tutorials
 */
export function useTutorials(feature?: string) {
  return useQuery({
    queryKey: onboardingKeys.tutorials.list(feature),
    queryFn: async (): Promise<Tutorial[]> => {
      const params = feature ? { feature } : {};
      const { data } = await apiClient.get("/onboarding/tutorials", { params });
      return z.array(tutorialSchema).parse(data.tutorials || data);
    },
  });
}

/**
 * Get recommended tutorials
 */
export function useRecommendedTutorials() {
  return useQuery({
    queryKey: onboardingKeys.tutorials.recommended(),
    queryFn: async (): Promise<Tutorial[]> => {
      const { data } = await apiClient.get("/onboarding/tutorials/recommended");
      return z.array(tutorialSchema).parse(data.tutorials || data);
    },
  });
}

/**
 * Get tutorial progress for current user
 */
export function useTutorialProgress() {
  return useQuery({
    queryKey: onboardingKeys.tutorials.progress(),
    queryFn: async (): Promise<UserTutorialProgress[]> => {
      const { data } = await apiClient.get("/onboarding/tutorials/progress");
      return z.array(userTutorialProgressSchema).parse(data.progress || data);
    },
  });
}

/**
 * Update tutorial progress
 */
export function useUpdateTutorialProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tutorial_id: string;
      current_step?: number;
      status?: UserTutorialProgress["status"];
      time_spent_seconds?: number;
    }): Promise<UserTutorialProgress> => {
      const { data } = await apiClient.patch(
        `/onboarding/tutorials/${params.tutorial_id}/progress`,
        params,
      );
      return userTutorialProgressSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.tutorials.progress(),
      });
    },
  });
}

/**
 * Mark tutorial as complete
 */
export function useCompleteTutorial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tutorialId: string): Promise<UserTutorialProgress> => {
      const { data } = await apiClient.post(
        `/onboarding/tutorials/${tutorialId}/complete`,
      );
      return userTutorialProgressSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.tutorials.progress(),
      });
    },
  });
}

// ============================================
// Help & Support Hooks
// ============================================

/**
 * Get help categories
 */
export function useHelpCategories() {
  return useQuery({
    queryKey: onboardingKeys.help.categories(),
    queryFn: async (): Promise<HelpCategory[]> => {
      const { data } = await apiClient.get("/help/categories");
      return z.array(helpCategorySchema).parse(data.categories || data);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get help articles
 */
export function useHelpArticles(category?: string) {
  return useQuery({
    queryKey: onboardingKeys.help.articles(category),
    queryFn: async (): Promise<HelpArticle[]> => {
      const params = category ? { category } : {};
      const { data } = await apiClient.get("/help/articles", { params });
      return z.array(helpArticleSchema).parse(data.articles || data);
    },
  });
}

/**
 * Get single help article
 */
export function useHelpArticle(id: string) {
  return useQuery({
    queryKey: onboardingKeys.help.article(id),
    queryFn: async (): Promise<HelpArticle> => {
      const { data } = await apiClient.get(`/help/articles/${id}`);
      return helpArticleSchema.parse(data.article || data);
    },
    enabled: !!id,
  });
}

/**
 * Search help articles
 */
export function useSearchHelp(query: string) {
  return useQuery({
    queryKey: onboardingKeys.help.search(query),
    queryFn: async (): Promise<HelpArticle[]> => {
      const { data } = await apiClient.get("/help/search", {
        params: { q: query },
      });
      return z.array(helpArticleSchema).parse(data.results || data);
    },
    enabled: query.length >= 2,
  });
}

/**
 * Rate article helpfulness
 */
export function useRateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      article_id: string;
      helpful: boolean;
    }): Promise<void> => {
      await apiClient.post(`/help/articles/${params.article_id}/rate`, {
        helpful: params.helpful,
      });
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.help.article(params.article_id),
      });
    },
  });
}

/**
 * AI Help Chat
 */
export function useAIHelpChat() {
  return useMutation({
    mutationFn: async (params: {
      message: string;
      conversation_id?: string;
    }): Promise<{
      conversation_id: string;
      message: ChatMessage;
    }> => {
      const { data } = await apiClient.post("/help/chat", params);
      return {
        conversation_id: data.conversation_id,
        message: chatMessageSchema.parse(data.message),
      };
    },
  });
}

/**
 * Create support ticket
 */
export function useCreateSupportTicket() {
  return useMutation({
    mutationFn: async (params: {
      subject: string;
      description: string;
      category: string;
      priority: SupportTicket["priority"];
      attachments?: File[];
    }): Promise<SupportTicket> => {
      const formData = new FormData();
      formData.append("subject", params.subject);
      formData.append("description", params.description);
      formData.append("category", params.category);
      formData.append("priority", params.priority);

      params.attachments?.forEach((file, i) => {
        formData.append(`attachment_${i}`, file);
      });

      const { data } = await apiClient.post("/help/tickets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return supportTicketSchema.parse(data.ticket || data);
    },
  });
}

// ============================================
// Release Notes Hooks
// ============================================

/**
 * Get release notes
 */
export function useReleaseNotes() {
  return useQuery({
    queryKey: onboardingKeys.releases.list(),
    queryFn: async (): Promise<ReleaseNote[]> => {
      const { data } = await apiClient.get("/releases");
      return z.array(releaseNoteSchema).parse(data.releases || data);
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Get latest release
 */
export function useLatestRelease() {
  return useQuery({
    queryKey: onboardingKeys.releases.latest(),
    queryFn: async (): Promise<ReleaseNote | null> => {
      const { data } = await apiClient.get("/releases/latest");
      if (!data.release) return null;
      return releaseNoteSchema.parse(data.release);
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Get unread release count
 */
export function useUnreadReleaseCount() {
  return useQuery({
    queryKey: onboardingKeys.releases.unread(),
    queryFn: async (): Promise<{ count: number; latest_version: string }> => {
      const { data } = await apiClient.get("/releases/unread");
      return data;
    },
  });
}

/**
 * Mark releases as read
 */
export function useMarkReleasesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (version?: string): Promise<void> => {
      await apiClient.post("/releases/mark-read", { version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.releases.unread(),
      });
    },
  });
}
