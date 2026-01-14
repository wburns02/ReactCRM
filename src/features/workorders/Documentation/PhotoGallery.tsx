/**
 * PhotoGallery Component
 *
 * Responsive photo grid display for work order documentation.
 * Features:
 * - Responsive grid (2 cols mobile, 4 cols desktop)
 * - Thumbnail display with type badges
 * - Click to open lightbox
 * - Upload progress indicator for pending photos
 * - Delete option with confirmation
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import type { WorkOrderPhoto, PhotoType } from "@/api/types/workOrder";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: "Before",
  after: "After",
  manifest: "Manifest",
  damage: "Damage",
  lid: "Lid",
  tank: "Tank",
  access: "Access",
  equipment: "Equipment",
  other: "Other",
};

const PHOTO_TYPE_COLORS: Record<PhotoType, string> = {
  before: "bg-blue-500",
  after: "bg-green-500",
  manifest: "bg-purple-500",
  damage: "bg-red-500",
  lid: "bg-yellow-500",
  tank: "bg-cyan-500",
  access: "bg-orange-500",
  equipment: "bg-indigo-500",
  other: "bg-gray-500",
};

export interface PhotoGalleryProps {
  photos: WorkOrderPhoto[];
  onDelete?: (photoId: string) => void;
  onPhotoClick?: (photo: WorkOrderPhoto) => void;
  className?: string;
  editable?: boolean;
}

export function PhotoGallery({
  photos,
  onDelete,
  onPhotoClick,
  className,
  editable = true,
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<WorkOrderPhoto | null>(
    null,
  );
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] =
    useState<WorkOrderPhoto | null>(null);

  /**
   * Handle photo click - open lightbox
   */
  const handlePhotoClick = useCallback(
    (photo: WorkOrderPhoto) => {
      if (onPhotoClick) {
        onPhotoClick(photo);
      } else {
        setSelectedPhoto(photo);
      }
    },
    [onPhotoClick],
  );

  /**
   * Handle delete button click
   */
  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, photo: WorkOrderPhoto) => {
      e.stopPropagation();
      setDeleteConfirmPhoto(photo);
    },
    [],
  );

  /**
   * Confirm delete
   */
  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmPhoto && onDelete) {
      onDelete(deleteConfirmPhoto.id);
    }
    setDeleteConfirmPhoto(null);
  }, [deleteConfirmPhoto, onDelete]);

  /**
   * Close lightbox
   */
  const handleCloseLightbox = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  /**
   * Navigate to previous photo in lightbox
   */
  const handlePrevPhoto = useCallback(() => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[prevIndex]);
  }, [selectedPhoto, photos]);

  /**
   * Navigate to next photo in lightbox
   */
  const handleNextPhoto = useCallback(() => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    const nextIndex = (currentIndex + 1) % photos.length;
    setSelectedPhoto(photos[nextIndex]);
  }, [selectedPhoto, photos]);

  if (photos.length === 0) {
    return (
      <div className={cn("text-center py-8 text-text-muted", className)}>
        <svg
          className="w-16 h-16 mx-auto mb-4 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p>No photos captured yet</p>
      </div>
    );
  }

  return (
    <>
      {/* Photo Grid */}
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
        {photos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            onClick={() => handlePhotoClick(photo)}
            onDelete={
              editable && onDelete
                ? (e) => handleDeleteClick(e, photo)
                : undefined
            }
          />
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onClose={handleCloseLightbox}>
        <DialogContent size="xl" className="max-w-4xl">
          {selectedPhoto && (
            <>
              <DialogHeader onClose={handleCloseLightbox}>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-white",
                      PHOTO_TYPE_COLORS[selectedPhoto.metadata.photoType],
                    )}
                  >
                    {PHOTO_TYPE_LABELS[selectedPhoto.metadata.photoType]}
                  </Badge>
                  <span className="text-text-secondary text-sm">
                    {new Date(
                      selectedPhoto.metadata.timestamp,
                    ).toLocaleString()}
                  </span>
                </div>
              </DialogHeader>

              <DialogBody className="p-0">
                <div className="relative bg-black">
                  <img
                    src={selectedPhoto.data}
                    alt={`${PHOTO_TYPE_LABELS[selectedPhoto.metadata.photoType]} photo`}
                    className="w-full max-h-[60vh] object-contain"
                  />

                  {/* Navigation arrows */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevPhoto}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                        aria-label="Previous photo"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={handleNextPhoto}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                        aria-label="Next photo"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Photo metadata */}
                <div className="p-4 bg-bg-hover/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-muted">Device:</span>
                      <span className="ml-2 text-text-primary">
                        {selectedPhoto.metadata.deviceInfo}
                      </span>
                    </div>
                    {selectedPhoto.metadata.gps && (
                      <div>
                        <span className="text-text-muted">GPS:</span>
                        <span className="ml-2 text-text-primary">
                          {selectedPhoto.metadata.gps.lat.toFixed(6)},{" "}
                          {selectedPhoto.metadata.gps.lng.toFixed(6)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </DialogBody>

              {editable && onDelete && (
                <DialogFooter>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDeleteConfirmPhoto(selectedPhoto);
                      setSelectedPhoto(null);
                    }}
                  >
                    Delete Photo
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmPhoto}
        onClose={() => setDeleteConfirmPhoto(null)}
      >
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeleteConfirmPhoto(null)}>
            Delete Photo?
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to delete this{" "}
              {deleteConfirmPhoto &&
                PHOTO_TYPE_LABELS[
                  deleteConfirmPhoto.metadata.photoType
                ].toLowerCase()}{" "}
              photo? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmPhoto(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Individual photo thumbnail component
 */
interface PhotoThumbnailProps {
  photo: WorkOrderPhoto;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

function PhotoThumbnail({ photo, onClick, onDelete }: PhotoThumbnailProps) {
  const isUploading = photo.uploadStatus === "uploading";
  const isFailed = photo.uploadStatus === "failed";
  const isPending = photo.uploadStatus === "pending";

  return (
    <div
      className="relative aspect-square rounded-lg overflow-hidden bg-bg-muted cursor-pointer group"
      onClick={onClick}
    >
      {/* Thumbnail image */}
      <img
        src={photo.thumbnail}
        alt={`${PHOTO_TYPE_LABELS[photo.metadata.photoType]} photo`}
        className="w-full h-full object-cover"
      />

      {/* Type badge */}
      <div className="absolute top-2 left-2">
        <span
          className={cn(
            "px-2 py-0.5 rounded text-xs font-medium text-white",
            PHOTO_TYPE_COLORS[photo.metadata.photoType],
          )}
        >
          {PHOTO_TYPE_LABELS[photo.metadata.photoType]}
        </span>
      </div>

      {/* Upload status overlay */}
      {(isUploading || isFailed || isPending) && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            isUploading && "bg-black/50",
            isFailed && "bg-red-500/50",
            isPending && "bg-yellow-500/30",
          )}
        >
          {isUploading && (
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mb-1 mx-auto" />
              <span className="text-xs">{photo.uploadProgress ?? 0}%</span>
            </div>
          )}
          {isFailed && (
            <div className="text-center text-white">
              <svg
                className="w-6 h-6 mx-auto mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-xs">Upload Failed</span>
            </div>
          )}
          {isPending && (
            <div className="text-center text-white">
              <svg
                className="w-6 h-6 mx-auto mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs">Pending</span>
            </div>
          )}
        </div>
      )}

      {/* Delete button (visible on hover) */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
          aria-label="Delete photo"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
    </div>
  );
}

export default PhotoGallery;
