/**
 * useCamera Hook - Camera access and control
 *
 * Provides camera access, preview streaming, photo capture,
 * and facing mode switching for work order photo documentation.
 */
import { useState, useCallback, useRef, useEffect } from "react";

export type FacingMode = "user" | "environment";

export interface CameraState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  facingMode: FacingMode;
  hasPermission: boolean | null;
  stream: MediaStream | null;
}

export interface UseCameraResult {
  state: CameraState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: (facingMode?: FacingMode) => Promise<boolean>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  switchFacingMode: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for managing camera access and photo capture
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>({
    isActive: false,
    isLoading: false,
    error: null,
    facingMode: "environment",
    hasPermission: null,
    stream: null,
  });

  /**
   * Request camera permission explicitly
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await navigator.mediaDevices.getUserMedia({ video: true });
      // Immediately stop the test stream
      result.getTracks().forEach((track) => track.stop());
      setState((prev) => ({ ...prev, hasPermission: true, error: null }));
      return true;
    } catch (err) {
      const error = err as Error;
      const errorMessage =
        error.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access to take photos."
          : error.name === "NotFoundError"
            ? "No camera found on this device."
            : `Camera error: ${error.message}`;

      setState((prev) => ({
        ...prev,
        hasPermission: false,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  /**
   * Start camera with specified facing mode
   */
  const startCamera = useCallback(
    async (facingMode: FacingMode = "environment"): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Check for camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera not supported in this browser");
        }

        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setState((prev) => ({
          ...prev,
          isActive: true,
          isLoading: false,
          facingMode,
          hasPermission: true,
          stream,
          error: null,
        }));

        return true;
      } catch (err) {
        const error = err as Error;
        let errorMessage = "Failed to access camera";

        if (error.name === "NotAllowedError") {
          errorMessage =
            "Camera permission denied. Please allow camera access.";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No camera found on this device.";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Camera is already in use by another application.";
        } else if (error.name === "OverconstrainedError") {
          // Try again with basic constraints
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            streamRef.current = stream;

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
            }

            setState((prev) => ({
              ...prev,
              isActive: true,
              isLoading: false,
              facingMode,
              hasPermission: true,
              stream,
              error: null,
            }));
            return true;
          } catch {
            errorMessage = "Camera constraints not supported.";
          }
        } else {
          errorMessage = `Camera error: ${error.message}`;
        }

        setState((prev) => ({
          ...prev,
          isActive: false,
          isLoading: false,
          hasPermission:
            error.name === "NotAllowedError" ? false : prev.hasPermission,
          error: errorMessage,
          stream: null,
        }));

        return false;
      }
    },
    [],
  );

  /**
   * Stop camera and release resources
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
      stream: null,
    }));
  }, []);

  /**
   * Capture photo from video stream
   * Returns base64 encoded JPEG image
   */
  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !state.isActive) {
      return null;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    // Use video's natural dimensions for best quality
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    // Draw the current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG (quality 0.92)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    return dataUrl;
  }, [state.isActive]);

  /**
   * Switch between front and back camera
   */
  const switchFacingMode = useCallback(async () => {
    const newMode: FacingMode =
      state.facingMode === "environment" ? "user" : "environment";

    if (state.isActive) {
      stopCamera();
      await startCamera(newMode);
    } else {
      setState((prev) => ({ ...prev, facingMode: newMode }));
    }
  }, [state.facingMode, state.isActive, stopCamera, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    state,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    switchFacingMode,
    requestPermission,
  };
}

export default useCamera;
