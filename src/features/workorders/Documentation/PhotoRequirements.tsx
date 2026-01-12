/**
 * PhotoRequirements Component
 *
 * Checklist component showing required photos for a job type.
 * Features:
 * - List of required photo types for job type
 * - Checkmarks for captured photos
 * - Click to capture missing photo
 * - Progress indicator (3/5 photos captured)
 */
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { JobType, PhotoType, WorkOrderPhoto } from "@/api/types/workOrder";

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

const PHOTO_TYPE_DESCRIPTIONS: Record<PhotoType, string> = {
  before: "Photo of site before work begins",
  after: "Photo of site after work is completed",
  manifest: "Photo of disposal manifest",
  damage: "Document any pre-existing damage",
  lid: "Photo of tank lid/cover",
  tank: "Photo inside the tank",
  access: "Photo of access point location",
  equipment: "Photo of equipment used",
  other: "Additional documentation",
};

/**
 * Required photos for each job type
 */
const JOB_PHOTO_REQUIREMENTS: Record<JobType, PhotoType[]> = {
  pumping: ["before", "lid", "tank", "manifest", "after"],
  inspection: ["before", "lid", "tank", "after"],
  repair: ["before", "damage", "equipment", "after"],
  installation: ["before", "access", "equipment", "after"],
  emergency: ["before", "damage", "after"],
  maintenance: ["before", "lid", "after"],
  grease_trap: ["before", "lid", "tank", "manifest", "after"],
  camera_inspection: ["before", "access", "equipment", "after"],
};

/**
 * Optional photos that can be added to any job
 */
const OPTIONAL_PHOTO_TYPES: PhotoType[] = ["damage", "other"];

export interface PhotoRequirementsProps {
  jobType: JobType;
  photos: WorkOrderPhoto[];
  onCaptureClick: (photoType: PhotoType) => void;
  className?: string;
  showOptional?: boolean;
}

export function PhotoRequirements({
  jobType,
  photos,
  onCaptureClick,
  className,
  showOptional = true,
}: PhotoRequirementsProps) {
  // Get required photo types for this job
  const requiredTypes = useMemo(() => {
    return JOB_PHOTO_REQUIREMENTS[jobType] || ["before", "after"];
  }, [jobType]);

  // Get optional types (not already required)
  const optionalTypes = useMemo(() => {
    return OPTIONAL_PHOTO_TYPES.filter((type) => !requiredTypes.includes(type));
  }, [requiredTypes]);

  // Build map of captured photos by type
  const capturedByType = useMemo(() => {
    const map = new Map<PhotoType, WorkOrderPhoto[]>();

    photos.forEach((photo) => {
      const type = photo.metadata.photoType;
      const existing = map.get(type) || [];
      map.set(type, [...existing, photo]);
    });

    return map;
  }, [photos]);

  // Calculate progress
  const { capturedCount, requiredCount, progress } = useMemo(() => {
    const captured = requiredTypes.filter((type) =>
      capturedByType.has(type),
    ).length;
    const required = requiredTypes.length;
    const pct = required > 0 ? Math.round((captured / required) * 100) : 0;

    return {
      capturedCount: captured,
      requiredCount: required,
      progress: pct,
    };
  }, [requiredTypes, capturedByType]);

  const isComplete = capturedCount >= requiredCount;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-text-primary">
            Photo Requirements
          </h3>
          <Badge variant={isComplete ? "success" : "warning"}>
            {capturedCount}/{requiredCount} Required
          </Badge>
        </div>
        <span className="text-sm text-text-muted">{progress}% complete</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isComplete ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Required Photos List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-text-secondary">
          Required Photos
        </h4>
        <div className="space-y-1">
          {requiredTypes.map((type) => (
            <PhotoRequirementItem
              key={type}
              type={type}
              photos={capturedByType.get(type)}
              required
              onClick={() => onCaptureClick(type)}
            />
          ))}
        </div>
      </div>

      {/* Optional Photos */}
      {showOptional && optionalTypes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <h4 className="text-sm font-medium text-text-secondary">
            Optional Photos
          </h4>
          <div className="space-y-1">
            {optionalTypes.map((type) => (
              <PhotoRequirementItem
                key={type}
                type={type}
                photos={capturedByType.get(type)}
                required={false}
                onClick={() => onCaptureClick(type)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Photos Captured Message */}
      {isComplete && (
        <div className="flex items-center gap-2 p-3 bg-success-light rounded-lg">
          <svg
            className="w-5 h-5 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-success font-medium">
            All required photos captured!
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Individual requirement item component
 */
interface PhotoRequirementItemProps {
  type: PhotoType;
  photos?: WorkOrderPhoto[];
  required: boolean;
  onClick: () => void;
}

function PhotoRequirementItem({
  type,
  photos,
  required,
  onClick,
}: PhotoRequirementItemProps) {
  const hasPhoto = photos && photos.length > 0;
  const photoCount = photos?.length || 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
        "border border-border",
        hasPhoto
          ? "bg-success-light/30 hover:bg-success-light/50 border-success/30"
          : "bg-bg-card hover:bg-bg-hover",
      )}
    >
      {/* Status Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
          hasPhoto ? "bg-success text-white" : "bg-bg-muted text-text-muted",
        )}
      >
        {hasPhoto ? (
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
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
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium",
              hasPhoto ? "text-success" : "text-text-primary",
            )}
          >
            {PHOTO_TYPE_LABELS[type]}
          </span>
          {required && !hasPhoto && (
            <Badge variant="danger" size="sm">
              Required
            </Badge>
          )}
          {photoCount > 1 && (
            <Badge variant="info" size="sm">
              {photoCount}
            </Badge>
          )}
        </div>
        <p className="text-xs text-text-muted truncate">
          {PHOTO_TYPE_DESCRIPTIONS[type]}
        </p>
      </div>

      {/* Thumbnails preview */}
      {hasPhoto && photos && (
        <div className="flex-shrink-0 flex -space-x-2">
          {photos.slice(0, 3).map((photo, index) => (
            <img
              key={photo.id}
              src={photo.thumbnail}
              alt=""
              className={cn(
                "w-8 h-8 rounded-md object-cover border-2 border-bg-card",
                index > 0 && "-ml-2",
              )}
            />
          ))}
          {photos.length > 3 && (
            <div className="w-8 h-8 rounded-md bg-bg-muted flex items-center justify-center border-2 border-bg-card text-xs text-text-muted">
              +{photos.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Add/Capture indicator */}
      {!hasPhoto && (
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

export default PhotoRequirements;
