import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import type {
  DumpSite,
  CreateDumpSiteInput,
  UpdateDumpSiteInput,
  DumpSiteListResponse,
  DumpSiteFilters,
} from "@/api/types/dumpSite.ts";

/**
 * Dump Sites Hooks for waste disposal location management
 */

/**
 * Fetch all dump sites with optional filtering
 */
export function useDumpSites(params?: DumpSiteFilters) {
  return useQuery({
    queryKey: ["dump-sites", params],
    queryFn: async (): Promise<DumpSite[]> => {
      const { data } = await apiClient.get<DumpSiteListResponse>(
        "/dump-sites",
        { params },
      );
      return data.sites || [];
    },
    staleTime: 60_000, // Cache for 1 minute
  });
}

/**
 * Fetch a single dump site by ID
 */
export function useDumpSite(siteId: string) {
  return useQuery({
    queryKey: ["dump-sites", siteId],
    queryFn: async (): Promise<DumpSite> => {
      const { data } = await apiClient.get<DumpSite>(`/dump-sites/${siteId}`);
      return data;
    },
    enabled: !!siteId,
  });
}

/**
 * Create a new dump site
 */
export function useCreateDumpSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDumpSiteInput): Promise<DumpSite> => {
      const { data } = await apiClient.post<DumpSite>("/dump-sites", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dump-sites"] });
    },
  });
}

/**
 * Update an existing dump site
 */
export function useUpdateDumpSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      siteId,
      input,
    }: {
      siteId: string;
      input: UpdateDumpSiteInput;
    }): Promise<DumpSite> => {
      const { data } = await apiClient.patch<DumpSite>(
        `/dump-sites/${siteId}`,
        input,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dump-sites"] });
      queryClient.invalidateQueries({
        queryKey: ["dump-sites", variables.siteId],
      });
    },
  });
}

/**
 * Delete (soft delete) a dump site
 */
export function useDeleteDumpSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (siteId: string): Promise<void> => {
      await apiClient.delete(`/dump-sites/${siteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dump-sites"] });
    },
  });
}
