import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { validateResponse } from "../validateResponse";
import {
  companyEntityListSchema,
  companyEntitySchema,
  type CompanyEntity,
  type CompanyEntityCreate,
} from "../types/entity";

export const entityKeys = {
  all: ["entities"] as const,
  list: () => [...entityKeys.all, "list"] as const,
  current: () => [...entityKeys.all, "current"] as const,
  detail: (id: string) => [...entityKeys.all, "detail", id] as const,
};

/** Fetch all active entities */
export function useEntities() {
  return useQuery({
    queryKey: entityKeys.list(),
    queryFn: async (): Promise<CompanyEntity[]> => {
      const { data } = await apiClient.get("/entities/");
      return validateResponse(companyEntityListSchema, data);
    },
    staleTime: 5 * 60_000, // entities rarely change
  });
}

/** Fetch currently resolved entity */
export function useCurrentEntity() {
  return useQuery({
    queryKey: entityKeys.current(),
    queryFn: async (): Promise<CompanyEntity> => {
      const { data } = await apiClient.get("/entities/current");
      return validateResponse(companyEntitySchema, data);
    },
    staleTime: 5 * 60_000,
  });
}

/** Create a new entity */
export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entity: CompanyEntityCreate): Promise<CompanyEntity> => {
      const { data } = await apiClient.post("/entities/", entity);
      return validateResponse(companyEntitySchema, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all });
    },
  });
}

/** Update an entity */
export function useUpdateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CompanyEntityCreate> & { id: string }): Promise<CompanyEntity> => {
      const { data } = await apiClient.patch(`/entities/${id}`, updates);
      return validateResponse(companyEntitySchema, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all });
    },
  });
}
