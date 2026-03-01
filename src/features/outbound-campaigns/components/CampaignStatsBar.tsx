import type { CampaignStats } from "../types";

interface CampaignStatsBarProps {
  stats: CampaignStats;
}

export function CampaignStatsBar({ stats }: CampaignStatsBarProps) {
  const progressPct =
    stats.total > 0 ? ((stats.called / stats.total) * 100).toFixed(0) : "0";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <StatCard
        label="Total"
        value={stats.total}
        color="text-text-primary"
      />
      <StatCard label="Pending" value={stats.pending} color="text-zinc-500" />
      <StatCard label="Called" value={stats.called} color="text-blue-600" />
      <StatCard
        label="Connected"
        value={stats.connected}
        color="text-emerald-600"
        sub={`${stats.connect_rate.toFixed(0)}% rate`}
      />
      <StatCard
        label="Interested"
        value={stats.interested}
        color="text-emerald-700"
        sub={`${stats.interest_rate.toFixed(0)}% of connected`}
      />
      <StatCard label="Voicemail" value={stats.voicemail} color="text-purple-600" />
      <StatCard label="DNC" value={stats.do_not_call} color="text-red-600" />
      <StatCard
        label="Progress"
        value={`${progressPct}%`}
        color="text-primary"
        sub={`${stats.completed} finalized`}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
      <div className="text-xs text-text-secondary mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-text-tertiary mt-0.5">{sub}</div>}
    </div>
  );
}
