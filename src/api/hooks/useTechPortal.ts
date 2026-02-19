import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, withFallback } from "@/api/client.ts";
import type {
  TechWorkOrder,
  TechWorkOrderList,
  TimeEntry,
  Commission,
  PayrollPeriod,
  Message,
  ScheduleJob,
} from "@/api/types/techPortal.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { workOrderPhotoKeys } from "@/api/hooks/useWorkOrderPhotos";

// Re-export all employee hooks for convenience
export {
  useClockIn,
  useClockOut,
  useStartJob,
  useCompleteJob,
  useRevertJobStatus,
  useTimeClockStatus,
  useTimeClockHistory,
  useEmployeeProfile,
} from "./useEmployee.ts";

// Re-export dashboard hook
export { useTechnicianDashboard } from "./useTechnicianDashboard.ts";

// ── My Jobs (extended work order list) ──────────────────────────────────

interface JobFilters {
  status?: string;
  job_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
  scheduled_date_from?: string;
  scheduled_date_to?: string;
}

export function useTechJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", filters],
    queryFn: async (): Promise<TechWorkOrderList> => {
      return withFallback(async () => {
        const params: Record<string, string | number> = {};
        if (filters.status) params.status = filters.status;
        if (filters.job_type) params.job_type = filters.job_type;
        if (filters.search) params.search = filters.search;
        if (filters.page) params.page = filters.page;
        if (filters.page_size) params.page_size = filters.page_size;
        if (filters.scheduled_date_from) params.scheduled_date_from = filters.scheduled_date_from;
        if (filters.scheduled_date_to) params.scheduled_date_to = filters.scheduled_date_to;
        // Use employee-portal/jobs which auto-filters by current technician
        const { data } = await apiClient.get("/employee/jobs", { params });
        // Normalize response shape
        if (Array.isArray(data)) {
          return { items: data, total: data.length, page: 1, page_size: 50 };
        }
        return {
          items: data.items || data.jobs || [],
          total: data.total || 0,
          page: data.page || 1,
          page_size: data.page_size || 20,
        };
      }, { items: [], total: 0, page: 1, page_size: 20 });
    },
    staleTime: 30_000,
  });
}

export function useTechJobDetail(jobId: string) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", jobId],
    queryFn: async (): Promise<TechWorkOrder | null> => {
      return withFallback(async () => {
        const { data } = await apiClient.get(`/work-orders/${jobId}`);
        return data;
      }, null);
    },
    enabled: !!jobId,
  });
}

// ── Schedule (jobs by date range) ───────────────────────────────────────

export function useTechSchedule(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["tech-portal", "schedule", startDate, endDate],
    queryFn: async (): Promise<ScheduleJob[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/employee/jobs", {
          params: {
            scheduled_date_from: startDate,
            scheduled_date_to: endDate,
          },
        });
        const items = Array.isArray(data) ? data : (data.items || data.jobs || []);
        return items;
      }, []);
    },
    staleTime: 60_000,
  });
}

// ── Pay & Commissions ───────────────────────────────────────────────────

export function useTechCurrentPeriod() {
  return useQuery({
    queryKey: ["tech-portal", "payroll", "current"],
    queryFn: async (): Promise<PayrollPeriod | null> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/payroll/periods/current");
        return data;
      }, null);
    },
    staleTime: 300_000,
  });
}

export function useTechCommissions(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ["tech-portal", "commissions", params],
    queryFn: async (): Promise<{ items: Commission[]; total: number }> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/payroll/commissions", { params });
        return {
          items: data.items || data.commissions || [],
          total: data.total || 0,
        };
      }, { items: [], total: 0 });
    },
    staleTime: 60_000,
  });
}

export function useTechPayRates(technicianId: string) {
  return useQuery({
    queryKey: ["tech-portal", "pay-rates", technicianId],
    queryFn: async () => {
      return withFallback(async () => {
        const { data } = await apiClient.get(`/payroll/pay-rates/${technicianId}`);
        return data;
      }, null);
    },
    enabled: !!technicianId,
  });
}

// ── Time Entries (for detailed clock history) ───────────────────────────

export function useTechTimeEntries(params?: {
  start_date?: string;
  end_date?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["tech-portal", "time-entries", params],
    queryFn: async (): Promise<TimeEntry[]> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/payroll/time-entries", { params });
        return data.items || data.entries || [];
      }, []);
    },
    staleTime: 30_000,
  });
}

