/**
 * PhotoCapture Component
 *
 * Full camera implementation for work order photo documentation.
 * Features:
 * - Live camera preview with getUserMedia
 * - Front/back camera switching
 * - Timestamp watermark on captured photos
 * - GPS coordinate embedding
 * - Fallback to file input if camera denied
 * - Preview mode with retake/accept buttons
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { PhotoType, PhotoMetadata } from '@/api/types/workOrder';
import { useCamera } from './hooks/useCamera';
import {
  addWatermark,
  createThumbnail,
  getCurrentPosition,
  getPositionWithFallback,
  formatTimestampForWatermark,
  getDeviceInfo,
  generatePhotoId,
  readFileAsBase64,
  compressImage,
  type GPSCoordinates,
} from './utils/imageProcessing';

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: 'Before',
  after: 'After',
  manifest: 'Manifest',
  damage: 'Damage',
  lid: 'Lid',
  tank: 'Tank',
  access: 'Access',
  equipment: 'Equipment',
  other: 'Other',
};

export interface CapturedPhoto {
  id: string;
  data: string;
  thumbnail: string;
  metadata: PhotoMetadata;
}

export interface PhotoCaptureProps {
  workOrderId: string;
  photoType: PhotoType;
  onCapture: (photo: CapturedPhoto) => void;
  required?: boolean;
  onCancel?: () => void;
  className?: string;
}

type CaptureMode = 'camera' | 'preview' | 'file';

export function PhotoCapture({
  workOrderId: _workOrderId,
  photoType,
  onCapture,
  required = false,
  onCancel,
  className,
}: PhotoCaptureProps) {
  const { state, videoRef, startCamera, stopCamera, capturePhoto, switchFacingMode } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<CaptureMode>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<GPSCoordinates | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Start camera and get GPS on mount
  useEffect(() => {
    const init = async () => {
      // Get GPS in background
      try {
        const coords = await getPositionWithFallback();
        if (coords) {
          setGpsCoords(coords);
        }
      } catch (err) {
        setGpsError('GPS unavailable');
      }

      // Start camera
      const success = await startCamera();
      if (!success) {
        setMode('file');
      }
    };

    init();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  /**
   * Handle camera capture button press
   */
  const handleCapture = useCallback(async () => {
    const rawImage = capturePhoto();
    if (!rawImage) return;

    setIsProcessing(true);

    try {
      // Try to get fresh GPS if we don't have it
      if (!gpsCoords) {
        try {
          const coords = await getCurrentPosition({ timeout: 3000 });
          setGpsCoords(coords);
        } catch {
          // Continue without GPS
        }
      }

      setCapturedImage(rawImage);
      setMode('preview');
      stopCamera();
    } finally {
      setIsProcessing(false);
    }
  }, [capturePhoto, gpsCoords, stopCamera]);

  /**
   * Handle retake button - go back to camera mode
   */
  const handleRetake = useCallback(async () => {
    setCapturedImage(null);
    setMode('camera');
    await startCamera();
  }, [startCamera]);

  /**
   * Handle accept button - process and submit photo
   */
  const handleAccept = useCallback(async () => {
    if (!capturedImage) return;

    setIsProcessing(true);

    try {
      const timestamp = formatTimestampForWatermark();

      // Add watermark with timestamp and GPS
      const watermarkedImage = await addWatermark(capturedImage, timestamp, gpsCoords ?? undefined);

      // Create thumbnail
      const thumbnail = await createThumbnail(watermarkedImage, 200, 200);

      // Build metadata
      const metadata: PhotoMetadata = {
        timestamp: new Date().toISOString(),
        photoType,
        deviceInfo: getDeviceInfo(),
      };

      if (gpsCoords) {
        metadata.gps = gpsCoords;
      }

      // Create photo object
      const photo: CapturedPhoto = {
        id: generatePhotoId(),
        data: watermarkedImage,
        thumbnail,
        metadata,
      };

      onCapture(photo);
    } catch (err) {
      console.error('Failed to process photo:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, gpsCoords, photoType, onCapture]);

  /**
   * Handle file input selection (fallback mode)
   */
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Read file as base64
      let imageData = await readFileAsBase64(file);

      // Compress if too large (> 3MB)
      const sizeBytes = (imageData.length * 3) / 4;
      if (sizeBytes > 3 * 1024 * 1024) {
        imageData = await compressImage(imageData, 0.8, 1920);
      }

      setCapturedImage(imageData);
      setMode('preview');
    } catch (err) {
      console.error('Failed to read file:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Trigger file input click
   */
  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  /**
   * Switch to file mode
   */
  const handleSwitchToFile = () => {
    stopCamera();
    setMode('file');
  };

  /**
   * Switch to camera mode
   */
  const handleSwitchToCamera = async () => {
    const success = await startCamera();
    if (success) {
      setMode('camera');
    }
  };

  return (
    <div className={cn('flex flex-col bg-bg-card rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Badge variant="primary">{PHOTO_TYPE_LABELS[photoType]}</Badge>
          {required && <Badge variant="danger">Required</Badge>}
        </div>
        {gpsCoords && (
          <Badge variant="success" className="text-xs">
            GPS Active
          </Badge>
        )}
        {gpsError && (
          <Badge variant="warning" className="text-xs">
            {gpsError}
          </Badge>
        )}
      </div>

      {/* Main content area */}
      <div className="relative aspect-[4/3] bg-black">
        {/* Camera Preview */}
        {mode === 'camera' && (
          <>
            {state.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mb-2 mx-auto" />
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
            {state.error && (
              <div className="absolute inset-0 flex items-center justify-center text-white p-4">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 text-warning"
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
                  <p className="mb-4">{state.error}</p>
                  <Button variant="secondary" onClick={handleSwitchToFile}>
                    Choose from Files
                  </Button>
                </div>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </>
        )}

        {/* Preview Mode */}
        {mode === 'preview' && capturedImage && (
          <img
            src={capturedImage}
            alt="Captured photo preview"
            className="w-full h-full object-contain"
          />
        )}

        {/* File Mode */}
        {mode === 'file' && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
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
              <p className="mb-4">Choose a photo from your device</p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleChooseFile}>Select Photo</Button>
                {state.hasPermission !== false && (
                  <Button variant="ghost" onClick={handleSwitchToCamera}>
                    Use Camera Instead
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mb-2 mx-auto" />
              <p>Processing...</p>
            </div>
          </div>
        )}

        {/* Camera facing mode indicator */}
        {mode === 'camera' && state.isActive && (
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="bg-black/50 text-white border-white/30">
              {state.facingMode === 'environment' ? 'Rear' : 'Front'} Camera
            </Badge>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border">
        {mode === 'camera' && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {/* Switch camera button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={switchFacingMode}
                disabled={!state.isActive || isProcessing}
                aria-label="Switch camera"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </Button>

              {/* File fallback button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchToFile}
                disabled={isProcessing}
                aria-label="Choose from files"
              >
                <svg
                  className="w-5 h-5"
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
              </Button>
            </div>

            {/* Capture button */}
            <Button
              onClick={handleCapture}
              disabled={!state.isActive || isProcessing}
              className="w-16 h-16 rounded-full p-0"
            >
              <div className="w-12 h-12 rounded-full border-4 border-white" />
            </Button>
          </div>
        )}

        {mode === 'preview' && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleRetake}
              disabled={isProcessing}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retake
            </Button>

            <Button
              onClick={handleAccept}
              disabled={isProcessing}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Accept
            </Button>
          </div>
        )}

        {mode === 'file' && !capturedImage && (
          <div className="flex items-center justify-center">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

export default PhotoCapture;
