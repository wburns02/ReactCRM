import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const enrollmentSchema = z.object({
  id: z.string(),
  employee_id: z.string().nullable(),
  employee_name: z.string(),
  employee_title: z.string().nullable(),
  plan_id: z.string().nullable(),
  plan_name: z.string().nullable(),
  carrier: z.string().nullable(),
  benefit_type: z.string(),
  status: z.string(),
  effective_date: z.string().nullable(),
  termination_date: z.string().nullable(),
  monthly_cost: z.union([z.string(), z.number()]).nullable(),
  monthly_deduction: z.union([z.string(), z.number()]).nullable(),
});
export type Enrollment = z.infer<typeof enrollmentSchema>;


export const eventSchema = z.object({
  id: z.string(),
  employee_id: z.string().nullable(),
  employee_name: z.string(),
  employee_title: z.string().nullable(),
  event_type: z.string(),
  status: z.string(),
  effective_date: z.string().nullable(),
  completion_date: z.string().nullable(),
  is_archived: z.boolean(),
});
export type BenefitEvent = z.infer<typeof eventSchema>;


export const eoiSchema = z.object({
  id: z.string(),
  employee_id: z.string().nullable(),
  employee_name: z.string(),
  member_name: z.string(),
  member_type: z.string(),
  benefit_type: z.string(),
  plan_name: z.string().nullable(),
  status: z.string(),
  enrollment_created_at: z.string().nullable(),
  enrollment_ends_at: z.string().nullable(),
});
export type EoiRequest = z.infer<typeof eoiSchema>;


export const historySchema = z.object({
  id: z.string(),
  employee_id: z.string().nullable(),
  employee_name: z.string(),
  change_type: z.string(),
  affected_lines: z.number(),
  completed_date: z.string().nullable(),
  effective_date: z.string().nullable(),
  changed_by: z.string().nullable(),
  is_terminated: z.boolean(),
});
export type HistoryRow = z.infer<typeof historySchema>;


export const overviewSchema = z.object({
  total_enrollments: z.number(),
  active_enrollments: z.number(),
  waived: z.number(),
  terminated: z.number(),
  pending_events: z.number(),
  pending_eoi: z.number(),
  by_benefit_type: z.record(z.string(), z.number()),
  total_monthly_cost: z.union([z.string(), z.number()]),
  total_monthly_deduction: z.union([z.string(), z.number()]),
  generated_at: z.string(),
});
export type BenefitsOverview = z.infer<typeof overviewSchema>;


export function useEnrollments(params: {
  benefit_type?: string;
  status?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: ["benefits", "enrollments", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/benefits/enrollments", {
        params: clean,
      });
      return validateResponse(z.array(enrollmentSchema), data, "enrollments");
    },
    staleTime: 30_000,
  });
}


export function useBenefitEvents(params: {
  event_type?: string;
  status?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: ["benefits", "events", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/benefits/events", {
        params: clean,
      });
      return validateResponse(z.array(eventSchema), data, "events");
    },
    staleTime: 30_000,
  });
}


export function useEoiRequests(params: {
  benefit_type?: string;
  status?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: ["benefits", "eoi", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/benefits/eoi", {
        params: clean,
      });
      return validateResponse(z.array(eoiSchema), data, "eoi");
    },
    staleTime: 30_000,
  });
}


export function useBenefitHistory(params: { q?: string } = {}) {
  return useQuery({
    queryKey: ["benefits", "history", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/benefits/history", {
        params: clean,
      });
      return validateResponse(z.array(historySchema), data, "history");
    },
    staleTime: 30_000,
  });
}


export function useBenefitsOverview() {
  return useQuery({
    queryKey: ["benefits", "overview"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/benefits/overview");
      return validateResponse(overviewSchema, data, "benefits overview");
    },
    staleTime: 30_000,
  });
}
