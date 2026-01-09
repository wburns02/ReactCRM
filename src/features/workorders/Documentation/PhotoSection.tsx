/**
 * PhotoSection Component
 *
 * Unified photo documentation section combining:
 * - Required photos checklist with capture buttons
 * - Photo gallery grid showing all captured photos
 * - Photo capture modal for taking new photos
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/Dialog';
import { PhotoCapture, type CapturedPhoto } from './PhotoCapture';
import { PhotoGallery } from './PhotoGallery';
import type { PhotoType, WorkOrderPhoto } from '@/api/types/workOrder';
import { cn } from '@/lib/utils';

export interface PhotoSectionProps {
  workOrderId: string;
  photos: WorkOrderPhoto[];
  onPhotoCapture: (photo: CapturedPhoto) => void;
  onPhotoDelete: (photoId: string) => void;
  className?: string;
}

const REQUIRED_PHOTOS: Array<{ type: PhotoType; label: string; required: boolean }> = [
  { type: 'before', label: 'Before Service', required: true },
  { type: 'after', label: 'After Service', required: true },
  { type: 'manifest', label: 'Waste Manifest', required: true },
];

export function PhotoSection({
  workOrderId,
  photos,
  onPhotoCapture,
  onPhotoDelete,
  className,
}: PhotoSectionProps) {
  const [captureType, setCaptureType] = useState<PhotoType | null>(null);

  const hasPhotoOfType = (type: PhotoType) =>
    photos.some((p) => p.metadata.photoType === type);

  const getPhotoCountOfType = (type: PhotoType) =>
    photos.filter((p) => p.metadata.photoType === type).length;

  const completedCount = REQUIRED_PHOTOS.filter((p) => hasPhotoOfType(p.type)).length;
  const totalRequired = REQUIRED_PHOTOS.filter((p) => p.required).length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Required Photos Checklist */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Required Photos</h3>
          <Badge variant={completedCount >= totalRequired ? 'success' : 'warning'}>
            {completedCount}/{totalRequired} Complete
          </Badge>
        </div>

        <div className="space-y-2">
          {REQUIRED_PHOTOS.map(({ type, label, required }) => {
            const hasPhoto = hasPhotoOfType(type);
            const photoCount = getPhotoCountOfType(type);

            return (
              <div
                key={type}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  hasPhoto
                    ? 'bg-success-light/30 border-success/30'
                    : 'bg-bg-card border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox indicator */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border-2',
                      hasPhoto
                        ? 'bg-success border-success text-white'
                        : 'bg-bg-card border-border'
                    )}
                  >
                    {hasPhoto && (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Label and badges */}
                  <span
                    className={cn(
                      'font-medium',
                      hasPhoto ? 'text-success line-through' : 'text-text-primary'
                    )}
                  >
                    {label}
                  </span>

                  {required && !hasPhoto && (
                    <Badge variant="danger" size="sm">
                      Required
                    </Badge>
                  )}

                  {hasPhoto && (
                    <Badge variant="success" size="sm">
                      Captured{photoCount > 1 ? ` (${photoCount})` : ''}
                    </Badge>
                  )}
                </div>

                {/* Capture button */}
                <Button
                  size="sm"
                  variant={hasPhoto ? 'secondary' : 'primary'}
                  onClick={() => setCaptureType(type)}
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                  {hasPhoto ? 'Retake' : 'Capture'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo Gallery */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Photo Gallery</h3>
        {photos.length === 0 ? (
          <div className="text-center py-8 text-text-muted border-2 border-dashed border-border rounded-lg">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-40"
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
            <p className="text-sm mt-1">Use the capture buttons above to add photos</p>
          </div>
        ) : (
          <PhotoGallery
            photos={photos}
            onDelete={onPhotoDelete}
            editable={true}
          />
        )}
      </div>

      {/* Capture Modal */}
      <Dialog open={!!captureType} onClose={() => setCaptureType(null)}>
        <DialogContent size="lg">
          <DialogHeader onClose={() => setCaptureType(null)}>
            Capture{' '}
            {captureType && REQUIRED_PHOTOS.find((p) => p.type === captureType)?.label} Photo
          </DialogHeader>
          {captureType && (
            <PhotoCapture
              workOrderId={workOrderId}
              photoType={captureType}
              onCapture={(photo) => {
                onPhotoCapture(photo);
                setCaptureType(null);
              }}
              onCancel={() => setCaptureType(null)}
              required={REQUIRED_PHOTOS.find((p) => p.type === captureType)?.required}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PhotoSection;
