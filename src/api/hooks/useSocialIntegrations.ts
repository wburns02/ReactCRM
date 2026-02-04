import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";

// Types

export interface SocialIntegrationStatus {
  platform: string;
  connected: boolean;
  configured: boolean;
  business_name?: string;
  business_id?: string;
  page_name?: string;
  page_id?: string;
  last_sync?: string;
  message: string;
}

export interface SocialReview {
  id: string;
  platform: "yelp" | "facebook";
  author: string;
  rating: number | null;
  text: string;
  date: string;
  has_response: boolean;
  response_text?: string;
  sentiment?: string;
  review_url?: string;
}

export interface ReviewsResponse {
  success: boolean;
  reviews: SocialReview[];
  total: number;
  platform?: string;
}

export interface IntegrationsStatusResponse {
  yelp: SocialIntegrationStatus;
  facebook: SocialIntegrationStatus;
}

export interface YelpSearchResult {
  id: string;
  name: string;
  rating?: number;
  review_count?: number;
  address?: string;
  city?: string;
  state?: string;
}

export interface YelpSearchResponse {
  success: boolean;
  businesses: YelpSearchResult[];
}

// Query Keys

export const socialIntegrationKeys = {
  all: ["social-integrations"] as const,
  status: () => [...socialIntegrationKeys.all, "status"] as const,
  yelpStatus: () => [...socialIntegrationKeys.all, "yelp", "status"] as const,
  yelpReviews: () => [...socialIntegrationKeys.all, "yelp", "reviews"] as const,
  facebookStatus: () =>
    [...socialIntegrationKeys.all, "facebook", "status"] as const,
  facebookReviews: () =>
    [...socialIntegrationKeys.all, "facebook", "reviews"] as const,
  facebookInsights: () =>
    [...socialIntegrationKeys.all, "facebook", "insights"] as const,
  allReviews: (platform?: string) =>
    [...socialIntegrationKeys.all, "reviews", platform] as const,
};

// Hooks

/**
 * Get status of all social integrations
 */
export function useSocialIntegrationsStatus() {
  return useQuery({
    queryKey: socialIntegrationKeys.status(),
    queryFn: async () => {
      const response = await apiClient.get<IntegrationsStatusResponse>(
        "/integrations/social/status",
      );
      return response.data;
    },
  });
}

/**
 * Get Yelp integration status
 */
export function useYelpStatus() {
  return useQuery({
    queryKey: socialIntegrationKeys.yelpStatus(),
    queryFn: async () => {
      const response = await apiClient.get<SocialIntegrationStatus>(
        "/integrations/social/yelp/status",
      );
      return response.data;
    },
  });
}

/**
 * Search for a Yelp business
 */
export function useYelpBusinessSearch() {
  return useMutation({
    mutationFn: async ({
      name,
      location,
    }: {
      name: string;
      location: string;
    }) => {
      const response = await apiClient.get<YelpSearchResponse>(
        "/integrations/social/yelp/search",
        {
          params: { name, location },
        },
      );
      return response.data;
    },
  });
}

/**
 * Connect a Yelp business
 */
export function useConnectYelpBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessId: string) => {
      const response = await apiClient.post(
        "/integrations/social/yelp/connect",
        null,
        {
          params: { business_id: businessId },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: socialIntegrationKeys.status(),
      });
      queryClient.invalidateQueries({
        queryKey: socialIntegrationKeys.yelpStatus(),
      });
      queryClient.invalidateQueries({
        queryKey: socialIntegrationKeys.yelpReviews(),
      });
    },
  });
}

/**
 * Disconnect Yelp
 */
export function useDisconnectYelp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(
        "/integrations/social/yelp/disconnect",
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: socialIntegrationKeys.status(),
      });
      queryClient.invalidateQueries({
        queryKey: socialIntegrationKeys.yelpStatus(),
      });
    },
  });
}

/**
 * Get Yelp reviews
 */
export function useYelpReviews() {
  return useQuery({
    queryKey: socialIntegrationKeys.yelpReviews(),
    queryFn: async () => {
      const response = await apiClient.get<ReviewsResponse>(
        "/integrations/social/yelp/reviews",
      );
      return response.data;
    },
    retry: false,
  });
}

/**
 * Get Facebook integration status
 */
export function useFacebookStatus() {
  return useQuery({
    queryKey: socialIntegrationKeys.facebookStatus(),
    queryFn: async () => {
      const response = await apiClient.get<SocialIntegrationStatus>(
        "/integrations/social/facebook/status",
      );
      return response.data;
    },
  });
}

/**
 * Get Facebook OAuth URL
 */
export function useFacebookAuthUrl() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.get<{ auth_url: string; state: string }>(
        "/integrations/social/facebook/auth-url",
      );
      return response.data;
    },
  });
}

/**
 * Disconnect Facebook
 */
export function useDisconnectFacebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(
        "/integrations/social/facebook/disconnect",
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: socialIntegrationKeys.status(),
      });
      queryClient.invalidateQueries({
        queryKey: socialIntegrationKeys.facebookStatus(),
      });
    },
  });
}

/**
 * Get Facebook reviews
 */
export function useFacebookReviews() {
  return useQuery({
    queryKey: socialIntegrationKeys.facebookReviews(),
    queryFn: async () => {
      const response = await apiClient.get<ReviewsResponse>(
        "/integrations/social/facebook/reviews",
      );
      return response.data;
    },
    retry: false,
  });
}

/**
 * Reply to a Facebook review
 */
export function useReplyToFacebookReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      reply,
    }: {
      reviewId: string;
      reply: string;
    }) => {
      const response = await apiClient.post(
        "/integrations/social/facebook/reviews/reply",
        {
          review_id: reviewId,
          reply,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: socialIntegrationKeys.facebookReviews(),
      });
    },
  });
}

/**
 * Get Facebook page insights
 */
export function useFacebookInsights() {
  return useQuery({
    queryKey: socialIntegrationKeys.facebookInsights(),
    queryFn: async () => {
      const response = await apiClient.get(
        "/integrations/social/facebook/insights",
      );
      return response.data;
    },
    retry: false,
  });
}

/**
 * Get all reviews from all platforms
 */
export function useAllSocialReviews(platform?: "yelp" | "facebook") {
  return useQuery({
    queryKey: socialIntegrationKeys.allReviews(platform),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        reviews: SocialReview[];
        total: number;
      }>("/integrations/social/reviews", {
        params: platform ? { platform } : undefined,
      });
      return response.data;
    },
  });
}
