import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";

// ========================
// Types
// ========================

export type ImportType =
  | "customers"
  | "work_orders"
  | "equipment"
  | "inventory";

export interface ImportTemplate {
  type: string;
  description: string;
  download_url: string;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportResult {
  success: boolean;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  errors: ImportError[];
  warnings: string[];
}

export interface ImportStatus {
  status: string;
  available_import_types: string[];
  max_file_size_mb: number;
  supported_encodings: string[];
}

// ========================
// API Functions
// ========================

async function fetchTemplates(): Promise<{ templates: ImportTemplate[] }> {
  const { data } = await apiClient.get<{ templates: ImportTemplate[] }>(
    "/import/templates",
  );
  return data;
}

async function fetchImportStatus(): Promise<ImportStatus> {
  const { data } = await apiClient.get<ImportStatus>("/import/status");
  return data;
}

async function downloadTemplate(
  importType: ImportType,
  includeExamples: boolean = false,
): Promise<Blob> {
  const { data } = await apiClient.get(
    `/import/templates/${importType}?include_examples=${includeExamples}`,
    {
      responseType: "blob",
    },
  );
  return data;
}

async function validateImport(
  importType: ImportType,
  file: File,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<ImportResult>(
    `/import/validate/${importType}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

async function uploadImport(
  importType: ImportType,
  file: File,
  skipErrors: boolean = false,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<ImportResult>(
    `/import/upload/${importType}?skip_errors=${skipErrors}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

// ========================
// React Query Hooks
// ========================

export function useImportTemplates() {
  return useQuery({
    queryKey: ["import-templates"],
    queryFn: fetchTemplates,
  });
}

export function useImportStatus() {
  return useQuery({
    queryKey: ["import-status"],
    queryFn: fetchImportStatus,
  });
}

export function useDownloadTemplate() {
  return useMutation({
    mutationFn: ({
      importType,
      includeExamples,
    }: {
      importType: ImportType;
      includeExamples?: boolean;
    }) => downloadTemplate(importType, includeExamples),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${variables.importType}_template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useValidateImport() {
  return useMutation({
    mutationFn: ({
      importType,
      file,
    }: {
      importType: ImportType;
      file: File;
    }) => validateImport(importType, file),
  });
}

export function useUploadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      importType,
      file,
      skipErrors,
    }: {
      importType: ImportType;
      file: File;
      skipErrors?: boolean;
    }) => uploadImport(importType, file, skipErrors),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries based on import type
      switch (variables.importType) {
        case "customers":
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          break;
        case "work_orders":
          queryClient.invalidateQueries({ queryKey: ["work-orders"] });
          break;
        case "equipment":
          queryClient.invalidateQueries({ queryKey: ["equipment"] });
          break;
        case "inventory":
          queryClient.invalidateQueries({ queryKey: ["inventory"] });
          break;
      }
    },
  });
}

// ========================
// Constants
// ========================

export const IMPORT_TYPES = [
  {
    value: "customers" as ImportType,
    label: "Customers",
    icon: "👥",
    description: "Import customer records with contact and billing info",
  },
  {
    value: "work_orders" as ImportType,
    label: "Work Orders",
    icon: "🔧",
    description: "Import work orders with service details",
  },
  {
    value: "equipment" as ImportType,
    label: "Equipment",
    icon: "🛠️",
    description: "Import equipment and asset records",
  },
  {
    value: "inventory" as ImportType,
    label: "Inventory",
    icon: "📦",
    description: "Import inventory items and stock levels",
  },
];
