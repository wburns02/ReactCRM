/**
 * Marketing Details Hooks
 *
 * React Query hooks for fetching detailed marketing data
 * when users click on metric cards in the Marketing Tasks dashboard.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type {
  KeywordsResponse,
  PagesResponse,
  ContentResponse,
  ReviewsResponse,
  VitalsResponse,
} from "../types/marketingDetails";

const API_BASE = "/marketing-hub";

/**
 * Fetch keyword details with rankings
 */
export function useKeywordDetails(enabled = false) {
  return useQuery<KeywordsResponse>({
    queryKey: ["marketing", "keywords"],
    queryFn: async () => {
      const response = await apiClient.get(`${API_BASE}/tasks/keywords`);
      return response.data;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch indexed pages details
 */
export function usePageDetails(enabled = false) {
  return useQuery<PagesResponse>({
    queryKey: ["marketing", "pages"],
    queryFn: async () => {
      const response = await apiClient.get(`${API_BASE}/tasks/pages`);
      return response.data;
    },
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch generated content details
 */
export function useContentDetails(enabled = false) {
  return useQuery<ContentResponse>({
    queryKey: ["marketing", "content"],
    queryFn: async () => {
      const response = await apiClient.get(`${API_BASE}/tasks/content`);
      return response.data;
    },
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch review details
 */
export function useReviewDetails(enabled = false) {
  return useQuery<ReviewsResponse>({
    queryKey: ["marketing", "reviews"],
    queryFn: async () => {
      const response = await apiClient.get(`${API_BASE}/tasks/reviews`);
      return response.data;
    },
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch Core Web Vitals history
 */
export function useVitalsDetails(enabled = false) {
  return useQuery<VitalsResponse>({
    queryKey: ["marketing", "vitals"],
    queryFn: async () => {
      const response = await apiClient.get(`${API_BASE}/tasks/vitals`);
      return response.data;
    },
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
