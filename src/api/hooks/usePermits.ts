import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse, validateArrayResponse } from "../validateResponse.ts";
import {
  permitSearchResponseSchema,
  permitResponseSchema,
  permitStatsOverviewSchema,
  duplicatePairSchema,
  permitHistorySchema,
  customerPermitsResponseSchema,
  prospectsResponseSchema,
  type PermitSearchResponse,
  type PermitResponse,
  type PermitStatsOverview,
  type PermitSearchFilters,
  type State,
  type County,
  type SystemType,
  type SourcePortal,
  type DuplicatePair,
  type DuplicateResolution,
  type DuplicateResponse,
  type PermitHistory,
  type CustomerPermitsResponse,
  type PermitLinkResponse,
  type BatchLinkResponse,
  type PermitLookupResult,
  type ProspectsResponse,
  type ProspectFilters,
} from "../types/permit.ts";

/**
 * Query keys for permits
 */
export const permitKeys = {
  all: ["permits"] as const,
  lists: () => [...permitKeys.all, "list"] as const,
  list: (filters: PermitSearchFilters) =>
    [...permitKeys.lists(), filters] as const,
  infinite: (filters: PermitSearchFilters) =>
    [...permitKeys.all, "infinite", filters] as const,
  details: () => [...permitKeys.all, "detail"] as const,
  detail: (id: string) => [...permitKeys.details(), id] as const,
  history: (id: string) => [...permitKeys.all, "history", id] as const,
  stats: () => [...permitKeys.all, "stats"] as const,
  duplicates: () => [...permitKeys.all, "duplicates"] as const,
  customerPermits: (customerId: string) =>
    [...permitKeys.all, "customer", customerId] as const,
  lookup: (address?: string, phone?: string) =>
    [...permitKeys.all, "lookup", address, phone] as const,
  prospects: (filters: ProspectFilters) =>
    [...permitKeys.all, "prospects", filters] as const,
  ref: {
    states: () => ["permits-ref", "states"] as const,
    counties: (stateCode?: string) =>
      ["permits-ref", "counties", stateCode] as const,
    systemTypes: () => ["permits-ref", "system-types"] as const,
    portals: () => ["permits-ref", "portals"] as const,
  },
};

/**
 * Build query params from filters
 */
function buildSearchParams(filters: PermitSearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set("query", filters.query);
  if (filters.state_codes?.length)
    params.set("state_codes", filters.state_codes.join(","));
  if (filters.county_ids?.length)
    params.set("county_ids", filters.county_ids.join(","));
  if (filters.city) params.set("city", filters.city);
  if (filters.zip_code) params.set("zip_code", filters.zip_code);
  if (filters.permit_date_from)
    params.set("permit_date_from", filters.permit_date_from);
  if (filters.permit_date_to)
    params.set("permit_date_to", filters.permit_date_to);
  if (filters.latitude) params.set("latitude", String(filters.latitude));
  if (filters.longitude) params.set("longitude", String(filters.longitude));
  if (filters.radius_miles)
    params.set("radius_miles", String(filters.radius_miles));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  if (filters.include_inactive) params.set("include_inactive", "true");

  return params;
}

/**
 * Search permits with pagination
 */
export function usePermitSearch(filters: PermitSearchFilters = {}) {
  return useQuery({
    queryKey: permitKeys.list(filters),
    queryFn: async (): Promise<PermitSearchResponse> => {
      const params = buildSearchParams(filters);
      const url = "/permits/search?" + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        permitSearchResponseSchema,
        data,
        "/permits/search"
      );
    },
    staleTime: 30_000, // 30 seconds
    enabled: true,
  });
}

/**
 * Search permits with infinite scroll
 */
