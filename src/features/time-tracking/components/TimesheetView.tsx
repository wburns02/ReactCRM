import { useState, useMemo } from 'react';
import { useTimeEntries, type TimeEntry } from '../api/timeTracking.ts';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';

interface TimesheetViewProps {
  technicianId: string;
  technicianName?: string;
}

export function TimesheetView({ technicianId, technicianName }: TimesheetViewProps) {
  // Calculate the current week's date range
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDates = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      start: startOfWeek,
      end: endOfWeek,
      startStr: startOfWeek.toISOString().split('T')[0],
      endStr: endOfWeek.toISOString().split('T')[0],
    };
  }, [weekOffset]);

  const { data, isLoading } = useTimeEntries({
    technician_id: technicianId,
    start_date: weekDates.startStr,
    end_date: weekDates.endStr,
    page_size: 100, // Get all entries for the week
  });

  const entries = data?.items || [];

  // Group entries by date and calculate totals
  const { entriesByDay, weekTotals } = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekDates.start);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    const byDay: Record<string, TimeEntry[]> = {};
    days.forEach((day) => {
      byDay[day] = [];
    });

    entries.forEach((entry) => {
      if (byDay[entry.entry_date]) {
        byDay[entry.entry_date].push(entry);
      }
    });

    const totals = {
      regular: 0,
      overtime: 0,
    };

    entries.forEach((entry) => {
      totals.regular += entry.regular_hours || 0;
      totals.overtime += entry.overtime_hours || 0;
    });

    return { entriesByDay: byDay, weekTotals: totals };
  }, [entries, weekDates.start]);

  const formatDate = (dateStr: string): { dayName: string; dayNum: string; month: string } => {
    const date = new Date(dateStr + 'T12:00:00');
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate().toString(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    };
  };

  const formatHours = (hours: number): string => {
    return hours.toFixed(1);
  };

  const getDayTotal = (entries: TimeEntry[]): number => {
    return entries.reduce((sum, e) => sum + (e.regular_hours || 0) + (e.overtime_hours || 0), 0);
  };

  const isToday = (dateStr: string): boolean => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          📅 {technicianName ? `${technicianName}'s ` : ''}Timesheet
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
            ← Prev
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            This Week
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={weekOffset >= 0}
          >
            Next →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week header */}
        <div className="text-center mb-4">
          <p className="text-text-muted text-sm">
            {weekDates.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
            {weekDates.end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-bg-muted rounded-lg" />
          </div>
        )}

        {/* Timesheet grid */}
        {!isLoading && (
          <>
            <div className="grid grid-cols-7 gap-2 mb-6">
              {Object.entries(entriesByDay).map(([dateStr, dayEntries]) => {
                const { dayName, dayNum, month } = formatDate(dateStr);
                const dayTotal = getDayTotal(dayEntries);
                const today = isToday(dateStr);

                return (
                  <div
                    key={dateStr}
                    className={`
                      p-3 rounded-lg border text-center
                      ${today ? 'border-primary bg-primary/5' : 'border-border'}
                      ${dayEntries.length > 0 ? 'bg-bg-primary' : 'bg-bg-hover'}
                    `}
                  >
                    <p className={`text-xs font-medium ${today ? 'text-primary' : 'text-text-muted'}`}>
                      {dayName}
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {dayNum}
                    </p>
                    <p className="text-xs text-text-muted">{month}</p>

                    {dayEntries.length > 0 ? (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-lg font-mono font-bold text-success">
                          {formatHours(dayTotal)}h
                        </p>
                        <p className="text-xs text-text-muted">
                          {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-sm text-text-muted">-</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Week totals */}
            <div className="p-4 bg-bg-hover rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Week Total</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatHours(weekTotals.regular + weekTotals.overtime)} hours
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-text-muted">Regular</p>
                    <p className="text-lg font-mono font-medium text-text-primary">
                      {formatHours(weekTotals.regular)}h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-muted">Overtime</p>
                    <p className="text-lg font-mono font-medium text-warning">
                      {formatHours(weekTotals.overtime)}h
                    </p>
                  </div>
                </div>
              </div>

              {weekTotals.regular >= 40 && (
                <Badge variant="info" className="mt-2">
                  Full 40+ hour week
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
