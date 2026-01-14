import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";

/**
 * Types for Compliance API
 */
export interface License {
  id: string;
  license_number: string;
  license_type: string;
  issuing_authority?: string | null;
  issuing_state?: string | null;
  holder_type: string;
  holder_id?: string | null;
  holder_name?: string | null;
  issue_date?: string | null;
  expiry_date: string;
  status: string;
  days_until_expiry?: number | null;
  document_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface Certification {
  id: string;
  name: string;
  certification_type: string;
  certification_number?: string | null;
  issuing_organization?: string | null;
  technician_id: string;
  technician_name?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  status: string;
  days_until_expiry?: number | null;
  training_hours?: number | null;
  document_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface Inspection {
  id: string;
  inspection_number: string;
  inspection_type: string;
  customer_id: number;
  property_address?: string | null;
  system_type?: string | null;
  scheduled_date?: string | null;
  completed_date?: string | null;
  technician_id?: string | null;
  technician_name?: string | null;
  status: string;
  result?: string | null;
  overall_condition?: string | null;
  requires_followup: boolean;
  notes?: string | null;
  created_at?: string | null;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ComplianceDashboard {
  expiring_licenses: License[];
  expiring_certifications: Certification[];
  pending_inspections: Inspection[];
  overdue_inspections: Inspection[];
  summary: {
    total_licenses: number;
    expiring_licenses_count: number;
    total_certifications: number;
    expiring_certifications_count: number;
    total_inspections: number;
    completed_inspections: number;
    pending_inspections_count: number;
    overdue_inspections_count: number;
  };
}

export interface LicenseFilters {
  page?: number;
  page_size?: number;
  holder_type?: string;
  status?: string;
  expiring_within_days?: number;
}

export interface CertificationFilters {
  page?: number;
  page_size?: number;
  technician_id?: string;
  certification_type?: string;
  status?: string;
  expiring_within_days?: number;
}

export interface InspectionFilters {
  page?: number;
  page_size?: number;
  customer_id?: number;
  technician_id?: string;
  status?: string;
  inspection_type?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Query keys
 */
export const complianceKeys = {
  all: ["compliance"] as const,
  dashboard: (days?: number) =>
    [...complianceKeys.all, "dashboard", days] as const,
  licenses: (filters?: LicenseFilters) =>
    [...complianceKeys.all, "licenses", filters] as const,
  license: (id: string) => [...complianceKeys.all, "license", id] as const,
  certifications: (filters?: CertificationFilters) =>
    [...complianceKeys.all, "certifications", filters] as const,
  certification: (id: string) =>
    [...complianceKeys.all, "certification", id] as const,
  inspections: (filters?: InspectionFilters) =>
    [...complianceKeys.all, "inspections", filters] as const,
  inspection: (id: string) =>
    [...complianceKeys.all, "inspection", id] as const,
};

// ========================
// Dashboard
// ========================

export function useComplianceDashboard(expiringWithinDays: number = 30) {
  return useQuery({
    queryKey: complianceKeys.dashboard(expiringWithinDays),
    queryFn: async (): Promise<ComplianceDashboard> => {
      const { data } = await apiClient.get(
        `/compliance/dashboard?expiring_within_days=${expiringWithinDays}`,
      );
      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

// ========================
// Licenses
// ========================

export function useLicenses(filters?: LicenseFilters) {
  return useQuery({
    queryKey: complianceKeys.licenses(filters),
    queryFn: async (): Promise<ListResponse<License>> => {
      const params = new URLSearchParams();
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.page_size)
        params.set("page_size", String(filters.page_size));
      if (filters?.holder_type) params.set("holder_type", filters.holder_type);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.expiring_within_days)
        params.set(
          "expiring_within_days",
          String(filters.expiring_within_days),
        );

      const url =
        "/compliance/licenses" +
        (params.toString() ? "?" + params.toString() : "");
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useLicense(id: string) {
  return useQuery({
    queryKey: complianceKeys.license(id),
    queryFn: async (): Promise<License> => {
      const { data } = await apiClient.get(`/compliance/licenses/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      license: Omit<
        License,
        "id" | "status" | "days_until_expiry" | "created_at"
      >,
    ) => {
      const { data } = await apiClient.post("/compliance/licenses", license);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

export function useUpdateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<License>;
    }) => {
      const { data } = await apiClient.patch(
        `/compliance/licenses/${id}`,
        updates,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

export function useDeleteLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/compliance/licenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

// ========================
// Certifications
// ========================

export function useCertifications(filters?: CertificationFilters) {
  return useQuery({
    queryKey: complianceKeys.certifications(filters),
    queryFn: async (): Promise<ListResponse<Certification>> => {
      const params = new URLSearchParams();
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.page_size)
        params.set("page_size", String(filters.page_size));
      if (filters?.technician_id)
        params.set("technician_id", filters.technician_id);
      if (filters?.certification_type)
        params.set("certification_type", filters.certification_type);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.expiring_within_days)
        params.set(
          "expiring_within_days",
          String(filters.expiring_within_days),
        );

      const url =
        "/compliance/certifications" +
        (params.toString() ? "?" + params.toString() : "");
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCertification(id: string) {
  return useQuery({
    queryKey: complianceKeys.certification(id),
    queryFn: async (): Promise<Certification> => {
      const { data } = await apiClient.get(`/compliance/certifications/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      cert: Omit<
        Certification,
        "id" | "status" | "days_until_expiry" | "created_at"
      >,
    ) => {
      const { data } = await apiClient.post("/compliance/certifications", cert);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

export function useUpdateCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Certification>;
    }) => {
      const { data } = await apiClient.patch(
        `/compliance/certifications/${id}`,
        updates,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/compliance/certifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

// ========================
// Inspections
// ========================

export function useInspections(filters?: InspectionFilters) {
  return useQuery({
    queryKey: complianceKeys.inspections(filters),
    queryFn: async (): Promise<ListResponse<Inspection>> => {
      const params = new URLSearchParams();
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.page_size)
        params.set("page_size", String(filters.page_size));
      if (filters?.customer_id)
        params.set("customer_id", String(filters.customer_id));
      if (filters?.technician_id)
        params.set("technician_id", filters.technician_id);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.inspection_type)
        params.set("inspection_type", filters.inspection_type);
      if (filters?.date_from) params.set("date_from", filters.date_from);
      if (filters?.date_to) params.set("date_to", filters.date_to);

      const url =
        "/compliance/inspections" +
        (params.toString() ? "?" + params.toString() : "");
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: complianceKeys.inspection(id),
    queryFn: async (): Promise<Inspection> => {
      const { data } = await apiClient.get(`/compliance/inspections/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      inspection: Omit<
        Inspection,
        | "id"
        | "inspection_number"
        | "status"
        | "result"
        | "overall_condition"
        | "requires_followup"
        | "created_at"
      >,
    ) => {
      const { data } = await apiClient.post(
        "/compliance/inspections",
        inspection,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Inspection>;
    }) => {
      const { data } = await apiClient.patch(
        `/compliance/inspections/${id}`,
        updates,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/compliance/inspections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}
