import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import {
  integrationStatusResponseSchema,
  type IntegrationStatusResponse,
} from "../types/integrationStatus.ts";

async function fetchIntegrationStatus(): Promise<IntegrationStatusResponse> {
  const res = await apiClient.get("/integrations/status");
  return integrationStatusResponseSchema.parse(res.data);
}

export function useIntegrationStatus() {
  return useQuery({
    queryKey: ["integration-status"],
    queryFn: fetchIntegrationStatus,
    // Cache for 5 minutes — env vars don't change often
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
