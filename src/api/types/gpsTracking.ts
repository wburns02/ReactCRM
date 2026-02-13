/**
 * GPS Tracking Types
 * Real-time technician location, ETA, geofencing, and customer tracking
 */

export interface TechnicianLocation {
  technician_id: string;
  technician_name: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  is_online: boolean;
  battery_level?: number;
  current_status: string;
  current_work_order_id?: string;
  captured_at: string;
  received_at: string;
  minutes_since_update: number;
}

export interface AllTechniciansLocationResponse {
  technicians: TechnicianLocation[];
  total_online: number;
  total_offline: number;
  last_refresh: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
  captured_at: string;
  current_status?: string;
  work_order_id?: string;
}

export interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  captured_at: string;
  status?: string;
  distance_from_previous?: number;
}

export interface LocationHistoryResponse {
  technician_id: string;
  technician_name: string;
  date: string;
  points: LocationHistoryPoint[];
  total_distance_miles: number;
  total_duration_minutes: number;
  average_speed_mph?: number;
}

export interface ETAResponse {
  work_order_id: string;
  technician_id: string;
  technician_name: string;
  technician_latitude: number;
  technician_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  distance_miles: number;
  duration_minutes: number;
  traffic_factor: number;
  adjusted_duration_minutes: number;
  estimated_arrival: string;
  confidence: number;
  calculation_source: string;
  calculated_at: string;
}

export type GeofenceType =
  | "customer_site"
  | "office"
  | "warehouse"
  | "service_area"
  | "exclusion_zone";

export type GeofenceAction =
  | "clock_in"
  | "clock_out"
  | "notify_dispatch"
  | "notify_customer"
  | "start_job"
  | "complete_job"
  | "log_only";

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  geofence_type: GeofenceType;
  is_active: boolean;
  center_latitude?: number;
  center_longitude?: number;
  radius_meters?: number;
  polygon_coordinates?: number[][];
  customer_id?: string;
  work_order_id?: string;
  entry_action: GeofenceAction;
  exit_action: GeofenceAction;
  notify_on_entry: boolean;
  notify_on_exit: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeofenceCreate {
  name: string;
  description?: string;
  geofence_type: GeofenceType;
  center_latitude?: number;
  center_longitude?: number;
  radius_meters?: number;
  polygon_coordinates?: number[][];
  customer_id?: string;
  work_order_id?: string;
  entry_action?: GeofenceAction;
  exit_action?: GeofenceAction;
  notify_on_entry?: boolean;
  notify_on_exit?: boolean;
  notification_recipients?: string[];
  active_start_time?: string;
  active_end_time?: string;
  active_days?: number[];
}

export interface GeofenceEvent {
  id: string;
  geofence_id: string;
  geofence_name: string;
  technician_id: string;
  technician_name: string;
  event_type: "entry" | "exit";
  latitude: number;
  longitude: number;
  action_triggered?: GeofenceAction;
  action_result?: string;
  occurred_at: string;
}

export interface TrackingLink {
  id: string;
  token: string;
  tracking_url: string;
  work_order_id: string;
  customer_id: string;
  technician_id: string;
  status: "active" | "expired" | "viewed" | "completed";
  expires_at: string;
  view_count: number;
  created_at: string;
}

export interface TrackingLinkCreate {
  work_order_id: string;
  show_technician_name?: boolean;
  show_technician_photo?: boolean;
  show_live_map?: boolean;
  show_eta?: boolean;
  expires_hours?: number;
}

export interface PublicTrackingInfo {
  work_order_id: string;
  service_type: string;
  scheduled_date: string;
  technician_name?: string;
  technician_photo_url?: string;
  technician_latitude?: number;
  technician_longitude?: number;
  destination_latitude: number;
  destination_longitude: number;
  eta_minutes?: number;
  eta_arrival_time?: string;
  distance_miles?: number;
  status:
    | "scheduled"
    | "en_route"
    | "arriving_soon"
    | "arrived"
    | "in_progress"
    | "completed";
  status_message: string;
  last_updated: string;
}

export interface DispatchMapTechnician {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  current_work_order_id?: string;
  current_job_address?: string;
  battery_level?: number;
  speed?: number;
  last_updated: string;
  is_stale: boolean;
}

export interface DispatchMapWorkOrder {
  id: string;
  customer_name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  scheduled_time?: string;
  assigned_technician_id?: string;
  assigned_technician_name?: string;
  service_type: string;
  priority: string;
}

export interface DispatchMapVehicle {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: "moving" | "idling" | "stopped" | "offline";
  updated_at: string;
}

export interface DispatchMapData {
  technicians: DispatchMapTechnician[];
  work_orders: DispatchMapWorkOrder[];
  vehicles: DispatchMapVehicle[];
  geofences: Geofence[];
  center_latitude: number;
  center_longitude: number;
  zoom_level: number;
  last_refresh: string;
}

export interface GPSConfig {
  id: string;
  technician_id?: string;
  active_interval: number;
  idle_interval: number;
  background_interval: number;
  tracking_enabled: boolean;
  geofencing_enabled: boolean;
  auto_clockin_enabled: boolean;
  customer_tracking_enabled: boolean;
  high_accuracy_mode: boolean;
  battery_saver_threshold: number;
  track_during_breaks: boolean;
  track_after_hours: boolean;
  work_hours_start: string;
  work_hours_end: string;
  history_retention_days: number;
  updated_at: string;
}

export interface GPSConfigUpdate {
  active_interval?: number;
  idle_interval?: number;
  background_interval?: number;
  tracking_enabled?: boolean;
  geofencing_enabled?: boolean;
  auto_clockin_enabled?: boolean;
  customer_tracking_enabled?: boolean;
  high_accuracy_mode?: boolean;
  battery_saver_threshold?: number;
  track_during_breaks?: boolean;
  track_after_hours?: boolean;
  work_hours_start?: string;
  work_hours_end?: string;
  history_retention_days?: number;
}
