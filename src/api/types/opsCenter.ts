export interface OpsTechnician {
  id: string;
  name: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: string | null;
  status: string;
  speed: number | null;
  last_seen: string | null;
  jobs_today: number;
  active_job: {
    id: string;
    wo_number: string;
    job_type: string;
    status: string;
    address: string;
  } | null;
}

export interface OpsJob {
  id: string;
  wo_number: string;
  customer_id: string | null;
  technician_id: string | null;
  assigned_technician: string | null;
  job_type: string;
  priority: string;
  status: string;
  time_window_start: string | null;
  time_window_end: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  amount: number | null;
  is_started: boolean;
  customer_name: string | null;
}

export interface OpsAlert {
  type: string;
  severity: "danger" | "warning" | "info";
  message: string;
  work_order_id: string;
}

export interface OpsStats {
  total_jobs: number;
  completed: number;
  in_progress: number;
  remaining: number;
  unassigned: number;
  on_duty_techs: number;
  total_techs: number;
  revenue_today: number;
  utilization_pct: number;
}

export interface OpsWeather {
  temperature_f: number;
  windspeed_mph: number;
  wind_direction: number | null;
  weather_code: number | null;
  is_day: boolean;
}

export interface OpsLiveState {
  technicians: OpsTechnician[];
  jobs: OpsJob[];
  alerts: OpsAlert[];
  stats: OpsStats;
  weather: OpsWeather | null;
  timestamp: string;
}

export interface DispatchRecommendation {
  id: string;
  name: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: string;
  status: string;
  dispatch_score: number;
  dispatch_factors: string[];
  distance_miles?: number;
  estimated_travel_minutes?: number;
}

export interface RecommendResponse {
  work_order_id: string;
  wo_number: string;
  job_type: string;
  priority: string;
  recommendations: DispatchRecommendation[];
}
