import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  usePushSubscriptions,
  useRegisterPushSubscription,
  useUnregisterPushSubscription,
  useVapidPublicKey,
  useSendTestNotification,
  type NotificationPreferences,
} from '@/api/hooks/useNotifications';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getDeviceName,
} from '@/lib/push-notifications';

/**
 * Toggle switch component
 */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/**
 * Notification Settings Page
 */
export function NotificationSettingsPage() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { data: subscriptions } = usePushSubscriptions();
  const { data: vapidData } = useVapidPublicKey();
  const registerSubscription = useRegisterPushSubscription();
  const unregisterSubscription = useUnregisterPushSubscription();
  const sendTestNotification = useSendTestNotification();

  const [pushStatus, setPushStatus] = useState<'unsupported' | 'denied' | 'prompt' | 'granted'>('prompt');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Check push support and permission on mount
  useEffect(() => {
    if (!isPushSupported()) {
      setPushStatus('unsupported');
    } else {
      const permission = getNotificationPermission();
      // Map 'default' to 'prompt' for our state
      setPushStatus(permission === 'default' ? 'prompt' : permission);
    }
  }, []);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    updatePreferences.mutate({ [key]: value });
  };

  const handleEnablePush = async () => {
    if (!vapidData?.public_key) {
      alert('Push notification configuration not available');
      return;
    }

    setIsSubscribing(true);
    try {
      const subscription = await subscribeToPush(vapidData.public_key);
      if (subscription) {
        await registerSubscription.mutateAsync({
          ...subscription,
          device_name: getDeviceName(),
        });
        setPushStatus('granted');
      } else {
        const perm = getNotificationPermission();
        setPushStatus(perm === 'default' ? 'prompt' : perm);
      }
    } catch (error) {
      console.error('Failed to enable push:', error);
      alert('Failed to enable push notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDisablePush = async (subscriptionId: string) => {
    try {
      await unsubscribeFromPush();
      await unregisterSubscription.mutateAsync(subscriptionId);
    } catch (error) {
      console.error('Failed to disable push:', error);
      alert('Failed to disable push notifications');
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification.mutateAsync();
      alert('Test notification sent! Check your device.');
    } catch (error) {
      console.error('Failed to send test:', error);
      alert('Failed to send test notification');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Notification Settings</h1>
        <p className="text-text-secondary mt-1">
          Manage how and when you receive notifications
        </p>
      </div>

      {/* Push Notifications Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🔔</span> Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pushStatus === 'unsupported' ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                Push notifications are not supported in your browser. Try using Chrome, Firefox, or Edge.
              </p>
            </div>
          ) : pushStatus === 'denied' ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                Push notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          ) : (
            <>
              {/* Current subscriptions */}
              {subscriptions && subscriptions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary">Active devices:</p>
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 bg-bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-text-primary">
                          {sub.device_name || 'Unknown Device'}
                        </p>
                        <p className="text-xs text-text-muted">
                          Added {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDisablePush(sub.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-bg-muted rounded-lg">
                  <p className="text-text-secondary text-sm mb-3">
                    Enable push notifications to receive real-time updates on your device.
                  </p>
                  <Button onClick={handleEnablePush} disabled={isSubscribing}>
                    {isSubscribing ? 'Enabling...' : 'Enable Push Notifications'}
                  </Button>
                </div>
              )}

              {/* Test notification */}
              {subscriptions && subscriptions.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="secondary"
                    onClick={handleTestNotification}
                    disabled={sendTestNotification.isPending}
                  >
                    {sendTestNotification.isPending ? 'Sending...' : 'Send Test Notification'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-text-primary">Push Notifications</p>
              <p className="text-sm text-text-muted">Receive notifications in your browser</p>
            </div>
            <Toggle
              checked={preferences?.push_enabled ?? false}
              onChange={(v) => handleToggle('push_enabled', v)}
              disabled={updatePreferences.isPending}
            />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="font-medium text-text-primary">Email Notifications</p>
              <p className="text-sm text-text-muted">Receive important updates via email</p>
            </div>
            <Toggle
              checked={preferences?.email_enabled ?? false}
              onChange={(v) => handleToggle('email_enabled', v)}
              disabled={updatePreferences.isPending}
            />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="font-medium text-text-primary">SMS Notifications</p>
              <p className="text-sm text-text-muted">Receive text messages for urgent alerts</p>
            </div>
            <Toggle
              checked={preferences?.sms_enabled ?? false}
              onChange={(v) => handleToggle('sms_enabled', v)}
              disabled={updatePreferences.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'work_order_assigned', label: 'Work Order Assigned', desc: 'When a work order is assigned to you' },
            { key: 'work_order_updated', label: 'Work Order Updated', desc: 'When a work order you\'re involved with changes' },
            { key: 'work_order_completed', label: 'Work Order Completed', desc: 'When a work order is marked complete' },
            { key: 'schedule_changes', label: 'Schedule Changes', desc: 'When your schedule is modified' },
            { key: 'customer_messages', label: 'Customer Messages', desc: 'When customers send messages' },
            { key: 'payment_received', label: 'Payment Received', desc: 'When a payment is processed' },
            { key: 'invoice_overdue', label: 'Invoice Overdue', desc: 'When an invoice becomes overdue' },
            { key: 'system_alerts', label: 'System Alerts', desc: 'Important system notifications' },
          ].map((item, idx) => (
            <div
              key={item.key}
              className={`flex items-center justify-between py-2 ${idx > 0 ? 'border-t border-border' : ''}`}
            >
              <div>
                <p className="font-medium text-text-primary">{item.label}</p>
                <p className="text-sm text-text-muted">{item.desc}</p>
              </div>
              <Toggle
                checked={preferences?.[item.key as keyof typeof preferences] as boolean ?? true}
                onChange={(v) => handleToggle(item.key as keyof typeof preferences, v)}
                disabled={updatePreferences.isPending}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🌙</span> Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-text-primary">Enable Quiet Hours</p>
              <p className="text-sm text-text-muted">Pause non-urgent notifications during set hours</p>
            </div>
            <Toggle
              checked={preferences?.quiet_hours_enabled ?? false}
              onChange={(v) => handleToggle('quiet_hours_enabled', v)}
              disabled={updatePreferences.isPending}
            />
          </div>

          {preferences?.quiet_hours_enabled && (
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Start</label>
                <input
                  type="time"
                  value={preferences.quiet_start || '22:00'}
                  onChange={(e) => updatePreferences.mutate({ quiet_start: e.target.value })}
                  className="px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">End</label>
                <input
                  type="time"
                  value={preferences.quiet_end || '07:00'}
                  onChange={(e) => updatePreferences.mutate({ quiet_end: e.target.value })}
                  className="px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
