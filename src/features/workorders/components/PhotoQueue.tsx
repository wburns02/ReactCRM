/**
 * PhotoQueue - Offline photo capture and upload queue
 *
 * Features:
 * - Capture photos from camera or gallery
 * - Queue photos for background upload when offline
 * - Show upload progress
 * - Retry failed uploads
 * - Display thumbnails with status indicators
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useOnlineStatus } from "@/hooks/usePWA";
import { apiClient } from "@/api/client";
import { toastWarning } from "@/components/ui/Toast";
import {
  addPhotoToQueue,
  getPhotosForWorkOrder,
  getPendingPhotos,
  updatePhotoStatus,
  updatePhotoProgress,
  removePhotoFromQueue,
  getPhotoQueueStats,
  type QueuedPhoto,
} from "@/lib/db";

// ============================================
// Types
// ============================================

interface PhotoQueueProps {
  workOrderId: string;
  onPhotoUploaded?: (url: string) => void;
  maxPhotos?: number;
}

interface PhotoItemProps {
  photo: QueuedPhoto;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

// ============================================
// PhotoItem Component
// ============================================

function PhotoItem({ photo, onRetry, onRemove }: PhotoItemProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    // Create object URL for thumbnail
    const url = URL.createObjectURL(photo.blob);
    setThumbnailUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.blob]);

  const statusColors: Record<QueuedPhoto["status"], string> = {
    pending: "bg-yellow-100 text-yellow-800",
    uploading: "bg-blue-100 text-blue-800",
    uploaded: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<QueuedPhoto["status"], string> = {
    pending: "Pending",
    uploading: "Uploading",
    uploaded: "Uploaded",
    failed: "Failed",
  };

  return (
    <div className="relative group">
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-bg-muted">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={photo.filename}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Status badge */}
      <div className="absolute -top-2 -right-2">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColors[photo.status]}`}
        >
          {statusLabels[photo.status]}
        </span>
      </div>

      {/* Progress bar for uploading */}
      {photo.status === "uploading" && photo.uploadProgress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${photo.uploadProgress}%` }}
          />
        </div>
      )}

      {/* Retry button for failed */}
      {photo.status === "failed" && (
        <button
          onClick={() => onRetry(photo.id)}
          className="absolute bottom-1 right-1 p-1 bg-white rounded-full shadow hover:bg-gray-100"
          title="Retry upload"
        >
          <svg
            className="w-3 h-3 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}

      {/* Remove button (shown on hover) */}
      <button
        onClick={() => onRemove(photo.id)}
        className="absolute top-1 left-1 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
        title="Remove photo"
      >
        <svg
          className="w-3 h-3 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function PhotoQueue({
  workOrderId,
  onPhotoUploaded,
  maxPhotos = 10,
}: PhotoQueueProps) {
  const isOnline = useOnlineStatus();
  const [photos, setPhotos] = useState<QueuedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    uploading: 0,
    uploaded: 0,
    failed: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  // ============================================
  // Load photos for this work order
  // ============================================

  const loadPhotos = useCallback(async () => {
    const workOrderPhotos = await getPhotosForWorkOrder(workOrderId);
    setPhotos(workOrderPhotos);
    const queueStats = await getPhotoQueueStats();
    setStats(queueStats);
  }, [workOrderId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // ============================================
  // Photo capture
  // ============================================

  const handleCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      for (const file of Array.from(files)) {
        if (photos.length >= maxPhotos) {
          toastWarning("Photo Limit", `Maximum ${maxPhotos} photos allowed.`);
          break;
        }

        // Add to queue
        await addPhotoToQueue({
          workOrderId,
          blob: file,
          filename: file.name,
          mimeType: file.type,
          capturedAt: Date.now(),
        });
      }

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload photos
      await loadPhotos();

      // Trigger upload if online
      if (isOnline) {
        uploadPending();
      }
    },
    [workOrderId, photos.length, maxPhotos, loadPhotos, isOnline],
  );

  // ============================================
  // Upload logic
  // ============================================

  const uploadPhoto = useCallback(
    async (photo: QueuedPhoto): Promise<boolean> => {
      try {
        await updatePhotoStatus(photo.id, "uploading");
        await loadPhotos();

        // Create FormData for upload
        const formData = new FormData();
        formData.append("file", photo.blob, photo.filename);
        formData.append("work_order_id", workOrderId);

        // Upload with progress tracking
        const response = await apiClient.post("/work-orders/photos", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            updatePhotoProgress(photo.id, progress);
          },
        });

        const uploadedUrl = response.data?.url || response.data?.photo_url;
        await updatePhotoStatus(photo.id, "uploaded", uploadedUrl);

        if (onPhotoUploaded && uploadedUrl) {
          onPhotoUploaded(uploadedUrl);
        }

        return true;
      } catch (err) {
        console.error("Photo upload failed:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        await updatePhotoStatus(photo.id, "failed", undefined, errorMessage);
        return false;
      }
    },
    [workOrderId, onPhotoUploaded, loadPhotos],
  );

  const uploadPending = useCallback(async () => {
    if (uploadingRef.current || !isOnline) return;

    uploadingRef.current = true;
    setIsUploading(true);

    try {
      const pending = await getPendingPhotos();
      const workOrderPending = pending.filter(
        (p) => p.workOrderId === workOrderId,
      );

      for (const photo of workOrderPending) {
        await uploadPhoto(photo);
        await loadPhotos();
      }
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
    }
  }, [isOnline, workOrderId, uploadPhoto, loadPhotos]);

  // Auto-upload when coming online
  useEffect(() => {
    if (isOnline && stats.pending > 0) {
      uploadPending();
    }
  }, [isOnline, stats.pending, uploadPending]);

  // ============================================
  // Retry and remove handlers
  // ============================================

  const handleRetry = useCallback(
    async (id: string) => {
      await updatePhotoStatus(id, "pending");
      await loadPhotos();
      if (isOnline) {
        uploadPending();
      }
    },
    [loadPhotos, isOnline, uploadPending],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      await removePhotoFromQueue(id);
      await loadPhotos();
    },
    [loadPhotos],
  );

  // ============================================
  // Render
  // ============================================

  const pendingCount = photos.filter(
    (p) => p.status === "pending" || p.status === "uploading",
  ).length;
  const failedCount = photos.filter((p) => p.status === "failed").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Photos</CardTitle>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="warning">{pendingCount} pending</Badge>
            )}
            {failedCount > 0 && (
              <Badge variant="danger">{failedCount} failed</Badge>
            )}
            {!isOnline && <Badge variant="default">Offline</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {photos.map((photo) => (
              <PhotoItem
                key={photo.id}
                photo={photo}
                onRetry={handleRetry}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}

        {/* Capture button */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCapture}
            variant="secondary"
            size="sm"
            disabled={photos.length >= maxPhotos}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {photos.length > 0 ? "Add Photo" : "Take Photo"}
          </Button>

          {isUploading && (
            <span className="text-sm text-text-secondary flex items-center gap-1">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Uploading...
            </span>
          )}

          {!isOnline && photos.length > 0 && pendingCount > 0 && (
            <span className="text-sm text-yellow-600">
              Will upload when online
            </span>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Photo count */}
        <p className="text-xs text-text-muted mt-2">
          {photos.length} of {maxPhotos} photos
        </p>
      </CardContent>
    </Card>
  );
}

export default PhotoQueue;
