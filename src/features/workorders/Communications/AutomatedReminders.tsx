/**
 * AutomatedReminders Component
 *
 * Configuration UI for automated appointment reminders (48h, 24h, 2h).
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import { Label } from '@/components/ui/Label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import { useSendTestNotification } from './hooks/useCommunications.ts';
import { renderTemplate } from './templates/index.ts';

interface ReminderConfig {
  enabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  customMessage?: string;
}

interface AutomatedRemindersProps {
  onSave?: (config: ReminderSettings) => void;
  initialConfig?: ReminderSettings;
}

interface ReminderSettings {
  reminder48h: ReminderConfig;
  reminder24h: ReminderConfig;
  reminder2h: ReminderConfig;
}

const DEFAULT_MESSAGES = {
  reminder48h: {
    sms: 'Hi {{customer_first_name}}, reminder: Your septic service is in 2 days on {{appointment_date}} between {{appointment_window}}. Reply CONFIRM or call {{company_phone}}. - MAC Septic',
    email: 'Your appointment is scheduled for {{appointment_date}}. We look forward to seeing you!',
  },
  reminder24h: {
    sms: 'Hi {{customer_first_name}}, your septic service is tomorrow {{appointment_date}} between {{appointment_window}}. Please ensure access to your septic tank. - MAC Septic',
    email: 'Just a friendly reminder that your appointment is tomorrow!',
  },
  reminder2h: {
    sms: 'Hi {{customer_first_name}}, our technician will arrive in about 2 hours for your scheduled service. Track live: {{tracking_link}} - MAC Septic',
    email: 'Our technician will be arriving shortly. Track their location in real-time!',
  },
};

const SAMPLE_VARIABLES = {
  customer_first_name: 'John',
  customer_name: 'John Smith',
  appointment_date: 'January 15, 2026',
  appointment_window: '2:00 PM - 4:00 PM',
  company_phone: '(555) 123-4567',
  tracking_link: 'https://track.macseptic.com/abc123',
  technician_name: 'Mike Johnson',
};

const DEFAULT_CONFIG: ReminderSettings = {
  reminder48h: { enabled: true, smsEnabled: true, emailEnabled: true },
  reminder24h: { enabled: true, smsEnabled: true, emailEnabled: true },
  reminder2h: { enabled: true, smsEnabled: true, emailEnabled: false },
};

export function AutomatedReminders({
  onSave,
  initialConfig = DEFAULT_CONFIG,
}: AutomatedRemindersProps) {
  const [config, setConfig] = useState<ReminderSettings>(initialConfig);
  const [showPreview, setShowPreview] = useState<keyof ReminderSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const testNotification = useSendTestNotification();

  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(initialConfig));
  }, [config, initialConfig]);

  const handleToggle = (
    reminderType: keyof ReminderSettings,
    field: keyof ReminderConfig,
    value: boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      [reminderType]: {
        ...prev[reminderType],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave?.(config);
    setHasChanges(false);
  };

  const handleTestSend = async (reminderType: keyof ReminderSettings, type: 'sms' | 'email') => {
    try {
      await testNotification.mutateAsync({
        type,
        templateId: reminderType,
      });
    } catch (err) {
      console.error('Failed to send test notification:', err);
    }
  };

  const renderReminderCard = (
    type: keyof ReminderSettings,
    title: string,
    description: string,
    icon: React.ReactNode
  ) => {
    const reminder = config[type];
    const messages = DEFAULT_MESSAGES[type];

    return (
      <Card key={type} className={`p-4 ${!reminder.enabled ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center
              ${reminder.enabled ? 'bg-primary/10 text-primary' : 'bg-surface-secondary text-text-secondary'}
            `}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium">{title}</h4>
                <p className="text-sm text-text-secondary">{description}</p>
              </div>
              <Switch
                checked={reminder.enabled}
                onCheckedChange={(checked) => handleToggle(type, 'enabled', checked)}
              />
            </div>

            {reminder.enabled && (
              <div className="mt-4 space-y-3">
                {/* SMS toggle */}
                <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <div>
                      <Label className="font-medium">SMS Reminder</Label>
                      <p className="text-xs text-text-secondary line-clamp-1">{messages.sms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleTestSend(type, 'sms')}
                      disabled={!reminder.smsEnabled || testNotification.isPending}
                    >
                      Test
                    </Button>
                    <Switch
                      checked={reminder.smsEnabled}
                      onCheckedChange={(checked) => handleToggle(type, 'smsEnabled', checked)}
                    />
                  </div>
                </div>

                {/* Email toggle */}
                <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-purple-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <Label className="font-medium">Email Reminder</Label>
                      <p className="text-xs text-text-secondary line-clamp-1">{messages.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleTestSend(type, 'email')}
                      disabled={!reminder.emailEnabled || testNotification.isPending}
                    >
                      Test
                    </Button>
                    <Switch
                      checked={reminder.emailEnabled}
                      onCheckedChange={(checked) => handleToggle(type, 'emailEnabled', checked)}
                    />
                  </div>
                </div>

                {/* Preview button */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowPreview(type)}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Preview Messages
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Automated Reminders</h3>
          <p className="text-sm text-text-secondary">
            Configure automatic appointment reminders for customers
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave}>Save Preferences</Button>
        )}
      </div>

      {/* Reminder Cards */}
      <div className="space-y-4">
        {renderReminderCard(
          'reminder48h',
          '48-Hour Reminder',
          'Send 2 days before the appointment',
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}

        {renderReminderCard(
          'reminder24h',
          '24-Hour Reminder',
          'Send 1 day before the appointment',
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}

        {renderReminderCard(
          'reminder2h',
          '2-Hour Reminder',
          'Send 2 hours before the appointment',
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        )}
      </div>

      {/* Info notice */}
      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              How Automated Reminders Work
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Reminders are automatically scheduled when a work order is confirmed. Customers can
              reply STOP to opt out of SMS reminders. These preferences can be overridden for
              individual work orders.
            </p>
          </div>
        </div>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onClose={() => setShowPreview(null)}>
        <DialogContent size="lg">
          <DialogHeader onClose={() => setShowPreview(null)}>
            Message Preview - {showPreview && showPreview.replace('reminder', '').replace('h', '-Hour Reminder')}
          </DialogHeader>
          <DialogBody>
            {showPreview && (
              <div className="space-y-6">
                {/* SMS Preview */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    SMS Message
                  </h4>
                  <div className="bg-surface-secondary p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {renderTemplate(DEFAULT_MESSAGES[showPreview].sms, SAMPLE_VARIABLES)}
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {DEFAULT_MESSAGES[showPreview].sms.length} characters
                  </p>
                </div>

                {/* Email Preview */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-purple-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email Message
                  </h4>
                  <div className="bg-surface-secondary p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {renderTemplate(DEFAULT_MESSAGES[showPreview].email, SAMPLE_VARIABLES)}
                    </p>
                  </div>
                </div>

                {/* Sample variables used */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium mb-2">Sample Variables Used</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(SAMPLE_VARIABLES).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-text-secondary">{'{{' + key + '}}'}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AutomatedReminders;
