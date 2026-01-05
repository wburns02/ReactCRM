/**
 * Marketplace API Hooks
 * Integration directory and app management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  MarketplaceApp,
  InstalledApp,
  AppReview,
  MarketplaceFilters,
  MarketplaceResponse,
  AppInstallRequest,
  AppInstallResponse,
  AppCategory,
} from './types';

// ============================================
// Query Keys
// ============================================

export const marketplaceKeys = {
  all: ['marketplace'] as const,
  apps: () => [...marketplaceKeys.all, 'apps'] as const,
  app: (id: string) => [...marketplaceKeys.all, 'app', id] as const,
  appReviews: (id: string) => [...marketplaceKeys.all, 'app', id, 'reviews'] as const,
  installed: () => [...marketplaceKeys.all, 'installed'] as const,
  categories: () => [...marketplaceKeys.all, 'categories'] as const,
  featured: () => [...marketplaceKeys.all, 'featured'] as const,
};

// ============================================
// List Apps
// ============================================

export function useMarketplaceApps(filters?: MarketplaceFilters) {
  return useQuery({
    queryKey: [...marketplaceKeys.apps(), filters],
    queryFn: async (): Promise<MarketplaceResponse> => {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.pricing) params.set('pricing', filters.pricing);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.sort) params.set('sort', filters.sort);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.pageSize) params.set('page_size', String(filters.pageSize));

      const { data } = await apiClient.get(`/marketplace/apps?${params.toString()}`);
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// ============================================
// Get Single App
// ============================================

export function useMarketplaceApp(appId: string) {
  return useQuery({
    queryKey: marketplaceKeys.app(appId),
    queryFn: async (): Promise<MarketplaceApp> => {
      const { data } = await apiClient.get(`/marketplace/apps/${appId}`);
      return data;
    },
    enabled: !!appId,
  });
}

// ============================================
// Get App Reviews
// ============================================

export function useAppReviews(appId: string) {
  return useQuery({
    queryKey: marketplaceKeys.appReviews(appId),
    queryFn: async (): Promise<AppReview[]> => {
      const { data } = await apiClient.get(`/marketplace/apps/${appId}/reviews`);
      return data;
    },
    enabled: !!appId,
  });
}

// ============================================
// Featured Apps
// ============================================

export function useFeaturedApps() {
  return useQuery({
    queryKey: marketplaceKeys.featured(),
    queryFn: async (): Promise<MarketplaceApp[]> => {
      const { data } = await apiClient.get('/marketplace/featured');
      return data;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}

// ============================================
// Category Stats
// ============================================

export function useCategoryStats() {
  return useQuery({
    queryKey: marketplaceKeys.categories(),
    queryFn: async (): Promise<Array<{ category: AppCategory; count: number }>> => {
      const { data } = await apiClient.get('/marketplace/categories');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================
// Installed Apps
// ============================================

export function useInstalledApps() {
  return useQuery({
    queryKey: marketplaceKeys.installed(),
    queryFn: async (): Promise<InstalledApp[]> => {
      const { data } = await apiClient.get('/marketplace/installed');
      return data;
    },
  });
}

// ============================================
// Install App
// ============================================

export function useInstallApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AppInstallRequest): Promise<AppInstallResponse> => {
      const { data } = await apiClient.post('/marketplace/install', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.installed() });
    },
  });
}

// ============================================
// Uninstall App
// ============================================

export function useUninstallApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appId: string): Promise<{ success: boolean }> => {
      const { data } = await apiClient.delete(`/marketplace/installed/${appId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.installed() });
    },
  });
}

// ============================================
// Update App Settings
// ============================================

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appId,
      settings,
    }: {
      appId: string;
      settings: Record<string, unknown>;
    }): Promise<InstalledApp> => {
      const { data } = await apiClient.patch(`/marketplace/installed/${appId}/settings`, {
        settings,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.installed() });
    },
  });
}

// ============================================
// Submit Review
// ============================================

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appId,
      rating,
      title,
      body,
    }: {
      appId: string;
      rating: number;
      title: string;
      body: string;
    }): Promise<AppReview> => {
      const { data } = await apiClient.post(`/marketplace/apps/${appId}/reviews`, {
        rating,
        title,
        body,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.appReviews(variables.appId) });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.app(variables.appId) });
    },
  });
}

// ============================================
// Sync Installed App
// ============================================

export function useSyncApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appId: string): Promise<InstalledApp> => {
      const { data } = await apiClient.post(`/marketplace/installed/${appId}/sync`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.installed() });
    },
  });
}
