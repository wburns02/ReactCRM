import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Calendar View for Work Orders
 */
export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders-calendar', currentDate.toISOString()],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/work-orders/', {
          params: {
            start_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
            end_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString(),
          }
        });
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Work Orders Calendar</h1>
          <p className="text-text-muted">Schedule view of all work orders</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/work-orders"
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
          >
            List View
          </Link>
          <Link
            to="/work-orders/board"
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
          >
            Board View
          </Link>
          <Link
            to="/work-orders/map"
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
          >
            Map View
          </Link>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-bg-card border border-border rounded-lg">
        {/* Month Navigation */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-bg-hover rounded-lg text-text-secondary"
          >
            &larr;
          </button>
          <h2 className="font-semibold text-text-primary">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-bg-hover rounded-lg text-text-secondary"
          >
            &rarr;
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-text-muted">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((day, index) => (
              <div
                key={index}
                className={`min-h-24 p-2 border-b border-r border-border ${
                  day === null ? 'bg-bg-hover/50' : ''
                }`}
              >
                {day !== null && (
                  <>
                    <span className={`text-sm ${
                      day === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear()
                        ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center'
                        : 'text-text-secondary'
                    }`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {workOrders
                        ?.filter((wo: { scheduled_date: string }) => {
                          const woDate = new Date(wo.scheduled_date);
                          return woDate.getDate() === day;
                        })
                        .slice(0, 3)
                        .map((wo: { id: number; customer_name: string; status: string }) => (
                          <Link
                            key={wo.id}
                            to={`/work-orders/${wo.id}`}
                            className={`block text-xs p-1 rounded truncate ${
                              wo.status === 'completed' ? 'bg-success/20 text-success' :
                              wo.status === 'in_progress' ? 'bg-warning/20 text-warning' :
                              'bg-info/20 text-info'
                            }`}
                          >
                            {wo.customer_name}
                          </Link>
                        ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
