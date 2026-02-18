import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  certificationListResponseSchema,
  licenseListResponseSchema,
  type CertificationListResponse,
  type LicenseListResponse,
} from "../types/compliance.ts";

/**
 * Fetch certifications for a specific technician
 */
export function useTechnicianCertifications(technicianId: string | undefined) {
  return useQuery({
    queryKey: ["compliance", "certifications", technicianId],
    queryFn: async (): Promise<CertificationListResponse> => {
      const params = new URLSearchParams({
        technician_id: technicianId!,
        page_size: "100",
      });
      const { data } = await apiClient.get(`/compliance/certifications?${params}`);
      return validateResponse(
        certificationListResponseSchema,
        data,
        `/compliance/certifications?technician_id=${technicianId}`
      );
    },
    enabled: !!technicianId,
    staleTime: 60_000,
  });
}

/**
 * Fetch licenses for a specific technician
 * Backend doesn't have holder_id filter, so we fetch all technician licenses
 * and filter client-side (small dataset)
 */
export function useTechnicianLicenses(technicianId: string | undefined) {
  return useQuery({
    queryKey: ["compliance", "licenses", "technician", technicianId],
    queryFn: async (): Promise<LicenseListResponse> => {
      const params = new URLSearchParams({
        holder_type: "technician",
        page_size: "100",
      });
      const { data } = await apiClient.get(`/compliance/licenses?${params}`);
      const validated = validateResponse(
        licenseListResponseSchema,
        data,
        `/compliance/licenses?holder_type=technician`
      );
      // Client-side filter by holder_id
      const filtered = validated.items.filter(
        (license) => license.holder_id === technicianId
      );
      return {
        ...validated,
        items: filtered,
        total: filtered.length,
      };
    },
    enabled: !!technicianId,
    staleTime: 60_000,
  });
}
