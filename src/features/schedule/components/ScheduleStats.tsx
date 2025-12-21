import { Card, CardContent } from '@/components/ui/Card.tsx';
import { useScheduleStats } from '@/api/hooks/useWorkOrders.ts';

/**
 * Stat card component
 */
function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className={`text-2xl ${color}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-secondary">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Schedule Stats - Dashboard statistics cards
 */
export function ScheduleStats() {
  const stats = useScheduleStats();

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <StatCard
        label="Today's Jobs"
        value={stats.todayJobs}
        color="text-blue-500"
        icon="📅"
      />
      <StatCard
        label="This Week"
        value={stats.weekJobs}
        color="text-green-500"
        icon="📊"
      />
      <StatCard
        label="Unscheduled"
        value={stats.unscheduledJobs}
        color="text-orange-500"
        icon="⏳"
      />
      <StatCard
        label="Emergency"
        value={stats.emergencyJobs}
        color="text-red-500"
        icon="🚨"
      />
    </div>
  );
}
