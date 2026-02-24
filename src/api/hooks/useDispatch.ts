import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

export interface TechRecommendation {
  technician_id: string;
  name: string;
  phone?: string | null;
  distance_miles?: number | null;
  estimated_travel_minutes?: number | null;
  location_source?: string | null;
  skills_match: string[];
  skills_missing: string[];
  availability: string;
  job_load: { active_jobs: number; scheduled_today: number };
  score: number;
}

export interface DispatchRecommendation {
  work_order_id: string;
  job_type?: string;
  job_location?: { lat: number | null; lng: number | null; address: string };
  priority?: string;
  recommended_technicians: TechRecommendation[];
  total_active_technicians: number;
  message?: string;
}

export function useDispatchRecommendation(workOrderId: string | undefined) {
  return useQuery<DispatchRecommendation>({
    queryKey: ["dispatch", "recommend", workOrderId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/dispatch/recommend/${workOrderId}`,
      );
      return data;
    },
    enabled: false, // Only fetch on demand
    staleTime: 60_000,
  });
}

export function useDispatchAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workOrderId,
      technicianId,
    }: {
      workOrderId: string;
      technicianId: string;
    }) => {
      const { data } = await apiClient.post(
        `/dispatch/assign/${workOrderId}`,
        { technician_id: technicianId },
      );
      return data;
    },
    onSuccess: (data) => {
      toastSuccess(data.message || "Technician assigned");
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch"] });
    },
    onError: (err: Error) => {
      toastError(err.message || "Failed to assign technician");
    },
  });
}
