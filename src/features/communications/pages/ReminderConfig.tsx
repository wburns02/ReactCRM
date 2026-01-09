import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface Reminder {
  id: number;
  name: string;
  trigger: string;
  timing: string;
  channels: string[];
  enabled: boolean;
  last_sent: string | null;
}

/**
 * Auto-Reminder Configuration
 */
export function ReminderConfig() {
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['auto-reminders'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/reminders');
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const defaultReminders = [
    {
      id: 'appointment-24h',
      name: 'Appointment Reminder - 24 Hours',
      trigger: 'Before scheduled appointment',
      timing: '24 hours before',
      channels: ['sms'],
      enabled: true,
    },
    {
      id: 'appointment-1h',
      name: 'Appointment Reminder - 1 Hour',
      trigger: 'Before scheduled appointment',
      timing: '1 hour before',
      channels: ['sms'],
      enabled: true,
    },
    {
      id: 'invoice-due',
      name: 'Invoice Due Reminder',
      trigger: 'Invoice due date',
      timing: '3 days before',
      channels: ['email', 'sms'],
      enabled: false,
    },
    {
      id: 'service-due',
      name: 'Service Due Reminder',
      trigger: 'Scheduled service interval',
      timing: '7 days before',
      channels: ['email'],
      enabled: true,
    },
  ];

  const displayReminders = reminders?.length > 0 ? reminders : defaultReminders;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Auto-Reminders</h1>
          <p className="text-text-muted">Configure automatic customer reminders</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
          Create Reminder
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-2xl font-bold text-text-primary">
            {displayReminders.filter((r: Reminder | typeof defaultReminders[0]) => r.enabled).length}
          </p>
          <p className="text-sm text-text-muted">Active Reminders</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-2xl font-bold text-success">--</p>
          <p className="text-sm text-text-muted">Sent This Week</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <p className="text-2xl font-bold text-info">--</p>
          <p className="text-sm text-text-muted">Open Rate</p>
        </div>
      </div>

      {/* Reminders List */}
      <div className="bg-bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-text-primary">Configured Reminders</h2>
        </div>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayReminders.map((reminder: Reminder | typeof defaultReminders[0]) => (
              <Link
                key={reminder.id}
                to={`/communications/reminders/${reminder.id}`}
                className="block p-4 hover:bg-bg-hover transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      reminder.enabled ? 'bg-success' : 'bg-text-muted'
                    }`}></div>
                    <div>
                      <h3 className="font-medium text-text-primary">{reminder.name}</h3>
                      <p className="text-sm text-text-muted">
                        {reminder.trigger} - {reminder.timing}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {reminder.channels.map((channel) => (
                          <span
                            key={channel}
                            className="px-2 py-0.5 bg-bg-hover rounded text-xs text-text-muted"
                          >
                            {channel.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${reminder.enabled ? 'text-success' : 'text-text-muted'}`}>
                      {reminder.enabled ? 'Active' : 'Paused'}
                    </span>
                    <span className="text-text-muted">&rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
