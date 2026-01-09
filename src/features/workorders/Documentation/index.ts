/**
 * Documentation Components Index
 *
 * Photo capture, gallery, signatures, and inspection forms
 * for work order documentation.
 */

// Photo components
export { PhotoCapture, type CapturedPhoto, type PhotoCaptureProps } from './PhotoCapture';
export { PhotoGallery, type PhotoGalleryProps } from './PhotoGallery';
export { PhotoRequirements, type PhotoRequirementsProps } from './PhotoRequirements';
export { PhotoSection, type PhotoSectionProps } from './PhotoSection';

// Signature components
export { SignatureCapture, type SignatureData, type SignatureCaptureProps } from './SignatureCapture';
export { SignatureDisplay, SignaturePairDisplay, type SignatureDisplayProps, type SignaturePairDisplayProps } from './SignatureDisplay';

// Inspection form
export { InspectionForm, type InspectionFormProps } from './InspectionForm';

// Hooks
export { useCamera, type CameraState, type UseCameraResult, type FacingMode } from './hooks/useCamera';

// Utilities
export {
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
  type GPSCoordinates,
} from './utils/imageProcessing';
