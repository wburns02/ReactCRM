import { useState, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  useNotifications,
  useNotificationStats,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from '@/api/hooks/useNotifications';

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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Single notification item
 * Memoized to prevent unnecessary re-renders in list
 */
const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
  }, [notification.id, notification.read, onMarkRead]);

  return (
    <div
      onClick={handleClick}
      className={`p-3 border-b border-border last:border-b-0 cursor-pointer transition-colors ${
        notification.read ? 'bg-bg-card' : 'bg-primary-light/30'
      } hover:bg-bg-hover`}
    >
      <div className="flex gap-3">
        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm truncate ${
                notification.read ? 'font-normal text-text-secondary' : 'font-medium text-text-primary'
              }`}
            >
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{notification.body}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-text-muted">
              {formatRelativeTime(notification.created_at)}
            </span>
            {notification.action_url && (
              <Link
                to={notification.action_url}
                className="text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Notification Center Dropdown
 */
export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: stats } = useNotificationStats();
  const { data: notificationsData, isLoading } = useNotifications({ limit: 20 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = stats?.unread || 0;

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-danger rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline"
                  disabled={markAllRead.isPending}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-text-muted">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <span className="text-3xl block mb-2">🔔</span>
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <Link
                  to="/notifications"
                  className="text-sm text-primary hover:underline block text-center"
                  onClick={() => setIsOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Notification Badge (for use in navigation)
 */
export function NotificationBadge() {
  const { data: stats } = useNotificationStats();
  const unreadCount = stats?.unread || 0;

  if (unreadCount === 0) return null;

  return (
    <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-danger rounded-full flex items-center justify-center">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}
