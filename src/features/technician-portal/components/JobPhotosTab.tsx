import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import type { PhotoCategory } from "../photoCategories.ts";
import { SYSTEM_TYPE_INFO } from "../photoCategories.ts";
import type { PhotoGalleryItem } from "@/api/hooks/useTechPortal.ts";

interface UploadedPhoto {
  id: string;
  photo_type: string;
  data_url: string;
  thumbnail_url: string | null;
}

export interface JobPhotosTabProps {
  systemType: string | null | undefined;
  photos: UploadedPhoto[];
  galleryPhotos: PhotoGalleryItem[];
  requiredPhotos: PhotoCategory[];
  uploadedPhotoTypes: Set<string>;
  missingPhotos: PhotoCategory[];
  photosComplete: boolean;
  photosUploaded: number;
  photoProgressPct: number;
  uploadIsPending: boolean;
  uploadingPhotoType: string | null;
  lightboxPhoto: PhotoGalleryItem | null;
  lightboxIndex: number;
  onPhotoCapture: (type: string) => void;
  onSetLightboxPhoto: (photo: PhotoGalleryItem | null) => void;
  onSetLightboxIndex: (index: number) => void;
}

export function JobPhotosTab({
  systemType,
  photos,
  galleryPhotos,
  requiredPhotos,
  uploadedPhotoTypes,
  missingPhotos,
  photosComplete,
  photosUploaded,
  photoProgressPct,
  uploadIsPending,
  uploadingPhotoType,
  lightboxPhoto,
  lightboxIndex,
  onPhotoCapture,
  onSetLightboxPhoto,
  onSetLightboxIndex,
}: JobPhotosTabProps) {
  return (
    <>
      {/* Required Photos — dynamic based on system type */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <span className="text-xl">📸</span> Required Photos
            </h2>
            {systemType && SYSTEM_TYPE_INFO[systemType] && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${SYSTEM_TYPE_INFO[systemType].color}`}>
                {SYSTEM_TYPE_INFO[systemType].emoji} {SYSTEM_TYPE_INFO[systemType].label}
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted mb-3">
            {requiredPhotos.length} photos required{systemType === "aerobic" ? " (includes aerobic-specific)" : ""} before completing the job.
          </p>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-text-secondary">
                {photosUploaded} of {requiredPhotos.length} photos
              </span>
              <span className={`font-bold ${photosComplete ? "text-green-600" : "text-orange-600"}`}>
                {photoProgressPct}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  photosComplete ? "bg-green-500" : photoProgressPct > 50 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${photoProgressPct}%` }}
              />
            </div>
          </div>

          {/* Standard photos section */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              Standard Photos
            </p>
            <div className="grid grid-cols-2 gap-3">
              {requiredPhotos.filter((r) => !r.aerobicOnly).map((req) => {
                const uploaded = photos.find((p) => p.photo_type === req.type);
                const isUploading = uploadIsPending && uploadingPhotoType === req.type;
                return (
                  <button
                    key={req.type}
                    onClick={() => onPhotoCapture(req.type)}
                    disabled={isUploading}
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 transition-all min-h-[130px] ${
                      uploaded
                        ? "border-green-400 bg-green-50"
                        : "border-red-300 bg-red-50 hover:border-red-400 active:bg-red-100"
                    }`}
                  >
                    {uploaded ? (
                      <>
                        <img
                          src={uploaded.data_url || uploaded.thumbnail_url || ""}
                          alt={req.label}
                          className="w-full h-20 object-cover rounded-lg mb-2"
                        />
                        <span className="text-green-700 text-sm font-medium flex items-center gap-1">
                          ✅ {req.label}
                        </span>
                        <span className="text-xs text-green-600 mt-0.5">Tap to retake</span>
                      </>
                    ) : (
                      <>
                        {isUploading ? (
                          <span className="text-3xl animate-pulse">⏳</span>
                        ) : (
                          <span className="text-3xl">{req.emoji}</span>
                        )}
                        <span className="text-red-700 text-sm font-bold mt-2">{req.label}</span>
                        <span className="text-xs text-red-500 mt-0.5 text-center leading-tight">{req.guidance}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aerobic-only photos section */}
          {requiredPhotos.some((r) => r.aerobicOnly) && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                💨 Aerobic System Photos
              </p>
              <div className="grid grid-cols-2 gap-3">
                {requiredPhotos.filter((r) => r.aerobicOnly).map((req) => {
                  const uploaded = photos.find((p) => p.photo_type === req.type);
                  const isUploading = uploadIsPending && uploadingPhotoType === req.type;
                  return (
                    <button
                      key={req.type}
                      onClick={() => onPhotoCapture(req.type)}
                      disabled={isUploading}
                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 transition-all min-h-[130px] ${
                        uploaded
                          ? "border-green-400 bg-green-50"
                          : "border-purple-300 bg-purple-50 hover:border-purple-400 active:bg-purple-100"
                      }`}
                    >
                      {uploaded ? (
                        <>
                          <img
                            src={uploaded.data_url || uploaded.thumbnail_url || ""}
                            alt={req.label}
                            className="w-full h-20 object-cover rounded-lg mb-2"
                          />
                          <span className="text-green-700 text-sm font-medium flex items-center gap-1">
                            ✅ {req.label}
                          </span>
                          <span className="text-xs text-green-600 mt-0.5">Tap to retake</span>
                        </>
                      ) : (
                        <>
                          {isUploading ? (
                            <span className="text-3xl animate-pulse">⏳</span>
                          ) : (
                            <span className="text-3xl">{req.emoji}</span>
                          )}
                          <span className="text-purple-700 text-sm font-bold mt-2">{req.label}</span>
                          <span className="text-xs text-purple-500 mt-0.5 text-center leading-tight">{req.guidance}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status summary */}
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm font-medium ${
              photosComplete ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {photosComplete
              ? "All required photos uploaded ✓"
              : `${missingPhotos.length} of ${requiredPhotos.length} required photos still needed`}
          </div>
        </CardContent>
      </Card>

      {/* Additional Photos */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-xl">📷</span> Additional Photos
          </h2>
          <Button
            variant="outline"
            onClick={() => onPhotoCapture("other")}
            disabled={uploadIsPending}
            className="w-full h-12 rounded-xl"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">➕</span> Add Extra Photo
            </span>
          </Button>

          {/* Gallery grid — full-res if available */}
          {galleryPhotos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {galleryPhotos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => { onSetLightboxPhoto(photo); onSetLightboxIndex(idx); }}
                  className="relative group cursor-pointer"
                >
                  <img
                    src={photo.thumbnail_url || photo.data_url || ""}
                    alt={photo.photo_type}
                    className="w-full h-24 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {photo.photo_type}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-black/40 text-white rounded-full p-1 text-xs">🔍</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Fallback if gallery hasn't loaded yet */}
          {galleryPhotos.length === 0 && photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.data_url || photo.thumbnail_url || ""}
                    alt={photo.photo_type}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {photo.photo_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => onSetLightboxPhoto(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-lg capitalize font-medium">{lightboxPhoto.photo_type} Photo</span>
              {lightboxPhoto.timestamp && (
                <span className="text-sm text-white/70">
                  {new Date(lightboxPhoto.timestamp).toLocaleString("en-US", {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
                  })}
                </span>
              )}
            </div>
            <button
              onClick={() => onSetLightboxPhoto(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-xl"
            >
              ✕
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhoto.data_url || lightboxPhoto.thumbnail_url}
              alt={lightboxPhoto.photo_type}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Navigation */}
          {galleryPhotos.length > 1 && (
            <div className="flex items-center justify-center gap-6 p-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  const prev = (lightboxIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
                  onSetLightboxIndex(prev);
                  onSetLightboxPhoto(galleryPhotos[prev]);
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-xl"
              >
                ◀
              </button>
              <span className="text-white/70 text-sm">
                {lightboxIndex + 1} / {galleryPhotos.length}
              </span>
              <button
                onClick={() => {
                  const next = (lightboxIndex + 1) % galleryPhotos.length;
                  onSetLightboxIndex(next);
                  onSetLightboxPhoto(galleryPhotos[next]);
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-xl"
              >
                ▶
              </button>
            </div>
          )}

          {/* GPS info */}
          {(lightboxPhoto.gps_lat && lightboxPhoto.gps_lng) && (
            <div className="flex justify-center pb-4" onClick={(e) => e.stopPropagation()}>
              <a
                href={`https://maps.google.com/?q=${lightboxPhoto.gps_lat},${lightboxPhoto.gps_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 text-xs hover:text-white/80 underline"
              >
                📍 View location ({lightboxPhoto.gps_lat.toFixed(4)}, {lightboxPhoto.gps_lng.toFixed(4)})
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
