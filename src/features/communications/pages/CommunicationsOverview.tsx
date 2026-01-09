import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Communications Overview - Unified Inbox Dashboard
 */
export function CommunicationsOverview() {
  const { data: stats } = useQuery({
    queryKey: ['communications-stats'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/communications/stats');
        return response.data;
      } catch {
        return {
          unread_sms: 0,
          unread_email: 0,
          pending_reminders: 0,
          total_conversations: 0,
        };
      }
    },
  });

  const channels = [
    {
      name: 'SMS',
      icon: '📱',
      path: '/communications/sms',
      count: stats?.unread_sms || 0,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      name: 'Email',
      icon: '📧',
      path: '/communications/email-inbox',
      count: stats?.unread_email || 0,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      name: 'Templates',
      icon: '📝',
      path: '/communications/templates',
      count: null,
      color: 'bg-green-500/10 text-green-500',
    },
    {
      name: 'Reminders',
      icon: '🔔',
      path: '/communications/reminders',
      count: stats?.pending_reminders || 0,
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Communications</h1>
        <p className="text-text-muted">Unified inbox for all customer messages</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {channels.map((channel) => (
          <Link
            key={channel.name}
            to={channel.path}
            className="bg-bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${channel.color}`}>
              <span className="text-xl">{channel.icon}</span>
            </div>
            <h3 className="font-medium text-text-primary">{channel.name}</h3>
            {channel.count !== null && channel.count > 0 && (
              <p className="text-sm text-text-muted">{channel.count} unread</p>
            )}
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-text-primary">Recent Activity</h2>
        </div>
        <div className="p-8 text-center text-text-muted">
          <span className="text-4xl block mb-2">💬</span>
          <p>No recent messages</p>
          <p className="text-sm mt-2">Messages from all channels will appear here</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button className="bg-bg-card border border-border rounded-lg p-4 text-left hover:border-primary transition-colors">
          <span className="text-2xl block mb-2">✉️</span>
          <p className="font-medium text-text-primary">Send SMS</p>
          <p className="text-sm text-text-muted">Quick message</p>
        </button>
        <button className="bg-bg-card border border-border rounded-lg p-4 text-left hover:border-primary transition-colors">
          <span className="text-2xl block mb-2">📧</span>
          <p className="font-medium text-text-primary">Send Email</p>
          <p className="text-sm text-text-muted">Compose email</p>
        </button>
        <Link
          to="/communications/templates"
          className="bg-bg-card border border-border rounded-lg p-4 text-left hover:border-primary transition-colors"
        >
          <span className="text-2xl block mb-2">📋</span>
          <p className="font-medium text-text-primary">Templates</p>
          <p className="text-sm text-text-muted">Manage templates</p>
        </Link>
        <Link
          to="/communications/reminders"
          className="bg-bg-card border border-border rounded-lg p-4 text-left hover:border-primary transition-colors"
        >
          <span className="text-2xl block mb-2">⏰</span>
          <p className="font-medium text-text-primary">Reminders</p>
          <p className="text-sm text-text-muted">Auto-reminders</p>
        </Link>
      </div>
    </div>
  );
}
