import { useQuery } from "@tanstack/react-query";
import { propIntelClient, isPropIntelConfigured } from "../propIntelClient";
import { validateResponse } from "../validateResponse";
import {
  paginatedPropertySchema,
  propertySchema,
  statsOverviewSchema,
  healthSchema,
  type PaginatedProperty,
  type Property,
  type Permit,
  type EnvironmentalRecord,
  type FloodZone,
  type PDFExtraction,
  type StatsOverview,
  type Health,
  type PropertySearchFilters,
} from "../types/propertyIntelligence";

/**
 * Query keys for Property Intelligence
 */
export const propIntelKeys = {
  all: ["propIntel"] as const,
  health: () => [...propIntelKeys.all, "health"] as const,
  stats: () => [...propIntelKeys.all, "stats"] as const,
  search: (filters: PropertySearchFilters) =>
    [...propIntelKeys.all, "search", filters] as const,
  detail: (id: number) => [...propIntelKeys.all, "detail", id] as const,
  byHash: (hash: string) => [...propIntelKeys.all, "byHash", hash] as const,
  permits: (id: number) => [...propIntelKeys.all, "permits", id] as const,
  environmental: (id: number) =>
    [...propIntelKeys.all, "environmental", id] as const,
  flood: (id: number) => [...propIntelKeys.all, "flood", id] as const,
  pdfs: (id: number) => [...propIntelKeys.all, "pdfs", id] as const,
};

/**
 * Build query params from filters
 */
function buildSearchParams(filters: PropertySearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.state_code) params.set("state_code", filters.state_code);
  if (filters.city) params.set("city", filters.city);
  if (filters.county) params.set("county", filters.county);
  if (filters.zip) params.set("zip", filters.zip);
  if (filters.has_septic !== undefined)
    params.set("has_septic", String(filters.has_septic));
  if (filters.flood_zone) params.set("flood_zone", filters.flood_zone);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  return params;
}

/**
 * Check API health status
 */
export function usePropIntelHealth() {
  return useQuery({
    queryKey: propIntelKeys.health(),
    queryFn: async (): Promise<Health> => {
      const { data } = await propIntelClient.get("/health");
      return validateResponse(healthSchema, data, "propintel:/health");
    },
    staleTime: 60_000,
    enabled: isPropIntelConfigured(),
    retry: 1,
  });
}

/**
 * Fetch dashboard statistics
 */
export function usePropIntelStats() {
  return useQuery({
    queryKey: propIntelKeys.stats(),
    queryFn: async (): Promise<StatsOverview> => {
      const { data } = await propIntelClient.get("/stats/overview");
      return validateResponse(
        statsOverviewSchema,
        data,
        "propintel:/stats/overview"
      );
    },
    staleTime: 120_000, // 2 minutes
    enabled: isPropIntelConfigured(),
  });
}

/**
 * Search properties with filters
 */
export function usePropertySearch(filters: PropertySearchFilters = {}) {
  return useQuery({
    queryKey: propIntelKeys.search(filters),
    queryFn: async (): Promise<PaginatedProperty> => {
      const params = buildSearchParams(filters);
      const { data } = await propIntelClient.get(
        "/properties/search?" + params.toString()
      );
      return validateResponse(
        paginatedPropertySchema,
        data,
        "propintel:/properties/search"
      );
    },
    staleTime: 30_000,
    enabled: isPropIntelConfigured(),
  });
}

/**
 * Fetch single property by ID
 */
export function usePropertyDetail(id: number | undefined) {
  return useQuery({
    queryKey: propIntelKeys.detail(id!),
    queryFn: async (): Promise<Property> => {
      const { data } = await propIntelClient.get(`/properties/${id}`);
      return validateResponse(
        propertySchema,
        data,
        `propintel:/properties/${id}`
      );
    },
    enabled: !!id && isPropIntelConfigured(),
  });
}

/**
 * Lookup property by address hash (for CRM customer linking)
 */
export function usePropertyByAddressHash(hash: string | undefined) {
  return useQuery({
    queryKey: propIntelKeys.byHash(hash!),
    queryFn: async (): Promise<Property | null> => {
      try {
        const { data } = await propIntelClient.get(
          `/properties/by-address-hash/${hash}`
        );
        return validateResponse(
          propertySchema,
          data,
          `propintel:/properties/by-address-hash/${hash}`
        );
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!hash && isPropIntelConfigured(),
    staleTime: 300_000, // 5 minutes
  });
}

/**
 * Fetch permits for a property
 */
export function usePropertyPermits(id: number | undefined) {
  return useQuery({
    queryKey: propIntelKeys.permits(id!),
    queryFn: async (): Promise<Permit[]> => {
      const { data } = await propIntelClient.get(`/properties/${id}/permits`);
      return Array.isArray(data) ? data : data.items || [];
    },
    enabled: !!id && isPropIntelConfigured(),
  });
}

/**
 * Fetch environmental records for a property
 */
export function usePropertyEnvironmental(id: number | undefined) {
  return useQuery({
    queryKey: propIntelKeys.environmental(id!),
    queryFn: async (): Promise<EnvironmentalRecord[]> => {
      const { data } = await propIntelClient.get(
        `/properties/${id}/environmental`
      );
      return Array.isArray(data) ? data : data.items || [];
    },
    enabled: !!id && isPropIntelConfigured(),
  });
}

/**
 * Fetch flood zone info for a property
 */
export function usePropertyFlood(id: number | undefined) {
  return useQuery({
    queryKey: propIntelKeys.flood(id!),
    queryFn: async (): Promise<FloodZone[]> => {
      const { data } = await propIntelClient.get(`/properties/${id}/flood`);
      return Array.isArray(data) ? data : data.items || [];
    },
    enabled: !!id && isPropIntelConfigured(),
  });
}

/**
 * Fetch PDF extractions for a property
 */
export function usePropertyPdfs(id: number | undefined) {
  return useQuery({
    queryKey: propIntelKeys.pdfs(id!),
    queryFn: async (): Promise<PDFExtraction[]> => {
      const { data } = await propIntelClient.get(`/properties/${id}/pdfs`);
      return Array.isArray(data) ? data : data.items || [];
    },
    enabled: !!id && isPropIntelConfigured(),
  });
}
