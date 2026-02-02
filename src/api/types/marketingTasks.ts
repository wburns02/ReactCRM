/**
 * Marketing Tasks Types
 *
 * Types for the Marketing Tasks Dashboard that displays
 * real-time status of SEO services, scheduled tasks, and alerts.
 */

export interface MarketingTaskSite {
  id: string;
  name: string;
  domain: string;
  url: string;
  status: "active" | "inactive" | "error";
  lastUpdated: string;
}

export interface ServiceHealth {
  service: string;
  name: string;
  port: number;
  description: string;
  status: "healthy" | "degraded" | "down" | "unknown" | "local" | "unreachable";
  lastCheck: string;
  details: {
    model_loaded?: boolean;
    gpu?: string;
    gpu_memory_used?: string;
    gbp_connected?: boolean;
    status?: string;
    service?: string;
    timestamp?: string;
    error?: string;
    [key: string]: unknown;
  };
}

export interface ScheduledTask {
  id: string;
  name: string;
  service: string;
  schedule: string;
  scheduleDescription: string;
  description: string;
  nextRun: string | null;
  lastRun: string | null;
  lastStatus: "success" | "failed" | "pending" | null;
  lastError?: string;
}

export interface MarketingAlert {
  id: string;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  url?: string;
  resolved: boolean;
  createdAt: string;
}

export interface MarketingMetrics {
  performanceScore: number;
  seoScore: number;
  indexedPages: number;
  trackedKeywords: number;
  unresolvedAlerts: number;
  publishedPosts: number;
  totalReviews: number;
  averageRating: number;
  pendingResponses: number;
  contentGenerated: number;
}

export interface MarketingTasksResponse {
  success: boolean;
  sites: MarketingTaskSite[];
  services: ServiceHealth[];
  scheduledTasks: ScheduledTask[];
  alerts: MarketingAlert[];
  metrics: MarketingMetrics;
  lastUpdated: string;
  demoMode: boolean; // True when using fallback data (services unreachable)
}
