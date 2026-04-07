export type LocationSource = "customer_record" | "transcript" | "area_code";
export type ServiceZone = "core" | "extended" | "outside";

export interface DetectedLocation {
  lat: number;
  lng: number;
  source: LocationSource;
  address_text: string;
  zone: ServiceZone;
  drive_minutes: number;
  customer_id: string | null;
  confidence: number;
  transcript_excerpt: string;
}

export interface LocationDetectedEvent {
  type: "location_detected";
  data: DetectedLocation;
}

export interface NearbyJob {
  id: string;
  customer_name: string;
  address: string;
  lat: number;
  lng: number;
  scheduled_date: string | null;
  status: string;
  service_type: string | null;
  distance_miles: number;
}

export interface CallMapState {
  location: DetectedLocation | null;
  nearbyJobs: NearbyJob[];
  isVisible: boolean;
  isExpanded: boolean;
  activeCallSid: string | null;
  callerNumber: string | null;
  setCallerNumber: (number: string | null) => void;

  setLocation: (location: DetectedLocation) => void;
  setNearbyJobs: (jobs: NearbyJob[]) => void;
  clearLocation: () => void;
  setVisible: (visible: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setActiveCallSid: (callSid: string | null) => void;
  reset: () => void;
}
