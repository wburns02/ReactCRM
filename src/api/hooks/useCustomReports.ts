import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  reportListResponseSchema,
  reportDetailSchema,
  dataSourcesResponseSchema,
  previewResponseSchema,
  type ReportListResponse,
  type ReportDetail,
  type DataSourceMeta,
  type PreviewResponse,
  type CustomReport,
  type ReportFormData,
} from "../types/customReports.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

export const reportKeys = {
  all: ["reports"] as const,
  lists: () => [...reportKeys.all, "list"] as const,
  list: (page: number, dataSource?: string, isFavorite?: boolean) => [...reportKeys.lists(), page, dataSource, isFavorite] as const,
  details: () => [...reportKeys.all, "detail"] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
  dataSources: () => [...reportKeys.all, "data-sources"] as const,
};

export function useReports(page = 1, dataSource?: string, isFavorite?: boolean) {
  return useQuery({
    queryKey: reportKeys.list(page, dataSource, isFavorite),
    queryFn: async (): Promise<ReportListResponse> => {
      const params = new URLSearchParams({ page: String(page) });
      if (dataSource) params.set("data_source", dataSource);
      if (isFavorite !== undefined) params.set("is_favorite", String(isFavorite));
      const { data } = await apiClient.get(`/reports?${params}`);
      return validateResponse(reportListResponseSchema, data, "/reports");
    },
    staleTime: 30_000,
  });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: reportKeys.detail(id!),
    queryFn: async (): Promise<ReportDetail> => {
      const { data } = await apiClient.get(`/reports/${id}`);
      return validateResponse(reportDetailSchema, data, `/reports/${id}`);
    },
    enabled: !!id,
  });
}

export function useDataSources() {
  return useQuery({
    queryKey: reportKeys.dataSources(),
    queryFn: async (): Promise<Record<string, DataSourceMeta>> => {
      const { data } = await apiClient.get("/reports/data-sources");
      return validateResponse(dataSourcesResponseSchema, data, "/reports/data-sources");
    },
    staleTime: 10 * 60_000,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: ReportFormData): Promise<CustomReport> => {
      const { data } = await apiClient.post("/reports", formData);
      return data;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      toastSuccess("Report Created", `"${report.name}" saved`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Creation Failed", error?.response?.data?.detail || error?.message || "Failed to create report");
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: Partial<ReportFormData> }): Promise<CustomReport> => {
      const { data } = await apiClient.patch(`/reports/${id}`, formData);
      return data;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reportKeys.detail(report.id) });
      toastSuccess("Report Updated", `"${report.name}" updated`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Update Failed", error?.response?.data?.detail || error?.message || "Failed to update report");
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      toastSuccess("Report Deleted", "Report removed");
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Delete Failed", error?.response?.data?.detail || error?.message || "Failed to delete report");
    },
  });
}

export function usePreviewReport() {
  return useMutation({
    mutationFn: async (config: {
      data_source: string;
      columns: { field: string; label?: string; aggregation?: string }[];
      filters: { field: string; operator: string; value: unknown }[];
      group_by: string[];
      sort_by?: { field: string; direction: string } | null;
      date_range?: Record<string, unknown> | null;
    }): Promise<PreviewResponse> => {
      const { data } = await apiClient.post("/reports/preview", config);
      return validateResponse(previewResponseSchema, data, "/reports/preview");
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Preview Failed", error?.response?.data?.detail || error?.message || "Failed to preview report");
    },
  });
}

export function useExecuteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<PreviewResponse> => {
      const { data } = await apiClient.post(`/reports/${id}/execute`);
      return validateResponse(previewResponseSchema, data, `/reports/${id}/execute`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.detail(id) });
      toastSuccess("Report Executed", "Data refreshed");
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Execution Failed", error?.response?.data?.detail || error?.message || "Failed to execute report");
    },
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await apiClient.post(`/reports/${id}/export`, {}, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "report.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Export Failed", error?.response?.data?.detail || error?.message || "Failed to export report");
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<CustomReport> => {
      const { data } = await apiClient.patch(`/reports/${id}/favorite`);
      return data;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reportKeys.detail(report.id) });
    },
  });
}
