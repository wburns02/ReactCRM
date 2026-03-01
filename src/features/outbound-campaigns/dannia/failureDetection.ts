import type { HourlyMetrics, DanniaModeConfig } from "./types";

export interface FailureCondition {
  type: "low_connect_rate" | "low_interest_rate" | "low_velocity";
  severity: "warning" | "critical";
  message: string;
  suggestion: string;
}

/**
 * Check for failure conditions based on recent performance.
 * Returns an array of detected failures (empty = everything is fine).
 */
export function checkFailureConditions(
  hourlyData: HourlyMetrics[],
  config: DanniaModeConfig,
): FailureCondition[] {
  const failures: FailureCondition[] = [];
  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = now.toISOString().split("T")[0];

  // Get recent hours of data (within failure window)
  const recentHours = hourlyData.filter(
    (h) =>
      h.date === todayStr &&
      h.hour >= currentHour - config.failureWindowHours &&
      h.hour <= currentHour,
  );

  if (recentHours.length < 2) return failures; // not enough data

  // Check connect rate
  const totalCalls = recentHours.reduce((s, h) => s + h.callsMade, 0);
  const totalConnects = recentHours.reduce((s, h) => s + h.connected, 0);

  if (totalCalls >= 8) {
    const connectRate = (totalConnects / totalCalls) * 100;
    if (connectRate < config.connectRateThreshold) {
      failures.push({
        type: "low_connect_rate",
        severity: connectRate < 10 ? "critical" : "warning",
        message: `Connect rate is ${connectRate.toFixed(0)}% over the last ${config.failureWindowHours} hours (threshold: ${config.connectRateThreshold}%)`,
        suggestion: "Try shifting to a different zone cluster or time block",
      });
    }
  }

  // Check interest rate
  if (totalConnects >= 5) {
    const totalInterested = recentHours.reduce((s, h) => s + h.interested, 0);
    const interestRate = (totalInterested / totalConnects) * 100;
    if (interestRate < config.interestRateThreshold) {
      failures.push({
        type: "low_interest_rate",
        severity: "warning",
        message: `Interest rate is ${interestRate.toFixed(0)}% over the last ${config.failureWindowHours} hours (threshold: ${config.interestRateThreshold}%)`,
        suggestion: "Consider boosting contract urgency weighting in queue",
      });
    }
  }

  // Check velocity
  const hoursWorked = recentHours.length;
  if (hoursWorked >= 1) {
    const velocity = totalCalls / hoursWorked;
    if (velocity < config.lowVelocityThreshold) {
      failures.push({
        type: "low_velocity",
        severity: velocity < 2 ? "critical" : "warning",
        message: `Only ${velocity.toFixed(1)} calls/hour (threshold: ${config.lowVelocityThreshold})`,
        suggestion:
          "Consider taking a short break, then queue high-probability contacts",
      });
    }
  }

  return failures;
}

/**
 * Get recommended zone to shift to based on performance data
 */
export function getRecommendedZoneShift(
  hourlyData: HourlyMetrics[],
  currentZones: string[],
  allZones: string[],
): string | null {
  // Find zones not currently being worked
  const availableZones = allZones.filter((z) => !currentZones.includes(z));
  // Return a random available zone or null
  return availableZones.length > 0
    ? availableZones[Math.floor(Math.random() * availableZones.length)]
    : null;
}
