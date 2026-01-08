/**
 * Survey Delivery Settings Component
 *
 * Delivery configuration for surveys:
 * - Channel selector (email, SMS, in-app, multi-channel)
 * - Timing optimizer (suggest best send times based on response rates)
 * - A/B test variant setup
 * - Reminder configuration
 * - Survey fatigue prevention (don't over-survey)
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';

// Types
export type DeliveryChannel = 'email' | 'sms' | 'in_app' | 'webhook';

export interface ChannelConfig {
  enabled: boolean;
  subject?: string;
  preview_text?: string;
  sender_name?: string;
  sender_email?: string;
  phone_number?: string;
  position?: 'bottom-right' | 'bottom-left' | 'center' | 'slide-in';
  webhook_url?: string;
}

export interface DeliveryTiming {
  type: 'immediate' | 'scheduled' | 'event_triggered' | 'recurring';
  scheduled_date?: string;
  scheduled_time?: string;
  timezone?: string;
  event_trigger?: string;
  delay_hours?: number;
  recurring_schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    day_of_week?: number;
    day_of_month?: number;
    time: string;
  };
  optimal_time_enabled?: boolean;
}

export interface ABTestConfig {
  enabled: boolean;
  variants: ABTestVariant[];
  test_metric: 'response_rate' | 'completion_rate' | 'nps_score' | 'csat_score';
  traffic_split: number[];
  auto_select_winner: boolean;
  winner_threshold: number;
  test_duration_days: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  subject?: string;
  changes: Record<string, unknown>;
}

export interface ReminderConfig {
  enabled: boolean;
  max_reminders: number;
  reminder_intervals: number[];
  reminder_subject?: string;
  stop_on_response: boolean;
}

export interface FatigueSettings {
  enabled: boolean;
  min_days_between_surveys: number;
  max_surveys_per_month: number;
  respect_opt_out: boolean;
  exclude_recently_churned: boolean;
  exclude_new_customers_days: number;
}

export interface SurveyDeliveryConfig {
  channels: Record<DeliveryChannel, ChannelConfig>;
  timing: DeliveryTiming;
  ab_test?: ABTestConfig;
  reminders: ReminderConfig;
  fatigue: FatigueSettings;
  target_segment_id?: number;
  exclude_segment_ids?: number[];
}

export interface SurveyDeliverySettingsProps {
  config?: Partial<SurveyDeliveryConfig>;
  segments?: Array<{ id: number; name: string; customer_count: number }>;
  onConfigChange: (config: SurveyDeliveryConfig) => void;
  onCheckEligibility?: (customerId: number) => Promise<{ eligible: boolean; reason: string; next_eligible_date?: string }>;
}

// Optimal send times based on industry data
const OPTIMAL_SEND_TIMES = [
  { day: 'Tuesday', time: '10:00', response_rate: 24 },
  { day: 'Wednesday', time: '10:00', response_rate: 23 },
  { day: 'Thursday', time: '14:00', response_rate: 22 },
  { day: 'Tuesday', time: '14:00', response_rate: 21 },
  { day: 'Wednesday', time: '14:00', response_rate: 20 },
];

// Default configuration
const DEFAULT_CONFIG: SurveyDeliveryConfig = {
  channels: {
    email: {
      enabled: true,
      subject: 'We value your feedback',
      preview_text: 'Share your experience with us',
      sender_name: 'Customer Success Team',
    },
    sms: { enabled: false },
    in_app: { enabled: false, position: 'bottom-right' },
    webhook: { enabled: false },
  },
  timing: {
    type: 'scheduled',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    optimal_time_enabled: false,
  },
  reminders: {
    enabled: true,
    max_reminders: 2,
    reminder_intervals: [3, 7],
    stop_on_response: true,
  },
  fatigue: {
    enabled: true,
    min_days_between_surveys: 30,
    max_surveys_per_month: 2,
    respect_opt_out: true,
    exclude_recently_churned: true,
    exclude_new_customers_days: 14,
  },
};

// Channel Configuration Panel
function ChannelPanel({
  channel,
  config,
  onUpdate,
}: {
  channel: DeliveryChannel;
  config: ChannelConfig;
  onUpdate: (config: ChannelConfig) => void;
}) {
  const channelInfo: Record<DeliveryChannel, { label: string; icon: React.ReactNode; description: string }> = {
    email: {
      label: 'Email',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Send survey via email',
    },
    sms: {
      label: 'SMS',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Send survey link via SMS',
    },
    in_app: {
      label: 'In-App',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Display survey in application',
    },
    webhook: {
      label: 'Webhook',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      description: 'Trigger external system',
    },
  };

  const info = channelInfo[channel];

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-colors',
      config.enabled ? 'border-primary bg-primary/5' : 'border-border'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            config.enabled ? 'bg-primary/10 text-primary' : 'bg-bg-hover text-text-muted'
          )}>
            {info.icon}
          </div>
          <div>
            <h4 className="font-medium text-text-primary">{info.label}</h4>
            <p className="text-xs text-text-muted">{info.description}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onUpdate({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-bg-hover rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {config.enabled && (
        <div className="space-y-3 pt-3 border-t border-border">
          {channel === 'email' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Subject Line</label>
                <input
                  type="text"
                  value={config.subject || ''}
                  onChange={(e) => onUpdate({ ...config, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter email subject..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Preview Text</label>
                <input
                  type="text"
                  value={config.preview_text || ''}
                  onChange={(e) => onUpdate({ ...config, preview_text: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Text shown in email preview..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={config.sender_name || ''}
                    onChange={(e) => onUpdate({ ...config, sender_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Sender Email</label>
                  <input
                    type="email"
                    value={config.sender_email || ''}
                    onChange={(e) => onUpdate({ ...config, sender_email: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </>
          )}

          {channel === 'sms' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Sender Phone Number</label>
              <input
                type="tel"
                value={config.phone_number || ''}
                onChange={(e) => onUpdate({ ...config, phone_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          )}

          {channel === 'in_app' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Display Position</label>
              <select
                value={config.position || 'bottom-right'}
                onChange={(e) => onUpdate({ ...config, position: e.target.value as ChannelConfig['position'] })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="center">Center Modal</option>
                <option value="slide-in">Slide In</option>
              </select>
            </div>
          )}

          {channel === 'webhook' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Webhook URL</label>
              <input
                type="url"
                value={config.webhook_url || ''}
                onChange={(e) => onUpdate({ ...config, webhook_url: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Timing Optimizer Component
function TimingOptimizer({
  timing,
  onUpdate,
}: {
  timing: DeliveryTiming;
  onUpdate: (timing: DeliveryTiming) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Send Timing</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['immediate', 'scheduled', 'event_triggered', 'recurring'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onUpdate({ ...timing, type })}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                timing.type === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-secondary hover:bg-bg-hover'
              )}
            >
              {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {timing.type === 'scheduled' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
            <input
              type="date"
              value={timing.scheduled_date || ''}
              onChange={(e) => onUpdate({ ...timing, scheduled_date: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Time</label>
            <input
              type="time"
              value={timing.scheduled_time || ''}
              onChange={(e) => onUpdate({ ...timing, scheduled_time: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {timing.type === 'event_triggered' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Trigger Event</label>
            <select
              value={timing.event_trigger || ''}
              onChange={(e) => onUpdate({ ...timing, event_trigger: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select event...</option>
              <option value="support_ticket_resolved">Support Ticket Resolved</option>
              <option value="onboarding_completed">Onboarding Completed</option>
              <option value="purchase_made">Purchase Made</option>
              <option value="feature_used">Feature Used</option>
              <option value="milestone_reached">Milestone Reached</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Delay (hours)</label>
            <input
              type="number"
              value={timing.delay_hours || 0}
              onChange={(e) => onUpdate({ ...timing, delay_hours: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              min="0"
              max="168"
            />
          </div>
        </div>
      )}

      {timing.type === 'recurring' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Frequency</label>
            <select
              value={timing.recurring_schedule?.frequency || 'monthly'}
              onChange={(e) =>
                onUpdate({
                  ...timing,
                  recurring_schedule: {
                    ...timing.recurring_schedule,
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'quarterly',
                    time: timing.recurring_schedule?.time || '10:00',
                  },
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>
      )}

      {/* Optimal Time Suggestion */}
      <div className="bg-bg-hover rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium text-text-primary">Optimal Send Time</h4>
            <p className="text-xs text-text-muted">Based on industry response rates</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={timing.optimal_time_enabled || false}
              onChange={(e) => onUpdate({ ...timing, optimal_time_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-bg-hover rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
          </label>
        </div>

        {timing.optimal_time_enabled && (
          <div className="space-y-2">
            <p className="text-sm text-text-secondary mb-2">Recommended times:</p>
            {OPTIMAL_SEND_TIMES.slice(0, 3).map((slot, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">
                  {slot.day} at {slot.time}
                </span>
                <span className="text-success font-medium">{slot.response_rate}% response rate</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// A/B Test Configuration Component
function ABTestPanel({
  config,
  onUpdate,
}: {
  config?: ABTestConfig;
  onUpdate: (config: ABTestConfig) => void;
}) {
  const defaultConfig: ABTestConfig = {
    enabled: false,
    variants: [
      { id: 'control', name: 'Control', changes: {} },
      { id: 'variant-a', name: 'Variant A', subject: '', changes: {} },
    ],
    test_metric: 'response_rate',
    traffic_split: [50, 50],
    auto_select_winner: true,
    winner_threshold: 95,
    test_duration_days: 7,
  };

  const currentConfig = config || defaultConfig;

  const handleAddVariant = () => {
    const newVariant: ABTestVariant = {
      id: `variant-${Date.now()}`,
      name: `Variant ${String.fromCharCode(65 + currentConfig.variants.length - 1)}`,
      changes: {},
    };
    const newVariants = [...currentConfig.variants, newVariant];
    const newSplit = newVariants.map(() => Math.floor(100 / newVariants.length));
    onUpdate({ ...currentConfig, variants: newVariants, traffic_split: newSplit });
  };

  const handleRemoveVariant = (id: string) => {
    if (currentConfig.variants.length <= 2) return;
    const newVariants = currentConfig.variants.filter((v) => v.id !== id);
    const newSplit = newVariants.map(() => Math.floor(100 / newVariants.length));
    onUpdate({ ...currentConfig, variants: newVariants, traffic_split: newSplit });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-text-primary">A/B Testing</h3>
          <p className="text-sm text-text-muted">Test different versions to optimize response rates</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={currentConfig.enabled}
            onChange={(e) => onUpdate({ ...currentConfig, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-bg-hover rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
        </label>
      </div>

      {currentConfig.enabled && (
        <div className="space-y-4 pt-4 border-t border-border">
          {/* Variants */}
          <div className="space-y-3">
            {currentConfig.variants.map((variant, index) => (
              <div key={variant.id} className="bg-bg-hover rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => {
                      const newVariants = [...currentConfig.variants];
                      newVariants[index] = { ...variant, name: e.target.value };
                      onUpdate({ ...currentConfig, variants: newVariants });
                    }}
                    className="font-medium text-text-primary bg-transparent border-none focus:outline-none"
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted">
                      {currentConfig.traffic_split[index]}% traffic
                    </span>
                    {index > 0 && (
                      <button
                        onClick={() => handleRemoveVariant(variant.id)}
                        className="text-danger hover:text-danger/80"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={variant.subject || ''}
                    onChange={(e) => {
                      const newVariants = [...currentConfig.variants];
                      newVariants[index] = { ...variant, subject: e.target.value };
                      onUpdate({ ...currentConfig, variants: newVariants });
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={index === 0 ? 'Original subject' : 'Test a different subject...'}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={handleAddVariant}
              className="w-full p-3 border border-dashed border-border rounded-lg text-text-muted hover:text-text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Variant
            </button>
          </div>

          {/* Test Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Success Metric</label>
              <select
                value={currentConfig.test_metric}
                onChange={(e) => onUpdate({ ...currentConfig, test_metric: e.target.value as ABTestConfig['test_metric'] })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="response_rate">Response Rate</option>
                <option value="completion_rate">Completion Rate</option>
                <option value="nps_score">NPS Score</option>
                <option value="csat_score">CSAT Score</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Test Duration (days)</label>
              <input
                type="number"
                value={currentConfig.test_duration_days}
                onChange={(e) => onUpdate({ ...currentConfig, test_duration_days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="30"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentConfig.auto_select_winner}
              onChange={(e) => onUpdate({ ...currentConfig, auto_select_winner: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-secondary">Automatically select winner at {currentConfig.winner_threshold}% confidence</span>
          </label>
        </div>
      )}
    </div>
  );
}

// Reminder Configuration Component
function ReminderPanel({
  config,
  onUpdate,
}: {
  config: ReminderConfig;
  onUpdate: (config: ReminderConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-text-primary">Reminders</h3>
          <p className="text-sm text-text-muted">Send follow-up reminders to non-responders</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onUpdate({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-bg-hover rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
        </label>
      </div>

      {config.enabled && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Max Reminders</label>
              <input
                type="number"
                value={config.max_reminders}
                onChange={(e) => onUpdate({ ...config, max_reminders: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Send After (days)</label>
              <input
                type="text"
                value={config.reminder_intervals.join(', ')}
                onChange={(e) =>
                  onUpdate({
                    ...config,
                    reminder_intervals: e.target.value.split(',').map((v) => parseInt(v.trim())).filter((v) => !isNaN(v)),
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 3, 7"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Reminder Subject</label>
            <input
              type="text"
              value={config.reminder_subject || ''}
              onChange={(e) => onUpdate({ ...config, reminder_subject: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="We'd still love your feedback!"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.stop_on_response}
              onChange={(e) => onUpdate({ ...config, stop_on_response: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-secondary">Stop reminders after response</span>
          </label>
        </div>
      )}
    </div>
  );
}

// Survey Fatigue Prevention Component
function FatiguePanel({
  config,
  onUpdate,
}: {
  config: FatigueSettings;
  onUpdate: (config: FatigueSettings) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-text-primary">Survey Fatigue Prevention</h3>
          <p className="text-sm text-text-muted">Prevent over-surveying customers</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onUpdate({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-bg-hover rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
        </label>
      </div>

      {config.enabled && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Min Days Between Surveys</label>
              <input
                type="number"
                value={config.min_days_between_surveys}
                onChange={(e) => onUpdate({ ...config, min_days_between_surveys: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="365"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Max Surveys Per Month</label>
              <input
                type="number"
                value={config.max_surveys_per_month}
                onChange={(e) => onUpdate({ ...config, max_surveys_per_month: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Exclude New Customers (days)</label>
            <input
              type="number"
              value={config.exclude_new_customers_days}
              onChange={(e) => onUpdate({ ...config, exclude_new_customers_days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              min="0"
              max="90"
            />
            <p className="text-xs text-text-muted mt-1">
              Don't survey customers who joined less than {config.exclude_new_customers_days} days ago
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.respect_opt_out}
                onChange={(e) => onUpdate({ ...config, respect_opt_out: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-secondary">Respect survey opt-out preferences</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.exclude_recently_churned}
                onChange={(e) => onUpdate({ ...config, exclude_recently_churned: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-secondary">Exclude recently churned customers</span>
            </label>
          </div>

          {/* Fatigue Warning */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-warning">Survey Fatigue Alert</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Some customers in your target segment have been surveyed recently. Consider adjusting your settings or timing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function SurveyDeliverySettings({
  config: initialConfig,
  segments = [],
  onConfigChange,
}: SurveyDeliverySettingsProps) {
  const [config, setConfig] = useState<SurveyDeliveryConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...initialConfig,
    channels: { ...DEFAULT_CONFIG.channels, ...initialConfig?.channels },
    timing: { ...DEFAULT_CONFIG.timing, ...initialConfig?.timing },
    reminders: { ...DEFAULT_CONFIG.reminders, ...initialConfig?.reminders },
    fatigue: { ...DEFAULT_CONFIG.fatigue, ...initialConfig?.fatigue },
  }));

  const [activeTab, setActiveTab] = useState<'channels' | 'timing' | 'targeting' | 'advanced'>('channels');

  const handleConfigUpdate = (updates: Partial<SurveyDeliveryConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const enabledChannels = useMemo(() => {
    return Object.entries(config.channels)
      .filter(([_, c]) => c.enabled)
      .map(([k]) => k);
  }, [config.channels]);

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="bg-bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-text-muted">Channels</p>
              <p className="font-medium text-text-primary">
                {enabledChannels.length > 0 ? enabledChannels.join(', ') : 'None selected'}
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-text-muted">Timing</p>
              <p className="font-medium text-text-primary capitalize">{config.timing.type.replace('_', ' ')}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-text-muted">Reminders</p>
              <p className="font-medium text-text-primary">
                {config.reminders.enabled ? `${config.reminders.max_reminders} max` : 'Disabled'}
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-text-muted">Fatigue Prevention</p>
              <p className={cn('font-medium', config.fatigue.enabled ? 'text-success' : 'text-warning')}>
                {config.fatigue.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['channels', 'timing', 'targeting', 'advanced'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-bg-card rounded-xl border border-border p-6">
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {(Object.keys(config.channels) as DeliveryChannel[]).map((channel) => (
                <ChannelPanel
                  key={channel}
                  channel={channel}
                  config={config.channels[channel]}
                  onUpdate={(channelConfig) =>
                    handleConfigUpdate({
                      channels: { ...config.channels, [channel]: channelConfig },
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timing' && (
          <TimingOptimizer timing={config.timing} onUpdate={(timing) => handleConfigUpdate({ timing })} />
        )}

        {activeTab === 'targeting' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Target Segment</label>
              <select
                value={config.target_segment_id || ''}
                onChange={(e) => handleConfigUpdate({ target_segment_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Customers</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name} ({segment.customer_count} customers)
                  </option>
                ))}
              </select>
            </div>

            <FatiguePanel config={config.fatigue} onUpdate={(fatigue) => handleConfigUpdate({ fatigue })} />
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <ABTestPanel config={config.ab_test} onUpdate={(ab_test) => handleConfigUpdate({ ab_test })} />
            <ReminderPanel config={config.reminders} onUpdate={(reminders) => handleConfigUpdate({ reminders })} />
          </div>
        )}
      </div>
    </div>
  );
}
