export interface GamificationStats {
  current_streak: number;
  best_streak: number;
  completion_rate: number;
  avg_job_duration_minutes: number;
  jobs_completed_week: number;
  jobs_completed_month: number;
  jobs_completed_lifetime: number;
  on_time_rate: number;
  job_types_completed: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface LeaderboardEntry {
  rank: number;
  technician_id: string;
  name: string;
  jobs_completed: number;
  is_current_user: boolean;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  my_position: LeaderboardEntry | null;
  total_technicians: number;
}

export interface MilestonesResponse {
  milestones: string[];
}
