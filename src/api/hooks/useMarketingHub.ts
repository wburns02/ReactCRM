import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";

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
  type: "ad_copy" | "email_subject" | "blog_outline" | "social_post";
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
    search_console: { configured: boolean; site_url?: string };
    google_business_profile: { configured: boolean; account_id?: string };
    google_calendar: { configured: boolean; calendar_id?: string };
    anthropic: { configured: boolean };
    openai: { configured: boolean };
  };
  automation: {
    ai_advisor_enabled: boolean;
    auto_campaigns_enabled: boolean;
    lead_scoring_enabled: boolean;
  };
}

export interface MarketingAnalytics {
  success: boolean;
  period_days: number;
  revenue: {
    total: number;
    completed_jobs: number;
    avg_job_value: number;
    ltv_estimate: number;
  };
  acquisition: {
    new_customers: number;
    customer_acquisition_cost: number;
    lead_sources: Record<string, number>;
  };
  campaigns: {
    total: number;
    emails_sent: number;
    emails_opened: number;
    emails_clicked: number;
    conversions: number;
    open_rate: number;
    click_rate: number;
  };
  ads: {
    spend: number;
    conversions: number;
    roas: number;
  };
  roi: {
    total_spend: number;
    total_revenue: number;
    roi_percent: number;
  };
}

export interface HotLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  estimated_value: number;
  lead_source: string;
  heat_score: number;
  city: string;
  last_activity: string | null;
  assigned_to: string | null;
}

export interface BlogIdea {
  title: string;
  category: string;
  estimated_traffic: number;
  difficulty: string;
  priority: string;
  reason: string;
}

// GA4 Types
export interface GA4TrafficData {
  success: boolean;
  data: {
    sessions: number;
    users: number;
    new_users: number;
    pageviews: number;
    bounce_rate: number;
    avg_session_duration: number;
    conversions: number;
    daily: Array<{
      date: string;
      sessions: number;
      users: number;
      pageviews: number;
      bounce_rate: number;
    }>;
  };
}

export interface GA4SourcesData {
  success: boolean;
  data: {
    sources: Array<{
      source: string;
      medium: string;
      channel_group: string;
      sessions: number;
      users: number;
      engaged_sessions: number;
      bounce_rate: number;
      conversions: number;
    }>;
  };
}

export interface GA4ComparisonData {
  success: boolean;
  data: {
    current: {
      sessions: number;
      users: number;
      pageviews: number;
      bounce_rate: number;
      conversions: number;
      avg_session_duration: number;
    };
    previous: {
      sessions: number;
      users: number;
      pageviews: number;
      bounce_rate: number;
      conversions: number;
      avg_session_duration: number;
    };
    changes: {
      sessions: number;
      users: number;
      pageviews: number;
      bounce_rate: number;
      conversions: number;
      avg_session_duration: number;
    };
  };
}

export interface GA4PagesData {
  success: boolean;
  data: {
    pages: Array<{
      page_path: string;
      pageviews: number;
      users: number;
      avg_time_on_page: number;
      bounce_rate: number;
      entrances: number;
    }>;
  };
}

export interface GA4DevicesData {
  success: boolean;
  data: {
    devices: Array<{
      device_category: string;
      sessions: number;
      users: number;
      bounce_rate: number;
      percentage: number;
    }>;
  };
}

export interface GA4GeoData {
  success: boolean;
  data: {
    locations: Array<{
      region: string;
      city: string;
      sessions: number;
      users: number;
      bounce_rate: number;
      conversions: number;
    }>;
  };
}

export interface GA4RealtimeData {
  success: boolean;
  data: {
    active_users: number;
    pages: Array<{
      page_path: string;
      active_users: number;
    }>;
  };
}

