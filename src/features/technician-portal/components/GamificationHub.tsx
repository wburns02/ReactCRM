import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import {
  useGamificationStats,
  useGamificationBadges,
  useGamificationLeaderboard,
  useGamificationMilestones,
} from "@/hooks/useGamification.ts";
import type { Badge } from "@/api/types/gamification.ts";

// ─── Stats Cards ─────────────────────────────────────────

function StatsCards() {
  const { data: stats, isLoading } = useGamificationStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Streak", value: `${stats.current_streak}d`, sub: `Best: ${stats.best_streak}d`, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "Completion", value: `${stats.completion_rate}%`, sub: `${stats.jobs_completed_month} this month`, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
    { label: "Avg Speed", value: `${stats.avg_job_duration_minutes}m`, sub: "per job", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "On Time", value: `${stats.on_time_rate}%`, sub: `${stats.jobs_completed_week} this week`, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl p-4 ${c.bg}`}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Badge Grid ──────────────────────────────────────────

function BadgeCard({ badge }: { badge: Badge }) {
  const pct = badge.target > 0 ? Math.min((badge.progress / badge.target) * 100, 100) : 0;
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition
        ${badge.unlocked
          ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30"
          : "border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800"
        }`}
    >
      <span className="text-3xl">{badge.icon}</span>
      <p className="text-xs font-semibold">{badge.name}</p>
      <p className="text-[10px] text-gray-500">{badge.description}</p>
      {!badge.unlocked && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function BadgesSection() {
  const { data: badges, isLoading } = useGamificationBadges();

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!badges) return null;

  const earned = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Badges ({earned.length}/{badges.length})
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {earned.map((b) => <BadgeCard key={b.id} badge={b} />)}
          {locked.map((b) => <BadgeCard key={b.id} badge={b} />)}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Leaderboard ─────────────────────────────────────────

function LeaderboardSection() {
  const { data, isLoading } = useGamificationLeaderboard();

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!data) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Leaderboard — This Month
        </h3>
        <div className="space-y-1">
          {data.leaderboard.map((entry) => (
            <div
              key={entry.technician_id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm
                ${entry.is_current_user
                  ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-bold">
                  {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                </span>
                <span>{entry.name}</span>
              </div>
              <span>{entry.jobs_completed} jobs</span>
            </div>
          ))}
        </div>
        {data.my_position && data.my_position.rank > 10 && (
          <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            Your rank: #{data.my_position.rank} of {data.total_technicians} — {data.my_position.jobs_completed} jobs
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Next Milestones ─────────────────────────────────────

function MilestonesSection() {
  const { data, isLoading } = useGamificationMilestones();

  if (isLoading) return <Skeleton className="h-20 rounded-xl" />;
  if (!data) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Next Milestones
        </h3>
        <div className="space-y-1.5">
          {data.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-yellow-500">★</span>
              <span>{m}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Hub ────────────────────────────────────────────

export function GamificationHub() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Achievements</h2>
      <StatsCards />
      <MilestonesSection />
      <BadgesSection />
      <LeaderboardSection />
    </div>
  );
}
