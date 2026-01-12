import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import type {
  Subscription,
  BusinessProfile,
  EmailTemplate,
  Segment,
  Campaign,
  AISuggestion,
  Analytics,
  OnboardingQuestion,
  TemplateFormData,
  CampaignFormData,
} from "../types/emailMarketing.ts";

// Query keys
export const emailMarketingKeys = {
  all: ["email-marketing"] as const,
  status: () => [...emailMarketingKeys.all, "status"] as const,
  subscription: () => [...emailMarketingKeys.all, "subscription"] as const,
  profile: () => [...emailMarketingKeys.all, "profile"] as const,
  templates: (category?: string) =>
    [...emailMarketingKeys.all, "templates", { category }] as const,
  template: (id: string) =>
    [...emailMarketingKeys.all, "templates", id] as const,
  segments: () => [...emailMarketingKeys.all, "segments"] as const,
  segmentCustomers: (segment: string) =>
    [...emailMarketingKeys.all, "segments", segment, "customers"] as const,
  campaigns: (status?: string) =>
    [...emailMarketingKeys.all, "campaigns", { status }] as const,
  campaign: (id: string) =>
    [...emailMarketingKeys.all, "campaigns", id] as const,
  suggestions: () => [...emailMarketingKeys.all, "suggestions"] as const,
  analytics: (days?: number) =>
    [...emailMarketingKeys.all, "analytics", { days }] as const,
  onboardingQuestions: () =>
    [...emailMarketingKeys.all, "onboarding", "questions"] as const,
};

// =============================================================================
// Status & Subscription
// =============================================================================

interface StatusResponse {
  success: boolean;
  subscription: Subscription;
  profile: BusinessProfile;
  analytics: Analytics;
  tiers: Record<string, { name: string; price: number; features: string[] }>;
}

export function useEmailMarketingStatus() {
  return useQuery({
    queryKey: emailMarketingKeys.status(),
    queryFn: async (): Promise<StatusResponse> => {
      const { data } = await apiClient.get("/email-marketing/status");
      return data;
    },
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: emailMarketingKeys.subscription(),
    queryFn: async (): Promise<Subscription> => {
      const { data } = await apiClient.get("/email-marketing/subscription");
      return data.subscription;
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tier: string): Promise<{ success: boolean }> => {
      const { data } = await apiClient.post("/email-marketing/subscription", {
        tier,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailMarketingKeys.all });
    },
  });
}

// =============================================================================
// Business Profile
// =============================================================================

export function useBusinessProfile() {
  return useQuery({
    queryKey: emailMarketingKeys.profile(),
    queryFn: async (): Promise<BusinessProfile> => {
      const { data } = await apiClient.get("/email-marketing/profile");
      return data.profile;
    },
  });
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      profile: Partial<BusinessProfile>,
    ): Promise<{ success: boolean }> => {
      const { data } = await apiClient.put("/email-marketing/profile", profile);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailMarketingKeys.profile() });
      queryClient.invalidateQueries({ queryKey: emailMarketingKeys.status() });
    },
  });
}

// =============================================================================
// Templates
// =============================================================================

export function useTemplates(category?: string) {
  return useQuery({
    queryKey: emailMarketingKeys.templates(category),
    queryFn: async (): Promise<EmailTemplate[]> => {
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      params.append("include_system", "true");

      const { data } = await apiClient.get(
        `/email-marketing/templates?${params}`,
      );
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: emailMarketingKeys.template(id),
    queryFn: async (): Promise<EmailTemplate> => {
      const { data } = await apiClient.get(`/email-marketing/templates/${id}`);
      return data.template;
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      template: TemplateFormData,
    ): Promise<{ success: boolean; template: EmailTemplate }> => {
      const { data } = await apiClient.post(
        "/email-marketing/templates",
        template,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.templates(),
      });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      template,
    }: {
      id: string;
      template: Partial<TemplateFormData>;
    }): Promise<{ success: boolean }> => {
      const { data } = await apiClient.put(
        `/email-marketing/templates/${id}`,
        template,
      );
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.template(id),
      });
    },
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: async ({
      id,
      sampleData,
    }: {
      id: string;
      sampleData: Record<string, string>;
    }): Promise<{ success: boolean; preview: string }> => {
      const { data } = await apiClient.post(
        `/email-marketing/templates/${id}/preview`,
        sampleData,
      );
      return data;
    },
  });
}

// =============================================================================
// Segments
// =============================================================================

