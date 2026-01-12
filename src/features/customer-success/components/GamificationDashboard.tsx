/**
 * Gamification Dashboard Component
 *
 * Makes escalation resolution satisfying and motivating:
 * - Personal stats (CSAT, NPS, resolution time)
 * - Streak tracking
 * - Achievements/badges
 * - Team leaderboard
 *
 * Designed to make great customer service feel rewarding
 */

import { cn } from "@/lib/utils";

interface PersonalStats {
  customersSaved: number;
  avgResolutionHours: number;
  csatScore: number;
  npsScore: number;
  currentStreak: number;
  bestStreak: number;
  escalationsThisWeek: number;
  slaCompliance: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress?: number;
  target?: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar?: string;
  score: number;
  metric: string;
}

// Mock data for demo
const mockStats: PersonalStats = {
  customersSaved: 24,
  avgResolutionHours: 2.3,
  csatScore: 94,
  npsScore: 78,
  currentStreak: 8,
  bestStreak: 15,
  escalationsThisWeek: 12,
  slaCompliance: 97,
};

const mockAchievements: Achievement[] = [
  {
    id: "first_save",
    name: "First Save",
    description: "Save your first at-risk customer",
    icon: "🏆",
    unlockedAt: "2025-12-15",
  },
  {
    id: "streak_5",
    name: "Hot Streak",
    description: "Resolve 5 escalations in a row with positive CSAT",
    icon: "🔥",
    unlockedAt: "2025-12-20",
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Resolve an escalation in under 1 hour",
    icon: "⚡",
    unlockedAt: "2025-12-22",
  },
  {
    id: "perfect_10",
    name: "Perfect 10",
    description: "Get 10 perfect CSAT scores",
    icon: "⭐",
    unlockedAt: "2026-01-02",
  },
  {
    id: "empathy_master",
    name: "Empathy Master",
    description: "Save 10 customers threatening to cancel",
    icon: "💙",
    unlockedAt: null,
    progress: 8,
    target: 10,
  },
  {
    id: "nps_champion",
    name: "NPS Champion",
    description: "Maintain 80+ NPS for a month",
    icon: "🎯",
    unlockedAt: null,
    progress: 22,
    target: 30,
  },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Sarah J.", score: 98, metric: "CSAT" },
  { rank: 2, name: "You", score: 94, metric: "CSAT" },
  { rank: 3, name: "Mike C.", score: 92, metric: "CSAT" },
  { rank: 4, name: "Emily D.", score: 91, metric: "CSAT" },
  { rank: 5, name: "Tom W.", score: 89, metric: "CSAT" },
];

function StatCard({
  label,
  value,
  icon,
  trend,
  suffix,
}: {
  label: string;
  value: number | string;
  icon: string;
  trend?: "up" | "down" | "neutral";
  suffix?: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span
            className={cn(
              "text-sm",
              trend === "up"
                ? "text-success"
                : trend === "down"
                  ? "text-danger"
                  : "text-text-muted",
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-text-primary">
        {value}
        {suffix && <span className="text-lg text-text-muted">{suffix}</span>}
      </p>
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

function StreakDisplay({ current, best }: { current: number; best: number }) {
  const flames = Array(Math.min(current, 10)).fill("🔥");

  return (
    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted mb-1">Current Streak</p>
          <p className="text-5xl font-bold text-orange-500">{current}</p>
          <p className="text-sm text-text-muted">
            Best: {best} {best === current && "🎉"}
          </p>
        </div>
        <div className="text-4xl">{flames.join("")}</div>
      </div>
      {current >= 5 && (
        <p className="mt-3 text-sm text-orange-600 font-medium">
          Keep it going! {10 - current} more for a bonus achievement!
        </p>
      )}
    </div>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const isLocked = !achievement.unlockedAt;

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border-2 text-center transition-all",
        isLocked
          ? "border-border bg-bg-hover opacity-60"
          : "border-primary/50 bg-primary/5 hover:shadow-md",
      )}
    >
      <span className={cn("text-4xl", isLocked && "grayscale")}>
        {achievement.icon}
      </span>
      <p className="font-bold text-text-primary mt-2 text-sm">
        {achievement.name}
      </p>
      <p className="text-xs text-text-muted mt-1">{achievement.description}</p>

      {isLocked &&
        achievement.progress !== undefined &&
        achievement.target !== undefined && (
          <div className="mt-3">
            <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(achievement.progress / achievement.target) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">
              {achievement.progress}/{achievement.target}
            </p>
          </div>
        )}

      {!isLocked && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-bg-hover">
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <span>🏅</span> Team Leaderboard
        </h3>
      </div>
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className={cn(
              "px-4 py-3 flex items-center justify-between",
              entry.name === "You" && "bg-primary/5",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  entry.rank === 1
                    ? "bg-yellow-500 text-white"
                    : entry.rank === 2
                      ? "bg-gray-400 text-white"
                      : entry.rank === 3
                        ? "bg-orange-700 text-white"
                        : "bg-bg-hover text-text-muted",
                )}
              >
                {entry.rank}
              </span>
              <span
                className={cn(
                  "font-medium",
                  entry.name === "You" ? "text-primary" : "text-text-primary",
                )}
              >
                {entry.name}
              </span>
            </div>
            <span className="font-bold text-text-primary">
              {entry.score}% {entry.metric}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GamificationDashboard() {
  const stats = mockStats;
  const achievements = mockAchievements;
  const leaderboard = mockLeaderboard;

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Customers Saved"
          value={stats.customersSaved}
          icon="🏆"
          trend="up"
        />
        <StatCard
          label="Avg Resolution"
          value={stats.avgResolutionHours}
          suffix="h"
          icon="⚡"
          trend="down"
        />
        <StatCard
          label="CSAT Score"
          value={stats.csatScore}
          suffix="%"
          icon="⭐"
          trend="up"
        />
        <StatCard
          label="NPS Score"
          value={stats.npsScore}
          icon="🎯"
          trend="up"
        />
      </div>

      {/* Streak */}
      <StreakDisplay current={stats.currentStreak} best={stats.bestStreak} />

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-text-muted">This Week</p>
          <p className="text-2xl font-bold text-text-primary">
            {stats.escalationsThisWeek}
          </p>
          <p className="text-sm text-text-muted">escalations resolved</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-text-muted">SLA Compliance</p>
          <p className="text-2xl font-bold text-success">
            {stats.slaCompliance}%
          </p>
          <p className="text-sm text-text-muted">on-time resolution</p>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <span>🏅</span> Achievements
          </h3>
          <span className="text-sm text-text-muted">
            {unlockedCount}/{achievements.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <Leaderboard entries={leaderboard} />
    </div>
  );
}

export default GamificationDashboard;
