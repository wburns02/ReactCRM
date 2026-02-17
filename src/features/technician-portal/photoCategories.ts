/**
 * Photo category configuration for Conventional vs Aerobic septic systems.
 *
 * Conventional systems require standard photos.
 * Aerobic systems require all standard photos PLUS additional aerobic-specific photos.
 */

export interface PhotoCategory {
  type: string;
  label: string;
  emoji: string;
  guidance: string;
  /** Only required for aerobic systems */
  aerobicOnly?: boolean;
}

// ── Standard photos (required for ALL system types) ──────────────────────

const STANDARD_PHOTOS: PhotoCategory[] = [
  {
    type: "before",
    label: "Before",
    emoji: "📷",
    guidance: "Photo of the job site before starting work",
  },
  {
    type: "after",
    label: "After",
    emoji: "📸",
    guidance: "Photo of the job site after completing work",
  },
  {
    type: "lid",
    label: "Lid",
    emoji: "🔲",
    guidance: "Photo of the septic tank lid",
  },
  {
    type: "tank",
    label: "Tank",
    emoji: "🪣",
    guidance: "Photo of the tank interior",
  },
  {
    type: "inlet",
    label: "Inlet",
    emoji: "⬅️",
    guidance: "Photo of the inlet pipe connection",
  },
  {
    type: "outlet",
    label: "Outlet",
    emoji: "➡️",
    guidance: "Photo of the outlet pipe connection",
  },
];

// ── Aerobic-only photos (required ONLY for aerobic systems) ──────────────

const AEROBIC_PHOTOS: PhotoCategory[] = [
  {
    type: "disc_filter",
    label: "Disc Filter",
    emoji: "💧",
    guidance: "Take photo of clean disc filter after cleaning",
    aerobicOnly: true,
  },
  {
    type: "control_panel",
    label: "Control Panel",
    emoji: "🎛️",
    guidance: "Photo of the aerobic system control panel",
    aerobicOnly: true,
  },
  {
    type: "breaker",
    label: "Breaker",
    emoji: "⚡",
    guidance: "Photo of the electrical breaker for the system",
    aerobicOnly: true,
  },
  {
    type: "pump_intake",
    label: "Pump Intake",
    emoji: "🔧",
    guidance: "Photo showing pump removed and intake sprayed clean",
    aerobicOnly: true,
  },
  {
    type: "driveway",
    label: "Driveway",
    emoji: "🏠",
    guidance: "Photo of driveway area during aerobic pumping",
    aerobicOnly: true,
  },
  {
    type: "atu_refill",
    label: "ATU Refill",
    emoji: "♻️",
    guidance: "Photo confirming ATU has been refilled",
    aerobicOnly: true,
  },
];

// ── Exported helpers ─────────────────────────────────────────────────────

export type SystemType = "conventional" | "aerobic";

/**
 * Returns the required photo categories for a given system type.
 * Conventional: 6 standard photos
 * Aerobic: 6 standard + 6 aerobic = 12 photos
 */
export function getRequiredPhotos(systemType: SystemType | string | null | undefined): PhotoCategory[] {
  if (systemType === "aerobic") {
    return [...STANDARD_PHOTOS, ...AEROBIC_PHOTOS];
  }
  return STANDARD_PHOTOS;
}

/** System type display info */
export const SYSTEM_TYPE_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  conventional: { label: "Conventional", emoji: "🏗️", color: "bg-blue-100 text-blue-800" },
  aerobic: { label: "Aerobic", emoji: "💨", color: "bg-purple-100 text-purple-800" },
};
