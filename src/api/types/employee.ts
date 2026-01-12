/**
 * Employee Portal types for field technicians
 */

export interface EmployeeJob {
  id: string;
  work_order_number?: string;
  customer_name: string;
  customer_phone?: string;
  service_type: string;
  status: "scheduled" | "en_route" | "in_progress" | "completed" | "cancelled";
  scheduled_date: string;
  time_window_start?: string;
  time_window_end?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  estimated_duration_minutes?: number;
}

export interface TimeClockEntry {
  id: string;
  technician_id: string;
  clock_in: string;
  clock_out?: string;
  clock_in_latitude?: number;
  clock_in_longitude?: number;
  clock_out_latitude?: number;
  clock_out_longitude?: number;
  total_hours?: number;
  notes?: string;
  status: "clocked_in" | "clocked_out";
}

export interface ClockInInput {
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ClockOutInput {
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface EmployeeProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  skills?: string[];
  avatar_url?: string;
  is_active: boolean;
}

export interface ChecklistItem {
  id: string;
  work_order_id: string;
  label: string;
  is_required: boolean;
  completed: boolean;
  completed_at?: string;
  notes?: string;
}

export interface JobUpdateInput {
  status?: string;
  notes?: string;
  checklist_items?: { id: string; completed: boolean; notes?: string }[];
  arrival_time?: string;
  completion_time?: string;
  arrival_latitude?: number;
  arrival_longitude?: number;
}

export interface EmployeeDashboardStats {
  jobs_today: number;
  jobs_completed_today: number;
  hours_today: number;
  is_clocked_in: boolean;
  current_time_entry_id?: string;
}
