import { z } from "zod";

/**
 * Vehicle Status
 */
export const vehicleStatusSchema = z.enum([
  "moving",
  "stopped",
  "idling",
  "offline",
]);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

/**
 * Vehicle Location
 */
export const vehicleLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number(),
  speed: z.number(),
  updated_at: z.string(),
});

export type VehicleLocation = z.infer<typeof vehicleLocationSchema>;

/**
 * Vehicle
 */
export const vehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  vin: z.string().optional(),
  driver_id: z.string().optional(),
  driver_name: z.string().optional(),
  location: vehicleLocationSchema,
  status: vehicleStatusSchema,
});

export type Vehicle = z.infer<typeof vehicleSchema>;

/**
 * Location History Point
 */
export const locationHistoryPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string(),
  speed: z.number(),
});

export type LocationHistoryPoint = z.infer<typeof locationHistoryPointSchema>;

/**
 * Vehicle status display labels
 */
export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  moving: "Moving",
  stopped: "Stopped",
  idling: "Idling",
  offline: "Offline",
};

/**
 * Vehicle status colors for map markers
 */
export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  moving: "#22c55e", // green
  stopped: "#ef4444", // red
  idling: "#f59e0b", // amber
  offline: "#9ca3af", // gray
};
