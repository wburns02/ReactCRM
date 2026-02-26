import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

// =====================================================
// Existing Smart Dispatch (recommend + assign)
// =====================================================

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
    enabled: false,
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

// =====================================================
// Command Center (quick dispatch from phone call)
// =====================================================

interface CustomerLookupResult {
  found: boolean;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    system_type: string | null;
    manufacturer: string | null;
  } | null;
  last_work_order: {
    id: string;
    job_type: string | null;
    status: string | null;
    scheduled_date: string | null;
  } | null;
}

interface QuickCreateRequest {
  customer_id?: string | null;
  new_customer?: {
    first_name: string;
    last_name: string;
    phone: string;
    address_line1: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null;
  job_type: string;
  scheduled_date: string;
  technician_id: string;
  notes?: string;
  notify_tech: boolean;
}

interface QuickCreateResult {
  success: boolean;
  work_order_id: string;
  work_order_number: string;
  customer_id: string;
  customer_name: string;
  technician_name: string;
  sms_sent: boolean;
}

interface NotifyResult {
  success: boolean;
  technician_name: string;
  message: string;
}

/**
 * Look up customer by phone number (auto-fires when phone has 10+ digits)
 */
export function useCustomerLookup(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  return useQuery({
    queryKey: ["dispatch", "customer-lookup", normalized],
    queryFn: async (): Promise<CustomerLookupResult> => {
      const { data } = await apiClient.get(`/dispatch/customer-lookup?phone=${encodeURIComponent(normalized)}`);
      return data;
    },
    enabled: normalized.length >= 10,
    staleTime: 60_000,
  });
}

/**
 * Create work order + optional new customer + SMS tech in one call
 */
export function useQuickCreate() {
  return useMutation({
    mutationFn: async (req: QuickCreateRequest): Promise<QuickCreateResult> => {
      const { data } = await apiClient.post("/dispatch/quick-create", req);
      return data;
    },
    onSuccess: (data) => {
      toastSuccess(
        `${data.work_order_number} created`,
        data.sms_sent
          ? `SMS sent to ${data.technician_name}`
          : `Assigned to ${data.technician_name} (SMS not sent)`,
      );
    },
    onError: (error) => {
      console.error("[QuickCreate] Failed:", error);
      toastError("Failed to create job", "Please try again.");
    },
  });
}

/**
 * Send SMS notification to assigned tech for an existing work order
 */
// --- Smart Dispatch types & hooks ---

export interface TechRecommendation {
  technician_id: string;
  name: string;
  score: number;
  distance_miles: number | null;
  estimated_travel_minutes: number | null;
  availability: string;
  location_source: string | null;
  job_load: { scheduled_today: number; active_jobs: number };
  skills_missing: string[];
}

/**
 * Get dispatch recommendation for a work order (not used directly — SmartAssign calls apiClient)
 */
export function useDispatchRecommendation(workOrderId: string) {
  return useQuery({
    queryKey: ["dispatch", "recommend", workOrderId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/dispatch/recommend/${workOrderId}`);
      return data.recommended_technicians as TechRecommendation[];
    },
    enabled: !!workOrderId,
  });
}

/**
 * Assign a technician to a work order via dispatch
 */
export function useDispatchAssign() {
  return useMutation({
    mutationFn: async ({ workOrderId, technicianId }: { workOrderId: string; technicianId: string }) => {
      const { data } = await apiClient.post("/dispatch/assign", {
        work_order_id: workOrderId,
        technician_id: technicianId,
      });
      return data;
    },
    onSuccess: () => {
      toastSuccess("Technician assigned", "Work order updated successfully.");
    },
    onError: () => {
      toastError("Assignment failed", "Could not assign technician.");
    },
  });
}

export function useNotifyTech() {
  return useMutation({
    mutationFn: async (workOrderId: string): Promise<NotifyResult> => {
      const { data } = await apiClient.post("/dispatch/notify", { work_order_id: workOrderId });
      return data;
    },
    onSuccess: (data) => {
      toastSuccess("SMS sent", data.message);
    },
    onError: (error) => {
      console.error("[NotifyTech] Failed:", error);
      toastError("SMS failed", "Could not notify technician.");
    },
  });
}
