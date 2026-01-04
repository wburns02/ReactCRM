import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client.ts';
import { FEATURE_FLAGS } from '@/lib/feature-flags.ts';
import {
  documentListResponseSchema,
  uploadResponseSchema,
  type Document,
  type DocumentListResponse,
  type DocumentFilters,
  type UploadResponse,
  type EntityType,
} from '../types/document.ts';

/**
 * Query keys for documents
 */
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: DocumentFilters) => [...documentKeys.lists(), filters] as const,
  byEntity: (entityType: EntityType, entityId: string) =>
    [...documentKeys.all, 'entity', entityType, entityId] as const,
};

/**
 * Fetch documents for an entity
 * Note: Disabled until backend /attachments/ endpoint is implemented
 */
export function useDocuments(entityId: string | undefined, entityType: EntityType) {
  return useQuery({
    queryKey: documentKeys.byEntity(entityType, entityId!),
    queryFn: async (): Promise<DocumentListResponse> => {
      // Return empty list if attachments feature is disabled
      if (!FEATURE_FLAGS.attachments) {
        return { items: [], total: 0, page: 1, page_size: 100 };
      }

      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId!,
        page_size: '100',
      });

      const { data } = await apiClient.get(`/attachments/?${params.toString()}`);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = documentListResponseSchema.safeParse(data);
        if (!result.success) {
          console.warn('Document list response validation failed:', result.error);
        }
      }

      return data;
    },
    enabled: !!entityId && FEATURE_FLAGS.attachments,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Upload document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      entityType,
      entityId,
      onProgress,
    }: {
      file: File;
      entityType: EntityType;
      entityId: string;
      onProgress?: (progress: number) => void;
    }): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);

      const response = await apiClient.post('/attachments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      if (import.meta.env.DEV) {
        const result = uploadResponseSchema.safeParse(response.data);
        if (!result.success) {
          console.warn('Upload response validation failed:', result.error);
        }
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate documents for this entity
      queryClient.invalidateQueries({
        queryKey: documentKeys.byEntity(variables.entityType, variables.entityId),
      });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

/**
 * Delete document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/attachments/${id}`);
    },
    onSuccess: () => {
      // Invalidate all document queries
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

/**
 * Download document
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (document: Document): Promise<void> => {
      // Fetch the file as a blob
      const response = await apiClient.get(document.file_url, {
        responseType: 'blob',
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: document.file_type });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
