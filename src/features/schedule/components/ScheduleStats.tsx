import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card.tsx';
import { useScheduleStats, useWorkOrders } from '@/api/hooks/useWorkOrders.ts';
import { useTechnicians } from '@/api/hooks/useTechnicians.ts';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

/**
 * Stat card component with support for different value types
 */
function StatCard({
  label,
  value,
  valuePrefix,
  valueSuffix,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  valuePrefix?: string;
  valueSuffix?: string;
  color: string;
  icon: string;
}) {
  return (
    <Card className="flex-1 min-w-[160px]">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className={`text-2xl ${color}`}>{icon}</div>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              {valuePrefix && (
                <span className="text-lg font-medium text-text-secondary">{valuePrefix}</span>
              )}
              <span className="text-2xl font-bold text-text-primary">{value}</span>
              {valueSuffix && (
                <span className="text-lg font-medium text-text-secondary">{valueSuffix}</span>
              )}
            </div>
            <p className="text-xs text-text-secondary">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Schedule Stats - Dashboard statistics cards
 *
 * Displays key metrics:
 * - Today's Jobs: Number of jobs scheduled for today
 * - Week Jobs: Total scheduled jobs this week
 * - Tech Utilization: Percentage of available time scheduled
 * - Unscheduled: Jobs awaiting scheduling
 */
export function ScheduleStats() {
  const stats = useScheduleStats();
  const { data: workOrdersData } = useWorkOrders();
  const { data: techniciansData } = useTechnicians();

  // Calculate additional stats
  const extendedStats = useMemo(() => {
    const workOrders = workOrdersData?.items || [];
    const technicians = techniciansData?.items || [];

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    let todayJobs = 0;
    let weekJobs = 0;
    let totalScheduledHours = 0;

    workOrders.forEach((wo) => {
      if (wo.scheduled_date) {
        const scheduledDate = parseISO(wo.scheduled_date);

        // Check if scheduled for today
        if (format(scheduledDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
          todayJobs++;
        }

        // Check if scheduled this week
        if (isWithinInterval(scheduledDate, { start: weekStart, end: weekEnd })) {
          weekJobs++;
          totalScheduledHours += wo.estimated_duration_hours || 0;
        }
      }
    });

    // Calculate tech utilization (scheduled hours / available hours)
    // Assume 8 hours per day, 5 days per week per tech
    const activeTechs = technicians.filter((t) => t.is_active).length;
    const availableHours = activeTechs * 8 * 5; // 40 hours per tech per week
    const utilization = availableHours > 0
      ? Math.min(Math.round((totalScheduledHours / availableHours) * 100), 100)
      : 0;

    return {
      todayJobs,
      weekJobs,
      utilization,
    };
  }, [workOrdersData?.items, techniciansData?.items]);

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <StatCard
        label="Today's Jobs"
        value={extendedStats.todayJobs}
        color="text-blue-500"
        icon="📅"
      />
      <StatCard
        label="This Week"
        value={extendedStats.weekJobs}
        color="text-green-500"
        icon="📊"
      />
      <StatCard
        label="Tech Utilization"
        value={extendedStats.utilization}
        valueSuffix="%"
        color="text-purple-500"
        icon="👷"
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