export function usePermitSearchInfinite(
  filters: Omit<PermitSearchFilters, "page">,
) {
  return useInfiniteQuery({
    queryKey: permitKeys.infinite(filters),
    queryFn: async ({ pageParam = 1 }): Promise<PermitSearchResponse> => {
      const params = buildSearchParams({ ...filters, page: pageParam });
      const url = "/permits/search?" + params.toString();
      const { data } = await apiClient.get(url);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch single permit by ID
 */
export function usePermit(id: string | undefined) {
  return useQuery({
    queryKey: permitKeys.detail(id!),
    queryFn: async (): Promise<PermitResponse> => {
      const { data } = await apiClient.get(`/permits/${id}`);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(permitResponseSchema, data, `/permits/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Fetch permit version history
 */
export function usePermitHistory(id: string | undefined) {
  return useQuery({
    queryKey: permitKeys.history(id!),
    queryFn: async (): Promise<PermitHistory> => {
      const { data } = await apiClient.get(`/permits/${id}/history`);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(permitHistorySchema, data, `/permits/${id}/history`);
    },
    enabled: !!id,
  });
}

/**
 * Property data linked to a permit
 */
export interface PermitProperty {
  permit_id: string;
  property: {
    id: string;
    address: string | null;
    address_normalized: string | null;
    street_number: string | null;
    street_name: string | null;
    city: string | null;
    zip_code: string | null;
    subdivision: string | null;
    parcel_id: string | null;
    gis_link: string | null;
    latitude: number | null;
    longitude: number | null;
    year_built: number | null;
    square_footage: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    stories: number | null;
    foundation_type: string | null;
    construction_type: string | null;
    lot_size_acres: number | null;
    lot_size_sqft: number | null;
    calculated_acres: number | null;
    assessed_value: number | null;
    assessed_land: number | null;
    assessed_improvement: number | null;
    market_value: number | null;
    market_land: number | null;
    market_improvement: number | null;
    last_assessed_date: string | null;
    owner_name: string | null;
    owner_name_2: string | null;
    owner_mailing_address: string | null;
    owner_city: string | null;
    owner_state: string | null;
    owner_zip: string | null;
    last_sale_date: string | null;
    last_sale_price: number | null;
    deed_book: string | null;
    deed_page: string | null;
    property_type: string | null;
    property_type_code: string | null;
    parcel_type: string | null;
    zoning: string | null;
    data_quality_score: number | null;
    has_building_details: boolean;
    source_portal_code: string | null;
    scraped_at: string | null;
  } | null;
  all_permits: Array<{
    id: string;
    permit_number: string | null;
    address: string | null;
    city: string | null;
    state_code: string | null;
    county_name: string | null;
    owner_name: string | null;
    permit_date: string | null;
    install_date: string | null;
    system_type: string | null;
    tank_size_gallons: number | null;
    drainfield_size_sqft: number | null;
    permit_url: string | null;
    pdf_url: string | null;
    is_current: boolean;
  }>;
  total_permits: number;
  message?: string;
}

/**
 * Fetch linked property for a permit
 */
export function usePermitProperty(id: string | undefined) {
  return useQuery({
    queryKey: [...permitKeys.detail(id!), "property"],
    queryFn: async (): Promise<PermitProperty> => {
      const { data } = await apiClient.get(`/permits/${id}/property`);
      return data;
    },
    enabled: !!id,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Fetch dashboard statistics
 */
export function usePermitStats() {
  return useQuery({
    queryKey: permitKeys.stats(),
    queryFn: async (): Promise<PermitStatsOverview> => {
      const { data } = await apiClient.get("/permits/stats/overview");

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        permitStatsOverviewSchema,
        data,
        "/permits/stats/overview"
      );
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Fetch duplicate pairs for review
 */
export function useDuplicatePermits(status: string = "pending") {
  return useQuery({
    queryKey: [...permitKeys.duplicates(), status],
    queryFn: async (): Promise<DuplicatePair[]> => {
      const { data } = await apiClient.get(
        `/permits/duplicates?status_filter=${status}`,
      );

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateArrayResponse(
        duplicatePairSchema,
        data,
        "/permits/duplicates"
      );
    },
    staleTime: 30_000,
  });
}

/**
 * Resolve a duplicate pair
 */
export function useResolveDuplicate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      duplicateId,
      resolution,
    }: {
      duplicateId: string;
      resolution: DuplicateResolution;
    }): Promise<DuplicateResponse> => {
      const { data } = await apiClient.post(
        `/permits/duplicates/${duplicateId}/resolve`,
        resolution,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permitKeys.duplicates() });
      queryClient.invalidateQueries({ queryKey: permitKeys.stats() });
    },
  });
}

// ===== REFERENCE DATA HOOKS =====

/**
 * Fetch all US states
 */
export function useStates() {
  return useQuery({
    queryKey: permitKeys.ref.states(),
    queryFn: async (): Promise<State[]> => {
      const { data } = await apiClient.get("/permits/ref/states");
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - rarely changes
  });
}

/**
 * Fetch counties, optionally filtered by state
 */
export function useCounties(stateCode?: string) {
  return useQuery({
    queryKey: permitKeys.ref.counties(stateCode),
    queryFn: async (): Promise<County[]> => {
      const url = stateCode
        ? `/permits/ref/counties?state_code=${stateCode}`
        : "/permits/ref/counties";
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: stateCode === undefined || !!stateCode,
  });
}

/**
 * Fetch septic system types
 */
export function useSystemTypes() {
  return useQuery({
    queryKey: permitKeys.ref.systemTypes(),
    queryFn: async (): Promise<SystemType[]> => {
      const { data } = await apiClient.get("/permits/ref/system-types");
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Fetch source portals
 */
export function useSourcePortals() {
  return useQuery({
    queryKey: permitKeys.ref.portals(),
    queryFn: async (): Promise<SourcePortal[]> => {
      const { data } = await apiClient.get("/permits/ref/portals");
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