// ── Communications ──────────────────────────────────────────────────────

export function useTechMessages(params?: { page?: number; message_type?: string }) {
  return useQuery({
    queryKey: ["tech-portal", "messages", params],
    queryFn: async (): Promise<{ items: Message[]; total: number }> => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/communications/history", { params });
        return {
          items: data.items || data.messages || [],
          total: data.total || 0,
        };
      }, { items: [], total: 0 });
    },
    staleTime: 60_000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      type: "sms" | "email";
      to: string;
      subject?: string;
      content: string;
    }) => {
      const endpoint = input.type === "sms"
        ? "/communications/sms/send"
        : "/communications/email/send";
      const body = input.type === "sms"
        ? { to_number: input.to, content: input.content }
        : { to_email: input.to, subject: input.subject, content: input.content };
      const { data } = await apiClient.post(endpoint, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "messages"] });
      toastSuccess("Message sent!");
    },
    onError: () => {
      toastError("Failed to send message");
    },
  });
}

// ── Profile / Settings ──────────────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      phone?: string;
      email?: string;
      home_address?: string;
      home_city?: string;
      home_state?: string;
      home_postal_code?: string;
    }) => {
      const { data } = await apiClient.patch("/employee/profile", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toastSuccess("Profile updated!");
    },
    onError: () => {
      toastError("Failed to update profile");
    },
  });
}

// ── Job Photos ──────────────────────────────────────────────────────────

export function useJobPhotos(jobId: string) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", jobId, "photos"],
    queryFn: async () => {
      return withFallback(async () => {
        const { data } = await apiClient.get(`/employee/jobs/${jobId}/photos`);
        return data as Array<{
          id: string;
          work_order_id: string;
          photo_type: string;
          data_url: string;
          thumbnail_url: string | null;
          timestamp: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          created_at: string | null;
        }>;
      }, []);
    },
    enabled: !!jobId,
    staleTime: 30_000,
  });
}

export function useUploadJobPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      photo,
      photoType = "other",
    }: {
      jobId: string;
      photo: string;
      photoType?: string;
    }) => {
      const { data } = await apiClient.post(
        `/employee/jobs/${jobId}/photos/base64`,
        { photo_data: photo, photo_type: photoType },
      );
      return data;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "jobs", jobId, "photos"] });
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "jobs", jobId] });
      // Also invalidate the useWorkOrderPhotos query so PDF generation picks up new photos
      queryClient.invalidateQueries({ queryKey: workOrderPhotoKeys.list(jobId) });
      toastSuccess("Photo uploaded!");
    },
    onError: () => {
      toastError("Failed to upload photo");
    },
  });
}

// ── Job Payments ────────────────────────────────────────────────────────

