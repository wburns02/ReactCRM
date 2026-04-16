import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const requisitionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  department: z.string().nullable(),
  location_city: z.string().nullable(),
  location_state: z.string().nullable(),
  employment_type: z.enum(["full_time", "part_time", "contract"]),
  compensation_display: z.string().nullable(),
  description_md: z.string().nullable(),
  requirements_md: z.string().nullable(),
  benefits_md: z.string().nullable(),
  status: z.enum(["draft", "open", "paused", "closed"]),
  opened_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  hiring_manager_id: z.number().nullable(),
  onboarding_template_id: z.string().nullable(),
  created_at: z.string(),
});

export type Requisition = z.infer<typeof requisitionSchema>;


export const requisitionInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  department: z.string().nullable().optional(),
  location_city: z.string().nullable().optional(),
  location_state: z.string().nullable().optional(),
  employment_type: z.enum(["full_time", "part_time", "contract"]),
  compensation_display: z.string().nullable().optional(),
  description_md: z.string().nullable().optional(),
  requirements_md: z.string().nullable().optional(),
  benefits_md: z.string().nullable().optional(),
  status: z.enum(["draft", "open", "paused", "closed"]),
  hiring_manager_id: z.number().nullable().optional(),
  onboarding_template_id: z.string().nullable().optional(),
});

export type RequisitionInput = z.infer<typeof requisitionInputSchema>;


export const hrKeys = {
  all: ["hr"] as const,
  requisitions: (status?: string) =>
    [...hrKeys.all, "requisitions", status ?? "all"] as const,
};


export function useRequisitions(status?: string) {
  return useQuery({
    queryKey: hrKeys.requisitions(status),
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/recruiting/requisitions", {
        params: status ? { status } : undefined,
      });
      return validateResponse(
        z.array(requisitionSchema),
        data,
        "/hr/recruiting/requisitions",
      );
    },
    staleTime: 30_000,
  });
}


export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RequisitionInput) => {
      const { data } = await apiClient.post(
        "/hr/recruiting/requisitions",
        payload,
      );
      return validateResponse(
        requisitionSchema,
        data,
        "/hr/recruiting/requisitions (create)",
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...hrKeys.all, "requisitions"] }),
  });
}
