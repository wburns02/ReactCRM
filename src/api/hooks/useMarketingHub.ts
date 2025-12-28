import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client.ts';

// Types for Marketing Hub API responses
export interface MarketingOverview {
  success: boolean;
  period_days: number;
  overview: {
    website_traffic: {
      sessions: number;
      users: number;
      conversions: number;
    };
    paid_ads: {
      spend: number;
      clicks: number;
      conversions: number;
      roas: number;
    };
    seo: {
      score: number;
      grade: string;
      trend: string;
    };
    leads: {
      new: number;
      engaged: number;
      converted: number;
      conversion_rate: number;
    };
  };
  quick_actions: Array<{
    action: string;
    label: string;
    icon: string;
  }>;
}

export interface AdsPerformance {
  success: boolean;
  metrics: {
    cost: number;
    clicks: number;
    impressions: number;
    conversions: number;
    ctr: number;
    cpa: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    cost: number;
    clicks: number;
    conversions: number;
  }>;
  recommendations: Array<{
    type: string;
    message: string;
    priority: string;
    impact: string;
  }>;
}

export interface SEOOverview {
  success: boolean;
  overall_score: {
    overall: number;
    grade: string;
    trend: string;
  };
  keyword_rankings: Array<{
    keyword: string;
    position: number;
    change: number;
    url: string;
  }>;
  recommendations: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

export interface LeadPipeline {
  success: boolean;
  pipeline: {
    new: number;
    engaged: number;
    qualified: number;
    converted: number;
  };
  hot_leads: Array<{
    id: number;
    name: string;
    score: number;
    source: string;
    last_activity: string;
  }>;
  conversion_rate: number;
}

export interface PendingReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  responded: boolean;
}

export interface AIContentRequest {
  type: 'ad_copy' | 'email_subject' | 'blog_outline' | 'social_post';
  context: Record<string, string>;
}

export interface AIContentResponse {
  success: boolean;
  content_type: string;
  generated: unknown;
  provider: string;
  raw?: string;
}

export interface IntegrationSettings {
  success: boolean;
  integrations: {
    ga4: { configured: boolean; property_id?: string };
    google_ads: { configured: boolean; customer_id?: string };
    anthropic: { configured: boolean };
    openai: { configured: boolean };
    search_console: { configured: boolean };
  };
  automation: {
    ai_advisor_enabled: boolean;
    auto_campaigns_enabled: boolean;
    lead_scoring_enabled: boolean;
  };
}

// Query Keys
export const marketingKeys = {
  all: ['marketing'] as const,
  overview: (days: number) => [...marketingKeys.all, 'overview', days] as const,
  adsPerformance: (days: number) => [...marketingKeys.all, 'ads', 'performance', days] as const,
  adsStatus: () => [...marketingKeys.all, 'ads', 'status'] as const,
  seoOverview: () => [...marketingKeys.all, 'seo', 'overview'] as const,
  seoKeywords: () => [...marketingKeys.all, 'seo', 'keywords'] as const,
  leadPipeline: () => [...marketingKeys.all, 'leads', 'pipeline'] as const,
  hotLeads: () => [...marketingKeys.all, 'leads', 'hot'] as const,
  pendingReviews: () => [...marketingKeys.all, 'reviews', 'pending'] as const,
  campaigns: () => [...marketingKeys.all, 'campaigns'] as const,
  settings: () => [...marketingKeys.all, 'settings'] as const,
  aiRecommendations: () => [...marketingKeys.all, 'ai', 'recommendations'] as const,
  blogIdeas: () => [...marketingKeys.all, 'seo', 'blog-ideas'] as const,
};

// Hooks

/**
 * Get Marketing Hub Overview
 */
export function useMarketingOverview(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.overview(days),
    queryFn: async () => {
      const response = await apiClient.get<MarketingOverview>(
        `/marketing-hub/overview?days=${days}`
      );
      return response.data;
    },
  });
}

/**
 * Get Google Ads Performance
 */
export function useAdsPerformance(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.adsPerformance(days),
    queryFn: async () => {
      const response = await apiClient.get<AdsPerformance>(
        `/marketing-hub/ads/performance?days=${days}`
      );
      return response.data;
    },
  });
}

/**
 * Get Ads Connection Status
 */
