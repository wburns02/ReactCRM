import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const certificationSchema = z.object({
  id: z.string(),
  employee_id: z.string(),
  kind: z.string(),
  number: z.string().nullable(),
  issued_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  issuing_authority: z.string().nullable(),
  document_storage_key: z.string().nullable(),
  status: z.enum(["active", "expired", "pending"]),
  notes: z.string().nullable(),
  created_at: z.string(),
});
export type Certification = z.infer<typeof certificationSchema>;


export const employeeDocumentSchema = z.object({
  id: z.string(),
  employee_id: z.string(),
  kind: z.string(),
  storage_key: z.string(),
  signed_document_id: z.string().nullable(),
  uploaded_at: z.string(),
  expires_at: z.string().nullable(),
});
export type EmployeeDocument = z.infer<typeof employeeDocumentSchema>;


export const accessGrantSchema = z.object({
  id: z.string(),
  employee_id: z.string(),
  system: z.string(),
  identifier: z.string().nullable(),
  granted_at: z.string(),
  revoked_at: z.string().nullable(),
});
export type AccessGrant = z.infer<typeof accessGrantSchema>;


export const truckAssignmentSchema = z.object({
  id: z.string(),
  employee_id: z.string(),
  truck_id: z.string(),
  assigned_at: z.string(),
  unassigned_at: z.string().nullable(),
  assigned_by: z.number().nullable(),
  unassigned_by: z.number().nullable(),
});
export type TruckAssignment = z.infer<typeof truckAssignmentSchema>;


export const employeeKeys = {
  all: ["hr", "employees"] as const,
  certs: (id: string) => [...employeeKeys.all, id, "certs"] as const,
  docs: (id: string) => [...employeeKeys.all, id, "docs"] as const,
  trucks: (id: string) => [...employeeKeys.all, id, "trucks"] as const,
  grants: (id: string) => [...employeeKeys.all, id, "grants"] as const,
};


export function useCertifications(employeeId: string | undefined) {
  return useQuery({
    enabled: !!employeeId,
    queryKey: employeeKeys.certs(employeeId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/hr/employees/${employeeId}/certifications`,
      );
      return validateResponse(
        z.array(certificationSchema),
        data,
        "certifications",
      );
    },
  });
}


export function useDocuments(employeeId: string | undefined) {
  return useQuery({
    enabled: !!employeeId,
    queryKey: employeeKeys.docs(employeeId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/hr/employees/${employeeId}/documents`,
      );
      return validateResponse(
        z.array(employeeDocumentSchema),
        data,
        "documents",
      );
    },
  });
}


export function useTruckAssignments(employeeId: string | undefined) {
  return useQuery({
    enabled: !!employeeId,
    queryKey: employeeKeys.trucks(employeeId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/hr/employees/${employeeId}/truck-assignments`,
      );
      return validateResponse(
        z.array(truckAssignmentSchema),
        data,
        "truck-assignments",
      );
    },
  });
}


export function useAccessGrants(employeeId: string | undefined) {
  return useQuery({
    enabled: !!employeeId,
    queryKey: employeeKeys.grants(employeeId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/hr/employees/${employeeId}/access-grants`,
      );
      return validateResponse(
        z.array(accessGrantSchema),
        data,
        "access-grants",
      );
    },
  });
}


export function useCreateCertification(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      kind: string;
      number?: string;
      expires_at?: string;
      issuing_authority?: string;
    }) => {
      const { data } = await apiClient.post(
        `/hr/employees/${employeeId}/certifications`,
        payload,
      );
      return certificationSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: employeeKeys.certs(employeeId) }),
  });
}
