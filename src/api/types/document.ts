import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Entity Type for attachments
 */
export const EntityType = {
  CUSTOMER: "customer",
  PROSPECT: "prospect",
  WORK_ORDER: "work_order",
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export const entityTypeSchema = z.enum(["customer", "prospect", "work_order"]);

/**
 * Document/Attachment schema - validates API responses
 */
export const documentSchema = z.object({
  id: z.string().uuid(),
  entity_type: entityTypeSchema,
  entity_id: z.string().uuid(),
  file_name: z.string(),
  file_size: z.number(),
  file_type: z.string(),
  file_url: z.string(),
  uploaded_by: z.string().nullable(),
  created_at: z.string(),
});

export type Document = z.infer<typeof documentSchema>;

/**
 * Paginated document list response
 */
export const documentListResponseSchema =
  paginatedResponseSchema(documentSchema);
export type DocumentListResponse = z.infer<typeof documentListResponseSchema>;

/**
 * Document filters for list queries
 */
export interface DocumentFilters {
  page?: number;
  page_size?: number;
  entity_type?: EntityType;
  entity_id?: string;
}

/**
 * Upload response
 */
export const uploadResponseSchema = z.object({
  id: z.string().uuid(),
  file_name: z.string(),
  file_size: z.number(),
  file_type: z.string(),
  file_url: z.string(),
  message: z.string().optional(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

/**
 * File size limits and allowed types
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
];

/**
 * Helper to format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Helper to get file icon
 */
export function getFileIcon(fileType: string): string {
  if (fileType.includes("pdf")) return "📄";
  if (fileType.includes("image")) return "🖼️";
  if (fileType.includes("word") || fileType.includes("document")) return "📝";
  if (fileType.includes("excel") || fileType.includes("spreadsheet"))
    return "📊";
  if (fileType.includes("text")) return "📃";
  return "📎";
}

/**
 * Helper to check if file is viewable in browser
 */
export function isViewableFile(fileType: string): boolean {
  return fileType.includes("pdf") || fileType.includes("image");
}
