import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export interface PhotoData {
  type: "before" | "after" | "manifest" | "other";
  image_data: string; // base64
  captured_at: string;
  location?: { lat: number; lng: number };
}

interface PhotoCaptureProps {
  type: "before" | "after" | "manifest" | "other";
  onCapture: (photo: PhotoData) => void;
  onCancel?: () => void;
  captureLocation?: boolean;
}

/**
 * Photo capture component with camera access
 * Supports before/after photos for work orders
 */
export function PhotoCapture({
  type,
  onCapture,
  onCancel,
  captureLocation = true,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start camera
   */
  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraMode(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  /**
   * Stop camera
   */
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraMode(false);
    }
  };

  /**
   * Capture photo from camera
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to process image");
      setIsProcessing(false);
      return;
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.85);

    setPreview(imageData);
    stopCamera();
    setIsProcessing(false);
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      setIsProcessing(false);
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large. Maximum size is 10MB");
      setIsProcessing(false);
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setPreview(imageData);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setError("Error reading file");
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Confirm and save photo
   */
  const handleConfirm = async () => {
    if (!preview) return;

    // Get location if requested and not already captured
    let location: { lat: number; lng: number } | undefined;
    if (captureLocation && "geolocation" in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
            });
          },
        );
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (err) {
        console.warn("Could not get location:", err);
      }
    }

    const photoData: PhotoData = {
      type,
      image_data: preview,
      captured_at: new Date().toISOString(),
      location,
    };

    onCapture(photoData);
  };

  /**
   * Retake photo
   */
  const handleRetake = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const typeLabels = {
    before: "Before Photo",
    after: "After Photo",
    manifest: "Manifest Photo",
    other: "Photo",
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-text-primary">
            {typeLabels[type]}
          </h3>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-md p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Preview */}
        {preview ? (
          <div className="space-y-4">
            <div className="relative aspect-video bg-bg-muted rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Photo preview"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleRetake}
                className="flex-1"
              >
                Retake
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                className="flex-1"
              >
                Use Photo
              </Button>
            </div>
          </div>
        ) : isCameraMode ? (
          /* Camera view */
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={stopCamera}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={capturePhoto}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? "Processing..." : "Capture"}
              </Button>
            </div>
          </div>
        ) : (
          /* Selection view */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="primary"
                onClick={startCamera}
                className="h-24 text-lg"
              >
                <span className="text-2xl mr-2">📷</span>
                Take Photo
              </Button>

              <label htmlFor="photo-file-input">
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 text-lg w-full"
                  type="button"
                >
                  <span className="text-2xl mr-2">🖼️</span>
                  Choose from Gallery
                </Button>
              </label>
              <input
                ref={fileInputRef}
                id="photo-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {captureLocation && (
              <p className="text-xs text-text-secondary text-center">
                Location will be captured with the photo
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