export function useAdsStatus() {
  return useQuery({
    queryKey: marketingKeys.adsStatus(),
    queryFn: async () => {
      const response = await apiClient.get('/marketing-hub/ads/status');
      return response.data;
    },
  });
}

/**
 * Get SEO Overview
 */
export function useSEOOverview() {
  return useQuery({
    queryKey: marketingKeys.seoOverview(),
    queryFn: async () => {
      const response = await apiClient.get<SEOOverview>('/marketing-hub/seo/overview');
      return response.data;
    },
  });
}

/**
 * Get Lead Pipeline
 */
export function useLeadPipeline() {
  return useQuery({
    queryKey: marketingKeys.leadPipeline(),
    queryFn: async () => {
      const response = await apiClient.get<LeadPipeline>('/marketing-hub/leads/pipeline');
      return response.data;
    },
  });
}

/**
 * Get Hot Leads
 */
export function useHotLeads() {
  return useQuery({
    queryKey: marketingKeys.hotLeads(),
    queryFn: async () => {
      const response = await apiClient.get('/marketing-hub/leads/hot');
      return response.data;
    },
  });
}

/**
 * Get Pending Reviews
 */
export function usePendingReviews() {
  return useQuery({
    queryKey: marketingKeys.pendingReviews(),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; reviews: PendingReview[] }>(
        '/marketing-hub/reviews/pending'
      );
      return response.data;
    },
  });
}

/**
 * Get Marketing Campaigns
 */
export function useMarketingCampaigns() {
  return useQuery({
    queryKey: marketingKeys.campaigns(),
    queryFn: async () => {
      const response = await apiClient.get('/marketing-hub/campaigns');
      return response.data;
    },
  });
}

/**
 * Get Integration Settings
 */
export function useIntegrationSettings() {
  return useQuery({
    queryKey: marketingKeys.settings(),
    queryFn: async () => {
      const response = await apiClient.get<IntegrationSettings>('/marketing-hub/settings');
      return response.data;
    },
  });
}

/**
 * Get AI Recommendations
 */
export function useAIRecommendations() {
  return useQuery({
    queryKey: marketingKeys.aiRecommendations(),
    queryFn: async () => {
      const response = await apiClient.get('/marketing-hub/ai/recommendations');
      return response.data;
    },
  });
}

/**
 * Get Blog Ideas
 */
export function useBlogIdeas() {
  return useQuery({
    queryKey: marketingKeys.blogIdeas(),
    queryFn: async () => {
      const response = await apiClient.get('/marketing-hub/seo/blog-ideas');
      return response.data;
    },
  });
}

// Mutations

/**
 * Generate AI Content
 */
export function useGenerateAIContent() {
  return useMutation({
    mutationFn: async (request: AIContentRequest): Promise<AIContentResponse> => {
      const response = await apiClient.post('/marketing-hub/ai/generate-content', request);
      return response.data;
    },
  });
}

/**
 * Generate Landing Page
 */
export function useGenerateLandingPage() {
  return useMutation({
    mutationFn: async (data: { city: string; service?: string; keywords?: string }) => {
      const response = await apiClient.post('/marketing-hub/ai/generate-landing-page', data);
      return response.data;
    },
  });
}

/**
 * Generate Blog Post
 */
export function useGenerateBlogPost() {
  return useMutation({
    mutationFn: async (data: { topic: string; keyword?: string; word_count?: number }) => {
      const response = await apiClient.post('/marketing-hub/seo/generate-blog', data);
      return response.data;
    },
  });
}

/**
 * Reply to Review
 */
export function useReplyToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { review_id: string; reply: string }) => {
      const response = await apiClient.post('/marketing-hub/reviews/reply', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.pendingReviews() });
    },
  });
}

/**
 * Create Marketing Campaign
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      campaign_type: string;
      target_segment: string;
      scheduled_start?: string;
      scheduled_end?: string;
      message_template?: string;
    }) => {
      const response = await apiClient.post('/marketing-hub/campaigns', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns() });
    },
  });
}

/**
 * Save Integration Settings
 */
export function useSaveIntegrationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      integration_type: string;
      credentials: Record<string, string>;
    }) => {
      const response = await apiClient.post('/marketing-hub/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.settings() });
    },
  });
}