export function useSegments() {
  return useQuery({
    queryKey: emailMarketingKeys.segments(),
    queryFn: async (): Promise<Segment[]> => {
      const { data } = await apiClient.get("/email-marketing/segments");
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSegmentCustomers(segment: string, limit = 100) {
  return useQuery({
    queryKey: emailMarketingKeys.segmentCustomers(segment),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/email-marketing/segments/${segment}/customers?limit=${limit}`,
      );
      return data;
    },
    enabled: !!segment,
  });
}

// =============================================================================
// Campaigns
// =============================================================================

export function useCampaigns(status?: string) {
  return useQuery({
    queryKey: emailMarketingKeys.campaigns(status),
    queryFn: async (): Promise<Campaign[]> => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);

      const { data } = await apiClient.get(
        `/email-marketing/campaigns?${params}`,
      );
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: emailMarketingKeys.campaign(id),
    queryFn: async (): Promise<Campaign> => {
      const { data } = await apiClient.get(`/email-marketing/campaigns/${id}`);
      return data.campaign;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      campaign: CampaignFormData,
    ): Promise<{ success: boolean; campaign: Campaign }> => {
      const { data } = await apiClient.post(
        "/email-marketing/campaigns",
        campaign,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaigns(),
      });
    },
  });
}

export function useSendCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const { data } = await apiClient.post(
        `/email-marketing/campaigns/${id}/send`,
      );
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaigns(),
      });
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaign(id),
      });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const { data } = await apiClient.delete(
        `/email-marketing/campaigns/${id}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaigns(),
      });
    },
  });
}

// =============================================================================
// AI Features (Tier 3+)
// =============================================================================

export function useAISuggestions() {
  return useQuery({
    queryKey: emailMarketingKeys.suggestions(),
    queryFn: async (): Promise<AISuggestion[]> => {
      const { data } = await apiClient.get("/email-marketing/ai/suggestions");
      return data.suggestions || [];
    },
  });
}

export function useGenerateSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AISuggestion[]> => {
      const { data } = await apiClient.post(
        "/email-marketing/ai/generate-suggestions",
      );
      return Array.isArray(data) ? data : [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.suggestions(),
      });
    },
  });
}

export function useApproveSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ): Promise<{ success: boolean; campaign_id?: string }> => {
      const { data } = await apiClient.post(
        `/email-marketing/ai/suggestions/${id}/approve`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.suggestions(),
      });
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.campaigns(),
      });
    },
  });
}

export function useDismissSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const { data } = await apiClient.post(
        `/email-marketing/ai/suggestions/${id}/dismiss`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailMarketingKeys.suggestions(),
      });
    },
  });
}

export function useGenerateContent() {
  return useMutation({
    mutationFn: async (params: {
      campaign_type: string;
      segment?: string;
      context?: Record<string, unknown>;
    }): Promise<{
      success: boolean;
      subject?: string;
      body_html?: string;
      body_text?: string;
    }> => {
      const { data } = await apiClient.post(
        "/email-marketing/ai/generate-content",
        params,
      );
      return data;
    },
  });
}

export function useOptimizeSubject() {
  return useMutation({
    mutationFn: async (params: {
      subject: string;
      segment?: string;
    }): Promise<{ success: boolean; alternatives?: string[] }> => {
      const { data } = await apiClient.post(
        "/email-marketing/ai/optimize-subject",
        params,
      );
      return data;
    },
  });
}

// =============================================================================
// Analytics
// =============================================================================

export function useAnalytics(days = 30) {
  return useQuery({
    queryKey: emailMarketingKeys.analytics(days),
    queryFn: async (): Promise<Analytics> => {
      const { data } = await apiClient.get(
        `/email-marketing/analytics?days=${days}`,
      );
      return data;
    },
  });
}

// =============================================================================
// Onboarding (Tier 4)
// =============================================================================

export function useOnboardingQuestions() {
  return useQuery({
    queryKey: emailMarketingKeys.onboardingQuestions(),
    queryFn: async (): Promise<OnboardingQuestion[]> => {
      const { data } = await apiClient.get(
        "/email-marketing/ai/onboarding-questions",
      );
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSubmitOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      answers: Record<string, unknown>,
    ): Promise<{ success: boolean }> => {
      const { data } = await apiClient.post(
        "/email-marketing/onboarding/answers",
        answers,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailMarketingKeys.profile() });
      queryClient.invalidateQueries({ queryKey: emailMarketingKeys.status() });
    },
  });
}

export function useGenerateMarketingPlan() {
  return useMutation({
    mutationFn: async (
      answers?: Record<string, unknown>,
    ): Promise<{ success: boolean; html_content?: string }> => {
      const { data } = await apiClient.post(
        "/email-marketing/ai/generate-marketing-plan",
        { answers },
      );
      return data;
    },
  });
}
