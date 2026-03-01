import { useMemo } from "react";
import { useDanniaStore } from "../danniaStore";
import { usePerformanceLoop } from "../usePerformanceLoop";
import { buildDailyGoals, BADGE_DEFINITIONS } from "../gamification";
import type { DailyGoal } from "../gamification";
import { StreakCounter } from "./StreakCounter";

/**
 * SVG progress ring component
 */
function ProgressRing({
  goal,
  size = 72,
  strokeWidth = 5,
}: {
  goal: DailyGoal;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(goal.current / goal.target, 1);
  const offset = circumference - progress * circumference;
  const pct = Math.round(progress * 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={goal.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-text-primary tabular-nums">
            {goal.current}
          </span>
          <span className="text-[8px] text-text-tertiary">/{goal.target}</span>
        </div>
      </div>
      <div className="text-[10px] font-medium text-text-secondary">
        {goal.label}
      </div>
      {pct >= 100 && (
        <div className="text-[9px] text-emerald-600 font-bold">{"\u2713"} Done!</div>
      )}
    </div>
  );
}

/**
 * Gamification widget that replaces QuickStats in Today's Plan.
 * Shows 3 progress rings, streak counter, and earned badges.
 */
export function DanniaGamification() {
  const { performanceMetrics } = usePerformanceLoop();
  const config = useDanniaStore((s) => s.config);
  const earnedBadges = useDanniaStore((s) => s.earnedBadges);

  const dailyGoals = useMemo(
    () => buildDailyGoals(performanceMetrics, config.maxCallsPerDay),
    [performanceMetrics, config.maxCallsPerDay],
  );

  const earnedBadgeObjects = useMemo(
    () =>
      BADGE_DEFINITIONS.filter((b) => earnedBadges.includes(b.id)),
    [earnedBadges],
  );

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
      {/* Daily goal progress rings */}
      <div>
        <div className="text-xs font-semibold text-text-primary mb-3">
          Daily Goals
        </div>
        <div className="flex items-center justify-around">
          {dailyGoals.map((goal) => (
            <ProgressRing key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Streak counter */}
      <div className="flex items-center justify-between">
        <StreakCounter
          currentStreak={performanceMetrics.currentStreak}
          bestStreak={performanceMetrics.bestStreak}
        />
        <div className="text-xs text-text-tertiary tabular-nums">
          {performanceMetrics.connectRate.toFixed(0)}% connect
        </div>
      </div>

      {/* Earned badges */}
      {earnedBadgeObjects.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-text-tertiary mb-1.5">
            Badges Earned
          </div>
          <div className="flex flex-wrap gap-1.5">
            {earnedBadgeObjects.map((badge) => (
              <div
                key={badge.id}
                title={`${badge.name}: ${badge.description}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-bg-hover border border-border text-[10px] font-medium"
              >
                <span>{badge.icon}</span>
                <span className="text-text-secondary">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
