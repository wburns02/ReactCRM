/**
 * Image Processing Utilities
 *
 * Functions for image manipulation, watermarking, compression,
 * and GPS coordinate retrieval for work order photo documentation.
 */

export interface GPSCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * Create a thumbnail from a base64 image
 *
 * @param base64 - Source image as base64 data URL
 * @param maxWidth - Maximum width of thumbnail
 * @param maxHeight - Maximum height of thumbnail
 * @returns Promise resolving to thumbnail as base64 data URL
 */
export async function createThumbnail(
  base64: string,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with moderate quality for thumbnails
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail'));
    };

    img.src = base64;
  });
}

/**
 * Add watermark with timestamp and GPS coordinates to an image
 *
 * @param base64 - Source image as base64 data URL
 * @param text - Primary text to display (usually timestamp)
 * @param gps - Optional GPS coordinates to include
 * @returns Promise resolving to watermarked image as base64 data URL
 */
export async function addWatermark(
  base64: string,
  text: string,
  gps?: GPSCoordinates
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Calculate watermark area dimensions
      const padding = 16;
      const lineHeight = 24;
      const lines: string[] = [text];

      if (gps) {
        lines.push(`GPS: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`);
        if (gps.accuracy) {
          lines.push(`Accuracy: ${Math.round(gps.accuracy)}m`);
        }
      }

      const boxHeight = (lines.length * lineHeight) + (padding * 2);
      const boxY = canvas.height - boxHeight;

      // Draw semi-transparent background for text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, boxY, canvas.width, boxHeight);

      // Draw text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      lines.forEach((line, index) => {
        const y = boxY + padding + (index * lineHeight);
        ctx.fillText(line, padding, y);
      });

      // Add MAC Septic branding in corner
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('MAC Septic', canvas.width - padding, boxY + padding);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for watermark'));
    };

    img.src = base64;
  });
}

/**
 * Compress an image to reduce file size
 *
 * @param base64 - Source image as base64 data URL
 * @param quality - JPEG quality (0-1, default 0.8)
 * @param maxDimension - Maximum width or height (optional)
 * @returns Promise resolving to compressed image as base64 data URL
 */
export async function compressImage(
  base64: string,
  quality: number = 0.8,
  maxDimension?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down if needed
      if (maxDimension) {
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = base64;
  });
}

/**
 * Get current GPS position
 *
 * @param options - Geolocation options
 * @returns Promise resolving to GPS coordinates
 */
export function getCurrentPosition(
  options?: PositionOptions
): Promise<GPSCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache for 1 minute for offline support
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error';
        }

        reject(new Error(errorMessage));
      },
      defaultOptions
    );
  });
}

/**
 * Get cached or current GPS position
 * Falls back to cached position if current position fails
 */
let cachedPosition: GPSCoordinates | null = null;

export async function getPositionWithFallback(): Promise<GPSCoordinates | null> {
  try {
    const position = await getCurrentPosition({ timeout: 5000 });
    cachedPosition = position;
    return position;
  } catch {
    // Return cached position if available
    return cachedPosition;
  }
}

/**
 * Generate a unique ID for photos
 */
export function generatePhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get device info for photo metadata
 */
export function getDeviceInfo(): string {
  const ua = navigator.userAgent;

  // Try to extract device/browser info
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isIOS = /iPhone|iPad/.test(ua);

  let device = 'Unknown Device';

  if (isIOS) {
    device = ua.match(/iPhone|iPad/)?.[0] ?? 'iOS Device';
  } else if (isAndroid) {
    device = 'Android Device';
  } else if (isMobile) {
    device = 'Mobile Device';
  } else {
    device = 'Desktop';
  }

  return device;
}

/**
 * Format timestamp for watermark display
 */
export function formatTimestampForWatermark(date: Date = new Date()): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Estimate file size from base64 string (in bytes)
 */
export function estimateBase64Size(base64: string): number {
  // Remove data URL prefix if present
  const base64Data = base64.split(',')[1] || base64;
  // Base64 encodes 3 bytes into 4 characters
  return Math.round((base64Data.length * 3) / 4);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Read image from file input and convert to base64
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

export default {
  createThumbnail,
  addWatermark,
  compressImage,
  getCurrentPosition,
  getPositionWithFallback,
  generatePhotoId,
  getDeviceInfo,
  formatTimestampForWatermark,
  estimateBase64Size,
  formatFileSize,
  readFileAsBase64,
};