export function useJobPayments(jobId: string) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", jobId, "payments"],
    queryFn: async () => {
      return withFallback(async () => {
        const { data } = await apiClient.get(`/employee/jobs/${jobId}/payments`);
        return data as Array<{
          id: string;
          work_order_id: string | null;
          amount: number;
          payment_method: string;
          status: string;
          description: string | null;
          payment_date: string | null;
          created_at: string | null;
        }>;
      }, []);
    },
    enabled: !!jobId,
    staleTime: 30_000,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      payment_method,
      amount,
      check_number,
      notes,
    }: {
      jobId: string;
      payment_method: string;
      amount: number;
      check_number?: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/payment`, {
        payment_method,
        amount,
        check_number,
        notes,
      });
      return data;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "jobs", jobId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["tech-portal", "jobs", jobId] });
      toastSuccess("Payment recorded!");
    },
    onError: () => {
      toastError("Failed to record payment");
    },
  });
}

// ── GPS Location Update ─────────────────────────────────────────────────

export function useUpdateLocation() {
  return useMutation({
    mutationFn: async (input: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    }) => {
      const { data } = await apiClient.post("/gps/location", input);
      return data;
    },
  });
}

// ── Customer Service History ────────────────────────────────────────────

export interface ServiceHistoryItem {
  id: string;
  work_order_number: string | null;
  job_type: string | null;
  status: string | null;
  priority: string | null;
  scheduled_date: string | null;
  notes: string | null;
  total_amount: number | null;
  assigned_technician: string | null;
  photo_count: number;
  service_address_line1: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  total_labor_minutes: number | null;
  created_at: string | null;
}

export interface ServiceHistoryResponse {
  customer_id: string;
  total_jobs: number;
  completed_jobs: number;
  last_service_date: string | null;
  work_orders: ServiceHistoryItem[];
}

export function useCustomerServiceHistory(customerId: string | undefined) {
  return useQuery({
    queryKey: ["tech-portal", "customer-history", customerId],
    queryFn: async (): Promise<ServiceHistoryResponse> => {
      const { data } = await apiClient.get(`/employee/customers/${customerId}/service-history`);
      return data;
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Photo Gallery (full-res) ────────────────────────────────────────────

export interface PhotoGalleryItem {
  id: string;
  work_order_id: string;
  photo_type: string;
  data_url: string;
  thumbnail_url: string;
  timestamp: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  created_at: string | null;
}

export function useJobPhotosGallery(jobId: string | undefined) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", jobId, "photos-gallery"],
    queryFn: async (): Promise<PhotoGalleryItem[]> => {
      const { data } = await apiClient.get(`/employee/jobs/${jobId}/photos/gallery`);
      return data;
    },
    enabled: !!jobId,
  });
}

// ── Inspection Checklist Hooks ──────────────────────────────────────────

// Map snake_case server inspection state to camelCase frontend InspectionState
function mapServerInspection(raw: Record<string, unknown> | null) {
  if (!raw) return null;
  // Map step states from snake_case to camelCase
  const rawSteps = (raw.steps ?? {}) as Record<string, Record<string, unknown>>;
  const steps: Record<number, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(rawSteps)) {
    steps[Number(k)] = {
      status: v.status ?? "pending",
      completedAt: v.completed_at ?? v.completedAt ?? null,
      notes: v.notes ?? "",
      voiceNotes: v.voice_notes ?? v.voiceNotes ?? "",
      findings: v.findings ?? "ok",
      findingDetails: v.finding_details ?? v.findingDetails ?? "",
      photos: v.photos ?? [],
      sludgeLevel: v.sludge_level ?? v.sludgeLevel ?? "",
      psiReading: v.psi_reading ?? v.psiReading ?? "",
      selectedParts: v.selected_parts ?? v.selectedParts ?? [],
    };
  }
  // Map summary
  const rawSummary = raw.summary as Record<string, unknown> | null;
  const summary = rawSummary ? {
    generatedAt: rawSummary.generated_at ?? rawSummary.generatedAt ?? "",
    overallCondition: rawSummary.overall_condition ?? rawSummary.overallCondition ?? "good",
    totalIssues: rawSummary.total_issues ?? rawSummary.totalIssues ?? 0,
    criticalIssues: rawSummary.critical_issues ?? rawSummary.criticalIssues ?? 0,
    recommendations: rawSummary.recommendations ?? [],
    upsellOpportunities: rawSummary.upsell_opportunities ?? rawSummary.upsellOpportunities ?? [],
    nextServiceDate: rawSummary.next_service_date ?? rawSummary.nextServiceDate ?? null,
    techNotes: rawSummary.tech_notes ?? rawSummary.techNotes ?? "",
    reportSentVia: rawSummary.report_sent_via ?? rawSummary.reportSentVia ?? [],
    reportSentAt: rawSummary.report_sent_at ?? rawSummary.reportSentAt ?? null,
    estimateTotal: rawSummary.estimate_total ?? rawSummary.estimateTotal ?? null,
  } : null;
  // Map persisted AI analysis (snake_case keys from backend)
  const rawAi = (raw.ai_analysis ?? raw.aiAnalysis ?? null) as Record<string, unknown> | null;

  return {
    startedAt: raw.started_at ?? raw.startedAt ?? null,
    completedAt: raw.completed_at ?? raw.completedAt ?? null,
    equipmentVerified: raw.equipment_verified ?? raw.equipmentVerified ?? false,
    equipmentItems: (raw.equipment_items ?? raw.equipmentItems ?? {}) as Record<string, boolean>,
    homeownerNotifiedAt: raw.homeowner_notified_at ?? raw.homeownerNotifiedAt ?? null,
    currentStep: raw.current_step ?? raw.currentStep ?? 1,
    steps,
    summary,
    voiceGuidanceEnabled: raw.voice_guidance_enabled ?? raw.voiceGuidanceEnabled ?? false,
    recommendPumping: raw.recommend_pumping ?? raw.recommendPumping ?? false,
    aiAnalysis: rawAi as AIInspectionAnalysis | null,
  };
}

export function useInspectionState(jobId: string | undefined) {
  return useQuery({
    queryKey: ["tech-portal", "jobs", jobId, "inspection"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/employee/jobs/${jobId}/inspection`);
      return mapServerInspection(data?.inspection ?? null);
    },
    enabled: !!jobId,
  });
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, equipmentItems }: { jobId: string; equipmentItems?: Record<string, boolean> }) => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/inspection/start`, {
        equipment_items: equipmentItems,
      });
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tech-portal", "jobs", vars.jobId, "inspection"] });
      toastSuccess("Inspection started!");
    },
    onError: () => toastError("Failed to start inspection"),
  });
}

export function useUpdateInspectionStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      stepNumber,
      update,
    }: {
      jobId: string;
      stepNumber: number;
      update: {
        status?: string;
        notes?: string;
        voice_notes?: string;
        findings?: string;
        finding_details?: string;
        photos?: string[];
        sludge_level?: string;
        psi_reading?: string;
        selected_parts?: string[];
      };
    }) => {
      const { data } = await apiClient.patch(
        `/employee/jobs/${jobId}/inspection/step/${stepNumber}`,
        update,
      );
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tech-portal", "jobs", vars.jobId, "inspection"] });
    },
  });
}

export function useSaveInspectionState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      state,
      sendReport,
    }: {
      jobId: string;
      state?: unknown;
      sendReport?: { method: "email" | "sms"; to: string; pdfBase64?: string };
    }) => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/inspection/save`, {
        inspection: state,
        send_report: sendReport ? {
          method: sendReport.method,
          to: sendReport.to,
          pdf_base64: sendReport.pdfBase64,
        } : undefined,
      });
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tech-portal", "jobs", vars.jobId, "inspection"] });
    },
  });
}

