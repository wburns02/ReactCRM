import type { Metric } from "web-vitals";
import { captureMessage, addBreadcrumb } from "@/lib/sentry";

// ============================================
// Types
// ============================================

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
}

export interface PerformanceBudget {
  LCP: { good: number; poor: number };
  FID: { good: number; poor: number };
  CLS: { good: number; poor: number };
  TTFB: { good: number; poor: number };
  INP: { good: number; poor: number };
  FCP: { good: number; poor: number };
}

export interface WebVitalsReport {
  metrics: Record<string, WebVitalsMetric>;
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface WebVitalsOptions {
  /** Send metrics to analytics endpoint */
  analyticsEndpoint?: string;
  /** Report to console in development */
  debug?: boolean;
  /** Custom performance budgets */
  budgets?: Partial<PerformanceBudget>;
  /** Callback when metric exceeds budget */
  onBudgetExceeded?: (metric: WebVitalsMetric, budget: number) => void;
  /** Callback when any metric is captured */
  onMetric?: (metric: WebVitalsMetric) => void;
  /** Report to Sentry if configured */
  reportToSentry?: boolean;
}

// ============================================
// Constants
// ============================================

// Default performance budgets based on Core Web Vitals thresholds
// https://web.dev/vitals/
const DEFAULT_BUDGETS: PerformanceBudget = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 }, // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift (unitless)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
};

// Metric descriptions for logging
const METRIC_DESCRIPTIONS: Record<string, string> = {
  LCP: "Largest Contentful Paint - loading performance",
  FID: "First Input Delay - interactivity",
  CLS: "Cumulative Layout Shift - visual stability",
  TTFB: "Time to First Byte - server response time",
  INP: "Interaction to Next Paint - responsiveness",
  FCP: "First Contentful Paint - initial content load",
};

const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;

// ============================================
// State
// ============================================

let isInitialized = false;
const collectedMetrics: Record<string, WebVitalsMetric> = {};
let currentOptions: WebVitalsOptions = {};

// ============================================
// Helper Functions
// ============================================

/**
 * Get rating for a metric value
 */
function getRating(
  name: string,
  value: number,
  budgets: PerformanceBudget,
): "good" | "needs-improvement" | "poor" {
  const budget = budgets[name as keyof PerformanceBudget];
  if (!budget) return "needs-improvement";

  if (value <= budget.good) return "good";
  if (value <= budget.poor) return "needs-improvement";
  return "poor";
}

/**
 * Format metric value for display
 */
function formatMetricValue(name: string, value: number): string {
  if (name === "CLS") {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

/**
 * Log metric to console with styling
 */
function logMetricToConsole(metric: WebVitalsMetric): void {
  const colors = {
    good: "#0cce6b",
    "needs-improvement": "#ffa400",
    poor: "#ff4e42",
  };

  const color = colors[metric.rating];
  const description = METRIC_DESCRIPTIONS[metric.name] || "";

  console.log(
    `%c[WebVitals] ${metric.name}: ${formatMetricValue(metric.name, metric.value)} (${metric.rating})`,
    `color: ${color}; font-weight: bold`,
    description ? `\n  ${description}` : "",
  );
}

/**
 * Send metrics to analytics endpoint
 */
async function sendToAnalytics(
  endpoint: string,
  report: WebVitalsReport,
): Promise<void> {
  try {
    // Use sendBeacon for reliability (survives page unload)
    const data = JSON.stringify(report);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, data);
    } else {
      // Fallback to fetch with keepalive
      await fetch(endpoint, {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "application/json",
        },
        keepalive: true,
      });
    }
  } catch (error) {
    console.error("[WebVitals] Failed to send analytics:", error);
  }
}

/**
 * Report metric to Sentry
 */
function reportToSentry(metric: WebVitalsMetric): void {
  // Add as breadcrumb for context
  addBreadcrumb(
    `Web Vital: ${metric.name} = ${formatMetricValue(metric.name, metric.value)}`,
    "web-vitals",
    {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    },
    metric.rating === "poor" ? "warning" : "info",
  );

  // Report poor metrics as messages
  if (metric.rating === "poor") {
    captureMessage(`Poor Web Vital: ${metric.name}`, "warning", {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      url: window.location.href,
    });
  }
}

// ============================================
// Metric Handler
// ============================================

/**
 * Handle a web vitals metric
 */
