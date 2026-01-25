/**
 * Escalation Risk Gauge Component
 * Displays a semi-circular gauge showing overall escalation risk
 * with color zones and animated needle
 */

import { useMemo, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { EscalationRisk } from "../types";

// Risk zone configuration
const RISK_ZONES = {
  low: { min: 0, max: 25, color: "#22c55e", label: "Low" },
  medium: { min: 25, max: 50, color: "#f59e0b", label: "Medium" },
  high: { min: 50, max: 75, color: "#f97316", label: "High" },
  critical: { min: 75, max: 100, color: "#ef4444", label: "Critical" },
} as const;

interface EscalationGaugeProps {
  riskScore: number; // 0-100
  riskCounts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  isLoading: boolean;
  onRiskClick?: (risk: EscalationRisk) => void;
}

/**
 * Convert polar coordinates to cartesian
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Generate SVG arc path
 */
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

/**
 * Map a value (0-100) to angle range (-120 to 120 degrees)
 */
function valueToAngle(value: number): number {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  // Map 0-100 to -120 to 120 degrees (240 degree arc)
  return -120 + (clampedValue / 100) * 240;
}

/**
 * Get color for a given risk score
 */
function getColorForScore(score: number): string {
  if (score < 25) return RISK_ZONES.low.color;
  if (score < 50) return RISK_ZONES.medium.color;
  if (score < 75) return RISK_ZONES.high.color;
  return RISK_ZONES.critical.color;
}

/**
 * Get risk level label for a given score
 */
function getRiskLabel(score: number): string {
  if (score < 25) return RISK_ZONES.low.label;
  if (score < 50) return RISK_ZONES.medium.label;
  if (score < 75) return RISK_ZONES.high.label;
  return RISK_ZONES.critical.label;
}

/**
 * Loading skeleton for the gauge
 */
function GaugeSkeleton() {
  return (
    <div className="space-y-6">
      {/* Gauge skeleton */}
      <div className="flex justify-center">
        <Skeleton variant="circular" className="w-48 h-24" />
      </div>
      {/* Count cards skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" className="h-20" />
        ))}
      </div>
    </div>
  );
}

/**
 * Semi-circular gauge SVG component
 */
function GaugeSVG({ score, animated }: { score: number; animated: boolean }) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);

  // Animate the needle on mount
  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    const duration = 1000; // 1 second animation
    const startTime = Date.now();
    const startValue = displayScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (score - startValue) * easeProgress;
      setDisplayScore(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, animated]);

  // SVG dimensions
  const width = 240;
  const height = 140;
  const centerX = width / 2;
  const centerY = height - 20;
  const radius = 90;
  const innerRadius = 70;

  // Generate arc paths for each risk zone
  const arcs = useMemo(() => {
    const zones = [
      { ...RISK_ZONES.low, startAngle: -120, endAngle: -60 },
      { ...RISK_ZONES.medium, startAngle: -60, endAngle: 0 },
      { ...RISK_ZONES.high, startAngle: 0, endAngle: 60 },
      { ...RISK_ZONES.critical, startAngle: 60, endAngle: 120 },
    ];

    return zones.map((zone) => ({
      color: zone.color,
      path: describeArc(
        centerX,
        centerY,
        radius,
        zone.startAngle,
        zone.endAngle,
      ),
      innerPath: describeArc(
        centerX,
        centerY,
        innerRadius,
        zone.startAngle,
        zone.endAngle,
      ),
    }));
  }, [centerX, centerY, radius, innerRadius]);

  // Calculate needle position
  const needleAngle = valueToAngle(displayScore);
  const needleTip = polarToCartesian(centerX, centerY, radius - 5, needleAngle);
  const needleBase1 = polarToCartesian(centerX, centerY, 8, needleAngle - 90);
  const needleBase2 = polarToCartesian(centerX, centerY, 8, needleAngle + 90);

  const needlePath = `M ${needleTip.x} ${needleTip.y} L ${needleBase1.x} ${needleBase1.y} L ${needleBase2.x} ${needleBase2.y} Z`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="max-w-[280px] mx-auto"
    >
      {/* Background track */}
      <path
        d={describeArc(centerX, centerY, radius, -120, 120)}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* Colored zone arcs */}
      {arcs.map((arc, index) => (
        <path
          key={index}
          d={arc.path}
          fill="none"
          stroke={arc.color}
          strokeWidth="20"
          strokeLinecap="butt"
        />
      ))}

      {/* Inner track (for visual depth) */}
      <path
        d={describeArc(centerX, centerY, innerRadius - 5, -120, 120)}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth="2"
      />

      {/* Tick marks */}
      {[0, 25, 50, 75, 100].map((value) => {
        const angle = valueToAngle(value);
        const outer = polarToCartesian(centerX, centerY, radius + 5, angle);
        const inner = polarToCartesian(centerX, centerY, radius - 25, angle);
        return (
          <line
            key={value}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            stroke="#9ca3af"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}

      {/* Needle */}
      <path
        d={needlePath}
        fill={getColorForScore(displayScore)}
        stroke="#1f2937"
        strokeWidth="1"
      />

      {/* Center hub */}
      <circle cx={centerX} cy={centerY} r="12" fill="#374151" />
      <circle cx={centerX} cy={centerY} r="8" fill="#6b7280" />
      <circle cx={centerX} cy={centerY} r="4" fill="#9ca3af" />

      {/* Center text */}
      <text
        x={centerX}
        y={centerY - 30}
        textAnchor="middle"
        className="fill-text-primary text-3xl font-bold"
        style={{ fontSize: "28px", fontWeight: 700 }}
      >
        {Math.round(displayScore)}%
      </text>

      {/* Risk label */}
      <text
        x={centerX}
        y={centerY - 55}
        textAnchor="middle"
        className="fill-text-secondary text-sm"
        style={{ fontSize: "12px" }}
      >
        {getRiskLabel(displayScore)} Risk
      </text>
    </svg>
  );
}

/**
 * Risk count card component
 */
function RiskCountCard({
  count,
  color,
  label,
  onClick,
}: {
  count: number;
  color: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-3 rounded-lg border border-border bg-bg-card hover:bg-bg-muted transition-colors cursor-pointer group"
      type="button"
      aria-label={`${count} calls with ${label.toLowerCase()} risk`}
    >
      <div
        className="w-3 h-3 rounded-full mb-2 group-hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
      />
      <span className="text-2xl font-bold text-text-primary">{count}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </button>
  );
}

/**
 * Escalation Risk Gauge
 * Displays a semi-circular gauge showing overall escalation risk
 * with color zones, animated needle, and risk level counts
 */
export function EscalationGauge({
  riskScore,
  riskCounts,
  isLoading,
  onRiskClick,
}: EscalationGaugeProps) {
  // Calculate total calls
  const totalCalls =
    riskCounts.low + riskCounts.medium + riskCounts.high + riskCounts.critical;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escalation Risk Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GaugeSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Gauge */}
            <div className="flex justify-center py-4">
              <GaugeSVG score={riskScore} animated={true} />
            </div>

            {/* Risk count cards */}
            <div className="grid grid-cols-4 gap-3">
              <RiskCountCard
                count={riskCounts.low}
                color={RISK_ZONES.low.color}
                label={RISK_ZONES.low.label}
                onClick={() => onRiskClick?.("low")}
              />
              <RiskCountCard
                count={riskCounts.medium}
                color={RISK_ZONES.medium.color}
                label={RISK_ZONES.medium.label}
                onClick={() => onRiskClick?.("medium")}
              />
              <RiskCountCard
                count={riskCounts.high}
                color={RISK_ZONES.high.color}
                label={RISK_ZONES.high.label}
                onClick={() => onRiskClick?.("high")}
              />
              <RiskCountCard
                count={riskCounts.critical}
                color={RISK_ZONES.critical.color}
                label={RISK_ZONES.critical.label}
                onClick={() => onRiskClick?.("critical")}
              />
            </div>

            {/* Total calls footer */}
            <div className="text-center text-sm text-text-secondary pt-2 border-t border-border">
              Based on {totalCalls.toLocaleString()} analyzed calls
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EscalationGauge;