export function useCompleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, techNotes, recommendPumping }: { jobId: string; techNotes?: string; recommendPumping?: boolean }) => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/inspection/complete`, {
        tech_notes: techNotes,
        recommend_pumping: recommendPumping,
      });
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tech-portal", "jobs", vars.jobId, "inspection"] });
      toastSuccess("Inspection complete! Summary generated.");
    },
    onError: () => toastError("Failed to complete inspection"),
  });
}

export function useNotifyArrival() {
  return useMutation({
    mutationFn: async ({
      jobId,
      customerPhone,
      customMessage,
    }: {
      jobId: string;
      customerPhone?: string;
      customMessage?: string;
    }) => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/inspection/notify-arrival`, {
        customer_phone: customerPhone,
        custom_message: customMessage,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data?.sms_sent) {
        toastSuccess("Arrival notification sent to homeowner!");
      } else {
        toastSuccess("Arrival recorded (SMS unavailable)");
      }
    },
    onError: () => toastError("Failed to send arrival notification"),
  });
}

export function useCreateEstimateFromInspection() {
  return useMutation({
    mutationFn: async ({
      jobId,
      includePumping,
      pumpingRate,
    }: {
      jobId: string;
      includePumping?: boolean;
      pumpingRate?: number;
    }): Promise<{ quote_id: string; quote_number: string; total: number }> => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/inspection/create-estimate`, {
        include_pumping: includePumping,
        pumping_rate: pumpingRate,
      });
      return data;
    },
    onSuccess: () => toastSuccess("Estimate created!"),
    onError: () => toastError("Failed to create estimate"),
  });
}

// ── AI Inspection Analysis ──────────────────────────────────────────────

export interface AIInspectionAnalysis {
  overall_assessment: string;
  priority_repairs: { issue: string; why_it_matters: string; urgency: string }[];
  homeowner_script: string;
  maintenance_recommendation: string;
  cost_notes: string;
  model_used: string;
  what_to_expect?: string;
  maintenance_schedule?: { timeframe: string; task: string; why: string }[];
  seasonal_tips?: { season: string; tip: string }[];
  generated_at?: string;
}

export function useInspectionAIAnalysis() {
  return useMutation({
    mutationFn: async (jobId: string): Promise<AIInspectionAnalysis> => {
      const { data } = await apiClient.post(`/employee/jobs/${jobId}/inspection/ai-analysis`);
      return data;
    },
    onError: () => toastError("AI analysis unavailable — try again later"),
  });
}