// Query Keys
export const marketingKeys = {
  all: ["marketing"] as const,
  overview: (days: number) => [...marketingKeys.all, "overview", days] as const,
  adsPerformance: (days: number) =>
    [...marketingKeys.all, "ads", "performance", days] as const,
  adsStatus: () => [...marketingKeys.all, "ads", "status"] as const,
  seoOverview: () => [...marketingKeys.all, "seo", "overview"] as const,
  seoKeywords: () => [...marketingKeys.all, "seo", "keywords"] as const,
  leadPipeline: () => [...marketingKeys.all, "leads", "pipeline"] as const,
  hotLeads: () => [...marketingKeys.all, "leads", "hot"] as const,
  pendingReviews: () => [...marketingKeys.all, "reviews", "pending"] as const,
  campaigns: () => [...marketingKeys.all, "campaigns"] as const,
  settings: () => [...marketingKeys.all, "settings"] as const,
  aiRecommendations: () =>
    [...marketingKeys.all, "ai", "recommendations"] as const,
  blogIdeas: () => [...marketingKeys.all, "seo", "blog-ideas"] as const,
  analytics: (days: number) =>
    [...marketingKeys.all, "analytics", days] as const,
  ga4Traffic: (days: number) =>
    [...marketingKeys.all, "ga4", "traffic", days] as const,
  ga4Sources: (days: number) =>
    [...marketingKeys.all, "ga4", "sources", days] as const,
  ga4Comparison: (days: number) =>
    [...marketingKeys.all, "ga4", "comparison", days] as const,
  ga4Pages: (days: number) =>
    [...marketingKeys.all, "ga4", "pages", days] as const,
  ga4Devices: (days: number) =>
    [...marketingKeys.all, "ga4", "devices", days] as const,
  ga4Geo: (days: number) =>
    [...marketingKeys.all, "ga4", "geo", days] as const,
  ga4Realtime: () => [...marketingKeys.all, "ga4", "realtime"] as const,
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
        `/marketing-hub/overview?days=${days}`,
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
        `/marketing-hub/ads/performance?days=${days}`,
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
      const response = await apiClient.get("/marketing-hub/ads/status");
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
      const response = await apiClient.get<SEOOverview>(
        "/marketing-hub/seo/overview",
      );
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
      const response = await apiClient.get<LeadPipeline>(
        "/marketing-hub/leads/pipeline",
      );
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
      const response = await apiClient.get("/marketing-hub/leads/hot");
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
      const response = await apiClient.get<{
        success: boolean;
        reviews: PendingReview[];
      }>("/marketing-hub/reviews/pending");
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
      const response = await apiClient.get("/marketing-hub/campaigns");
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
      const response = await apiClient.get<IntegrationSettings>(
        "/marketing-hub/settings",
      );
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
      const response = await apiClient.get("/marketing-hub/ai/recommendations");
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
      const response = await apiClient.get("/marketing-hub/seo/blog-ideas");
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
    mutationFn: async (
      request: AIContentRequest,
    ): Promise<AIContentResponse> => {
      const response = await apiClient.post(
        "/marketing-hub/ai/generate-content",
        request,
      );
      return response.data;
    },
  });
}

/**
 * Generate Landing Page
 */
export function useGenerateLandingPage() {
  return useMutation({
    mutationFn: async (data: {
      city: string;
      service?: string;
      keywords?: string;
    }) => {
      const response = await apiClient.post(
        "/marketing-hub/ai/generate-landing-page",
        data,
      );
      return response.data;
    },
  });
}

/**
 * Generate Blog Post
 */
export function useGenerateBlogPost() {
  return useMutation({
    mutationFn: async (data: {
      topic: string;
      keyword?: string;
      word_count?: number;
    }) => {
      const response = await apiClient.post(
        "/marketing-hub/seo/generate-blog",
        data,
      );
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
      const response = await apiClient.post(
        "/marketing-hub/reviews/reply",
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketingKeys.pendingReviews(),
      });
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
      const response = await apiClient.post("/marketing-hub/campaigns", data);
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
      const response = await apiClient.post("/marketing-hub/settings", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.settings() });
    },
  });
}

/**
 * Get Marketing Analytics / ROI
 */
export function useMarketingAnalytics(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.analytics(days),
    queryFn: async () => {
      const response = await apiClient.get<MarketingAnalytics>(
        `/marketing-hub/analytics/overview?days=${days}`,
      );
      return response.data;
    },
  });
}

// ==========================================
// GA4 Analytics Hooks
// ==========================================

export function useGA4Traffic(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.ga4Traffic(days),
    queryFn: async () => {
      const response = await apiClient.get<GA4TrafficData>(
        `/marketing-hub/ga4/traffic?days=${days}`,
      );
      return response.data;
    },
  });
}

export function useGA4Sources(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.ga4Sources(days),
    queryFn: async () => {
      const response = await apiClient.get<GA4SourcesData>(
        `/marketing-hub/ga4/sources?days=${days}`,
      );
      return response.data;
    },
  });
}

export function useGA4Comparison(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.ga4Comparison(days),
    queryFn: async () => {
      const response = await apiClient.get<GA4ComparisonData>(
        `/marketing-hub/ga4/comparison?days=${days}`,
      );
      return response.data;
    },
  });
}

export function useGA4Pages(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.ga4Pages(days),
    queryFn: async () => {
      const response = await apiClient.get<GA4PagesData>(
        `/marketing-hub/ga4/pages?days=${days}`,
      );
      return response.data;
    },
  });
}

export function useGA4Devices(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.ga4Devices(days),
    queryFn: async () => {
      const response = await apiClient.get<GA4DevicesData>(
        `/marketing-hub/ga4/devices?days=${days}`,
      );
      return response.data;
    },
  });
}

export function useGA4Geo(days: number = 30) {
  return useQuery({
    queryKey: marketingKeys.ga4Geo(days),
    queryFn: async () => {
      const response = await apiClient.get<GA4GeoData>(
        `/marketing-hub/ga4/geo?days=${days}`,
      );
      return response.data;
    },
  });
}

export function useGA4Realtime() {
  return useQuery({
    queryKey: marketingKeys.ga4Realtime(),
    queryFn: async () => {
      const response = await apiClient.get<GA4RealtimeData>(
        "/marketing-hub/ga4/realtime",
      );
      return response.data;
    },
    refetchInterval: 60_000,
  });
}