function handleMetric(metric: Metric): void {
  const budgets = { ...DEFAULT_BUDGETS, ...currentOptions.budgets };

  const webVitalsMetric: WebVitalsMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value, budgets),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || "navigate",
  };

  // Store metric
  collectedMetrics[metric.name] = webVitalsMetric;

  // Log to console in development or if debug enabled
  if (IS_DEV || currentOptions.debug) {
    logMetricToConsole(webVitalsMetric);
  }

  // Check budget
  const budget = budgets[metric.name as keyof PerformanceBudget];
  if (budget && metric.value > budget.poor) {
    currentOptions.onBudgetExceeded?.(webVitalsMetric, budget.poor);

    if (IS_DEV || currentOptions.debug) {
      console.warn(
        `[WebVitals] Budget exceeded for ${metric.name}: ${formatMetricValue(metric.name, metric.value)} > ${formatMetricValue(metric.name, budget.poor)}`,
      );
    }
  }

  // Report to Sentry if configured
  if (currentOptions.reportToSentry) {
    reportToSentry(webVitalsMetric);
  }

  // Call custom handler
  currentOptions.onMetric?.(webVitalsMetric);
}

// ============================================
// Public API
// ============================================

/**
 * Initialize Web Vitals monitoring
 *
 * Call this once in your app's entry point (e.g., main.tsx)
 *
 * Features:
 * - Tracks all Core Web Vitals (LCP, FID, CLS, TTFB, INP, FCP)
 * - Console logging in development
 * - Performance budget warnings
 * - Optional analytics endpoint
 * - Optional Sentry integration
 */
export async function initWebVitals(
  options: WebVitalsOptions = {},
): Promise<void> {
  if (isInitialized) {
    console.warn("[WebVitals] Already initialized");
    return;
  }

  currentOptions = options;
  isInitialized = true;

  try {
    // Dynamically import web-vitals to avoid blocking initial load
    // Note: FID was removed in web-vitals v4, replaced by INP
    const { onLCP, onCLS, onTTFB, onINP, onFCP } = await import("web-vitals");

    // Register handlers for each metric
    onLCP(handleMetric);
    onCLS(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);
    onFCP(handleMetric);

    if (IS_DEV || options.debug) {
      console.log("[WebVitals] Initialized");
    }
  } catch (error) {
    console.error("[WebVitals] Failed to initialize:", error);
  }
}

/**
 * Get all collected metrics
 */
export function getMetrics(): Record<string, WebVitalsMetric> {
  return { ...collectedMetrics };
}

/**
 * Get a specific metric
 */
export function getMetric(name: string): WebVitalsMetric | undefined {
  return collectedMetrics[name];
}

/**
 * Generate a complete report of all metrics
 */
export function generateReport(): WebVitalsReport {
  return {
    metrics: { ...collectedMetrics },
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
}

/**
 * Send current metrics to analytics endpoint
 */
export async function sendMetrics(endpoint?: string): Promise<void> {
  const targetEndpoint = endpoint || currentOptions.analyticsEndpoint;

  if (!targetEndpoint) {
    console.warn("[WebVitals] No analytics endpoint configured");
    return;
  }

  const report = generateReport();
  await sendToAnalytics(targetEndpoint, report);
}

/**
 * Get performance score (0-100) based on collected metrics
 */
export function getPerformanceScore(): number {
  const metrics = Object.values(collectedMetrics);

  if (metrics.length === 0) {
    return -1; // Not enough data
  }

  // Weight each metric equally
  const scores = metrics.map((metric) => {
    switch (metric.rating) {
      case "good":
        return 100;
      case "needs-improvement":
        return 50;
      case "poor":
        return 0;
    }
  });

  const sum = scores.reduce((a: number, b: number) => a + b, 0);
  return Math.round(sum / scores.length);
}

/**
 * Check if all Core Web Vitals pass
 */
export function passesWebVitals(): boolean {
  const coreVitals = ["LCP", "FID", "CLS"];
  return coreVitals.every((name) => {
    const metric = collectedMetrics[name];
    return !metric || metric.rating !== "poor";
  });
}

/**
 * Reset collected metrics (useful for SPA navigation)
 */
export function resetMetrics(): void {
  Object.keys(collectedMetrics).forEach((key) => {
    delete collectedMetrics[key];
  });
}

// ============================================
// React Hook
// ============================================

import { useState as useStateHook, useEffect as useEffectHook } from "react";

/**
 * React hook to access Web Vitals metrics
 */
export function useWebVitals(): {
  metrics: Record<string, WebVitalsMetric>;
  score: number;
  isGood: boolean;
} {
  const [metrics, setMetrics] = useStateHook<Record<string, WebVitalsMetric>>(
    {},
  );

  useEffectHook(() => {
    // Initial load
    setMetrics(getMetrics());

    // Poll for updates (metrics come in asynchronously)
    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    score: getPerformanceScore(),
    isGood: passesWebVitals(),
  };
}

// ============================================
// Auto-init for Production
// ============================================

// In production, auto-initialize if Sentry is configured
if (IS_PROD && import.meta.env.VITE_SENTRY_DSN) {
  initWebVitals({
    reportToSentry: true,
    debug: false,
  });
}
