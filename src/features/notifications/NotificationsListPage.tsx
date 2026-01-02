import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  useNotifications,
  useNotificationStats,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type Notification,
} from '@/api/hooks/useNotifications';

type FilterType = 'all' | 'unread' | Notification['type'];

/**
 * Notification icon based on type
 */
function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'work_order':
      return '🔧';
    case 'schedule':
      return '📅';
    case 'payment':
      return '💳';
    case 'message':
      return '💬';
    case 'alert':
      return '⚠️';
    case 'system':
      return '🔔';
    default:
      return '📌';
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/**
 * Notifications List Page
 */
export function NotificationsListPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: stats } = useNotificationStats();
  const { data: notificationsData, isLoading } = useNotifications({
    unread_only: filter === 'unread',
    type: !['all', 'unread'].includes(filter) ? filter : undefined,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = notificationsData?.notifications || [];

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: `Unread (${stats?.unread || 0})` },
    { value: 'work_order', label: 'Work Orders' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'payment', label: 'Payments' },
    { value: 'message', label: 'Messages' },
    { value: 'alert', label: 'Alerts' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-text-secondary mt-1">
            {stats?.unread
              ? `${stats.unread} unread notification${stats.unread === 1 ? '' : 's'}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats?.unread && stats.unread > 0 && (
            <Button
              variant="secondary"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark All Read
            </Button>
          )}
          <Link to="/settings/notifications">
            <Button variant="secondary">Settings</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === option.value
                ? 'bg-primary text-white'
                : 'bg-bg-muted text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <span className="text-5xl block mb-4">🔔</span>
            <h3 className="text-lg font-medium text-text-primary mb-2">No notifications</h3>
            <p className="text-text-muted">
              {filter === 'unread'
                ? "You've read all your notifications!"
                : 'You have no notifications matching this filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`overflow-hidden ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3
                          className={`text-base truncate ${
                            notification.read
                              ? 'font-normal text-text-secondary'
                              : 'font-semibold text-text-primary'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="text-sm text-text-muted mt-1">{notification.body}</p>
                        <p className="text-xs text-text-muted mt-2">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {notification.action_url && (
                          <Link
                            to={notification.action_url}
                            onClick={() => {
                              if (!notification.read) {
                                markRead.mutate(notification.id);
                              }
                            }}
                          >
                            <Button variant="primary" size="sm">
                              View
                            </Button>
                          </Link>
                        )}
                        {!notification.read && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => markRead.mutate(notification.id)}
                            disabled={markRead.isPending}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => deleteNotification.mutate(notification.id)}
                          disabled={deleteNotification.isPending}
                          className="text-danger hover:bg-danger/10"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
