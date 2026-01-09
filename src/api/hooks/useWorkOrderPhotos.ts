/**
 * useWorkOrderPhotos Hook
 *
 * Handles photo upload, fetch, and delete for work orders.
 * Uses React Query for caching and optimistic updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import type { WorkOrderPhoto, PhotoMetadata } from '../types/workOrder';

/**
 * Query keys for work order photos
 */
export const workOrderPhotoKeys = {
  all: ['workOrderPhotos'] as const,
  list: (workOrderId: string) => [...workOrderPhotoKeys.all, 'list', workOrderId] as const,
  detail: (workOrderId: string, photoId: string) => [...workOrderPhotoKeys.all, 'detail', workOrderId, photoId] as const,
};

/**
 * Photo upload request payload
 */
export interface UploadPhotoParams {
  workOrderId: string;
  data: string; // base64 image data
  thumbnail: string; // base64 thumbnail
  metadata: PhotoMetadata;
}

/**
 * Photo response from API
 */
export interface PhotoResponse {
  id: string;
  work_order_id: string;
  photo_type: string;
  data_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  gps_lat?: number;
  gps_lng?: number;
  gps_accuracy?: number;
  device_info?: string;
  created_at: string;
}

/**
 * Convert API response to WorkOrderPhoto
 */
function mapApiPhotoToWorkOrderPhoto(apiPhoto: PhotoResponse, originalData?: string, originalThumbnail?: string): WorkOrderPhoto {
  return {
    id: apiPhoto.id,
    workOrderId: apiPhoto.work_order_id,
    data: apiPhoto.data_url || originalData || '',
    thumbnail: apiPhoto.thumbnail_url || originalThumbnail || '',
    metadata: {
      timestamp: apiPhoto.timestamp || apiPhoto.created_at,
      photoType: apiPhoto.photo_type as WorkOrderPhoto['metadata']['photoType'],
      deviceInfo: apiPhoto.device_info || 'unknown',
      gps: apiPhoto.gps_lat && apiPhoto.gps_lng ? {
        lat: apiPhoto.gps_lat,
        lng: apiPhoto.gps_lng,
        accuracy: apiPhoto.gps_accuracy || 0,
      } : undefined,
    },
    uploadStatus: 'uploaded',
    createdAt: apiPhoto.created_at,
  };
}

/**
 * Fetch photos for a work order
 */
export function useWorkOrderPhotos(workOrderId: string | undefined) {
  return useQuery({
    queryKey: workOrderPhotoKeys.list(workOrderId!),
    queryFn: async (): Promise<WorkOrderPhoto[]> => {
      const { data } = await apiClient.get(`/work-orders/${workOrderId}/photos`);

      // Handle array or object response
      const photos = Array.isArray(data) ? data : (data.items || data.photos || []);

      return photos.map((p: PhotoResponse) => mapApiPhotoToWorkOrderPhoto(p));
    },
    enabled: !!workOrderId,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Upload a photo for a work order
 */
export function useUploadWorkOrderPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadPhotoParams): Promise<WorkOrderPhoto> => {
      console.log('[Photo Upload] Starting upload for work order:', params.workOrderId);

      const payload = {
        photo_type: params.metadata.photoType,
        data: params.data,
        thumbnail: params.thumbnail,
        timestamp: params.metadata.timestamp,
        device_info: params.metadata.deviceInfo,
        gps_lat: params.metadata.gps?.lat,
        gps_lng: params.metadata.gps?.lng,
        gps_accuracy: params.metadata.gps?.accuracy,
      };

      const { data } = await apiClient.post(
        `/work-orders/${params.workOrderId}/photos`,
        payload
      );

      console.log('[Photo Upload] Success:', data);

      return mapApiPhotoToWorkOrderPhoto(data, params.data, params.thumbnail);
    },
    onSuccess: (newPhoto, variables) => {
      // Add to cache optimistically
      queryClient.setQueryData<WorkOrderPhoto[]>(
        workOrderPhotoKeys.list(variables.workOrderId),
        (old) => old ? [...old, newPhoto] : [newPhoto]
      );

      // Invalidate to refetch from server
      queryClient.invalidateQueries({
        queryKey: workOrderPhotoKeys.list(variables.workOrderId),
      });

      toastSuccess('Photo saved', `${variables.metadata.photoType} photo uploaded successfully`);
    },
    onError: (error, variables) => {
      console.error('[Photo Upload] Failed:', error);
      toastError('Photo upload failed', 'Please try again');

      // Still invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: workOrderPhotoKeys.list(variables.workOrderId),
      });
    },
  });
}

/**
 * Delete a photo from a work order
 */
export function useDeleteWorkOrderPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, photoId }: { workOrderId: string; photoId: string }): Promise<void> => {
      console.log('[Photo Delete] Deleting photo:', photoId, 'from work order:', workOrderId);
      await apiClient.delete(`/work-orders/${workOrderId}/photos/${photoId}`);
    },
    onSuccess: (_, variables) => {
      // Remove from cache optimistically
      queryClient.setQueryData<WorkOrderPhoto[]>(
        workOrderPhotoKeys.list(variables.workOrderId),
        (old) => old?.filter((p) => p.id !== variables.photoId) || []
      );

      toastSuccess('Photo deleted');
    },
    onError: (error) => {
      console.error('[Photo Delete] Failed:', error);
      toastError('Failed to delete photo');
    },
  });
}

/**
 * Combined hook for photo operations
 */
export function useWorkOrderPhotoOperations(workOrderId: string | undefined) {
  const photosQuery = useWorkOrderPhotos(workOrderId);
  const uploadMutation = useUploadWorkOrderPhoto();
  const deleteMutation = useDeleteWorkOrderPhoto();

  return {
    // Query state
    photos: photosQuery.data || [],
    isLoading: photosQuery.isLoading,
    isError: photosQuery.isError,
    error: photosQuery.error,

    // Upload
    uploadPhoto: (params: Omit<UploadPhotoParams, 'workOrderId'>) => {
      if (!workOrderId) {
        console.error('[Photo] Cannot upload: no work order ID');
        return;
      }
      return uploadMutation.mutateAsync({ ...params, workOrderId });
    },
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // Delete
    deletePhoto: (photoId: string) => {
      if (!workOrderId) {
        console.error('[Photo] Cannot delete: no work order ID');
        return;
      }
      return deleteMutation.mutateAsync({ workOrderId, photoId });
    },
    isDeleting: deleteMutation.isPending,

    // Refetch
    refetch: photosQuery.refetch,
  };
}

export default useWorkOrderPhotoOperations;
