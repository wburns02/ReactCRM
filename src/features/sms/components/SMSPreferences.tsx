/**
 * SMS Preferences Component
 *
 * Customer SMS notification preferences management UI.
 * Allows customers and staff to configure notification settings,
 * opt-in/opt-out status, and timing preferences.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import {
  useCustomerSMSPreferences,
  useUpdateCustomerSMSPreferences,
  useOptOutCustomer,
  useOptInCustomer,
} from '@/api/hooks/useSMSNotifications';
import type { CustomerSMSPreferences, OptOutStatus } from '@/api/types/sms';
import { SMSService } from '../services/SMSService';

// =============================================================================
// Toggle Component
// =============================================================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

function Toggle({ checked, onChange, disabled, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        {label && <p className="font-medium text-text-primary">{label}</p>}
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-label={label}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// =============================================================================
// Opt-Out Status Badge
// =============================================================================

function OptOutStatusBadge({ status }: { status: OptOutStatus }) {
  const config = {
    opted_in: { bg: 'bg-success/20', text: 'text-success', label: 'Opted In' },
    opted_out: { bg: 'bg-danger/20', text: 'text-danger', label: 'Opted Out' },
    pending: { bg: 'bg-warning/20', text: 'text-warning', label: 'Pending' },
  };

  const { bg, text, label } = config[status];

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

// =============================================================================
// Main Component Props
// =============================================================================

interface SMSPreferencesProps {
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  onSave?: (preferences: CustomerSMSPreferences) => void;
  compact?: boolean;
  readOnly?: boolean;
}

// =============================================================================
// SMS Preferences Component
// =============================================================================

export function SMSPreferences({
  customerId,
  customerName,
  customerPhone,
  onSave,
  compact = false,
  readOnly = false,
}: SMSPreferencesProps) {
  const { data: preferences, isLoading, refetch } = useCustomerSMSPreferences(customerId);
  const updatePreferences = useUpdateCustomerSMSPreferences();
  const optOutMutation = useOptOutCustomer();
  const optInMutation = useOptInCustomer();

  const [localPreferences, setLocalPreferences] = useState<Partial<CustomerSMSPreferences>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
      setHasChanges(false);
    }
  }, [preferences]);

  // Update local preference
  const updateLocal = <K extends keyof CustomerSMSPreferences>(
    key: K,
    value: CustomerSMSPreferences[K]
  ) => {
    setLocalPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save changes
  const handleSave = async () => {
    try {
      const result = await updatePreferences.mutateAsync({
        customerId,
        preferences: localPreferences,
      });
      setHasChanges(false);
      toastSuccess('SMS preferences saved successfully');
      onSave?.(result);
    } catch (error) {
      toastError('Failed to save SMS preferences');
    }
  };

  // Handle opt-out
  const handleOptOut = async () => {
    if (!confirm('Are you sure you want to opt out? You will no longer receive SMS notifications.')) {
      return;
    }
    try {
      await optOutMutation.mutateAsync(customerId);
      refetch();
      toastSuccess('Successfully opted out of SMS notifications');
    } catch (error) {
      toastError('Failed to opt out');
    }
  };

  // Handle opt-in
  const handleOptIn = async () => {
    try {
      await optInMutation.mutateAsync(customerId);
      refetch();
      toastSuccess('Successfully opted in to SMS notifications');
    } catch (error) {
      toastError('Failed to opt in');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  const isOptedOut = localPreferences.opt_out_status === 'opted_out';

  // Compact view for embedding in customer detail
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-text-primary">SMS Notifications</h4>
            <p className="text-sm text-text-muted">
              {customerPhone ? SMSService.formatPhoneForDisplay(customerPhone) : 'No phone on file'}
            </p>
          </div>
          <OptOutStatusBadge status={localPreferences.opt_out_status || 'opted_in'} />
        </div>

        {!isOptedOut && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={localPreferences.appointment_reminders ? 'text-success' : 'text-gray-400'}>
                {localPreferences.appointment_reminders ? 'x' : '-'}
              </span>
              <span>Appointment Reminders</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={localPreferences.on_my_way_alerts ? 'text-success' : 'text-gray-400'}>
                {localPreferences.on_my_way_alerts ? 'x' : '-'}
              </span>
              <span>On My Way Alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={localPreferences.invoice_notifications ? 'text-success' : 'text-gray-400'}>
                {localPreferences.invoice_notifications ? 'x' : '-'}
              </span>
              <span>Invoice Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={localPreferences.payment_reminders ? 'text-success' : 'text-gray-400'}>
                {localPreferences.payment_reminders ? 'x' : '-'}
              </span>
              <span>Payment Reminders</span>
            </div>
          </div>
        )}

        {isOptedOut && (
          <p className="text-sm text-text-muted italic">
            Customer has opted out of SMS notifications.
          </p>
        )}
      </div>
    );
  }

  // Full preferences view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">SMS Notification Preferences</h2>
          {customerName && (
            <p className="text-text-muted">
              {customerName}
              {customerPhone && ` - ${SMSService.formatPhoneForDisplay(customerPhone)}`}
            </p>
          )}
        </div>
        <OptOutStatusBadge status={localPreferences.opt_out_status || 'opted_in'} />
      </div>

      {/* Opt-Out Warning */}
      {isOptedOut && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-danger text-xl">!</span>
            <div>
              <h4 className="font-medium text-danger">Customer Opted Out</h4>
              <p className="text-sm text-text-secondary mt-1">
                This customer has opted out of SMS notifications. No automated messages will be sent.
                {localPreferences.opt_out_date && (
                  <span className="block mt-1">
                    Opted out on: {new Date(localPreferences.opt_out_date).toLocaleDateString()}
                  </span>
                )}
              </p>
              {!readOnly && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOptIn}
                  disabled={optInMutation.isPending}
                  className="mt-3"
                >
                  {optInMutation.isPending ? 'Processing...' : 'Re-enable SMS Notifications'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Master Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            SMS Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Toggle
            label="Enable SMS Notifications"
            description="Receive appointment reminders, updates, and invoices via text message"
            checked={localPreferences.sms_enabled ?? true}
            onChange={(v) => updateLocal('sms_enabled', v)}
            disabled={readOnly || isOptedOut}
          />

          {!readOnly && !isOptedOut && localPreferences.sms_enabled && (
            <div className="pt-4 border-t border-border mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOptOut}
                disabled={optOutMutation.isPending}
                className="text-danger hover:bg-danger/10"
              >
                {optOutMutation.isPending ? 'Processing...' : 'Opt Out of All SMS'}
              </Button>
              <p className="text-xs text-text-muted mt-2">
                You can also text STOP to our number to opt out.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Type Preferences */}
      {!isOptedOut && localPreferences.sms_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Toggle
              label="Booking Confirmations"
              description="Receive confirmation when appointments are scheduled"
              checked={localPreferences.booking_confirmation ?? true}
              onChange={(v) => updateLocal('booking_confirmation', v)}
              disabled={readOnly}
            />

            <Toggle
              label="Appointment Reminders"
              description="Receive reminders before scheduled appointments"
              checked={localPreferences.appointment_reminders ?? true}
              onChange={(v) => updateLocal('appointment_reminders', v)}
              disabled={readOnly}
            />

            <Toggle
              label="On My Way Alerts"
              description="Get notified when your technician is en route with ETA"
              checked={localPreferences.on_my_way_alerts ?? true}
              onChange={(v) => updateLocal('on_my_way_alerts', v)}
              disabled={readOnly}
            />

            <Toggle
              label="Service Complete Notifications"
              description="Receive notification when service is completed"
              checked={localPreferences.service_complete ?? true}
              onChange={(v) => updateLocal('service_complete', v)}
              disabled={readOnly}
            />

            <Toggle
              label="Invoice Notifications"
              description="Receive invoices and payment confirmations via text"
              checked={localPreferences.invoice_notifications ?? true}
              onChange={(v) => updateLocal('invoice_notifications', v)}
              disabled={readOnly}
            />

            <Toggle
              label="Payment Reminders"
              description="Receive reminders for outstanding invoices"
              checked={localPreferences.payment_reminders ?? true}
              onChange={(v) => updateLocal('payment_reminders', v)}
              disabled={readOnly}
            />

            <Toggle
              label="Review Requests"
              description="Receive requests to leave a review after service"
              checked={localPreferences.review_requests ?? true}
              onChange={(v) => updateLocal('review_requests', v)}
              disabled={readOnly}
            />

            <Toggle
              label="Marketing Messages"
              description="Receive promotional offers and company updates"
              checked={localPreferences.marketing_messages ?? false}
              onChange={(v) => updateLocal('marketing_messages', v)}
              disabled={readOnly}
            />
          </CardContent>
        </Card>
      )}

      {/* Timing Preferences */}
      {!isOptedOut && localPreferences.sms_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Timing Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reminder Timing */}
            <div>
              <label className="block font-medium text-text-primary mb-2">
                Appointment Reminder Timing
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={localPreferences.preferred_reminder_hours ?? 24}
                  onChange={(e) =>
                    updateLocal('preferred_reminder_hours', parseInt(e.target.value) || 24)
                  }
                  disabled={readOnly}
                  className="w-24"
                />
                <span className="text-text-secondary">hours before appointment</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                In addition to the 2-hour reminder
              </p>
            </div>

            {/* Quiet Hours */}
            <div className="pt-6 border-t border-border">
              <Toggle
                label="Quiet Hours"
                description="Don't send notifications during specific hours"
                checked={localPreferences.quiet_hours_enabled ?? false}
                onChange={(v) => updateLocal('quiet_hours_enabled', v)}
                disabled={readOnly}
              />

              {localPreferences.quiet_hours_enabled && (
                <div className="flex items-center gap-4 mt-4 ml-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Start
                    </label>
                    <input
                      type="time"
                      value={localPreferences.quiet_start ?? '21:00'}
                      onChange={(e) => updateLocal('quiet_start', e.target.value)}
                      disabled={readOnly}
                      className="px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                    />
                  </div>
                  <span className="text-text-muted mt-6">to</span>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      End
                    </label>
                    <input
                      type="time"
                      value={localPreferences.quiet_end ?? '08:00'}
                      onChange={(e) => updateLocal('quiet_end', e.target.value)}
                      disabled={readOnly}
                      className="px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block font-medium text-text-primary mb-2">
              Primary Phone Number
            </label>
            <Input
              type="tel"
              value={localPreferences.primary_phone ?? customerPhone ?? ''}
              onChange={(e) => updateLocal('primary_phone', e.target.value)}
              disabled={readOnly}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-2">
              Alternate Phone (Optional)
            </label>
            <Input
              type="tel"
              value={localPreferences.alternate_phone ?? ''}
              onChange={(e) => updateLocal('alternate_phone', e.target.value)}
              disabled={readOnly}
              placeholder="(555) 123-4567"
            />
            <p className="text-xs text-text-muted mt-1">
              Used if primary number is unavailable
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {!readOnly && hasChanges && (
        <div className="flex justify-end gap-3 sticky bottom-0 bg-bg-base py-4 border-t border-border">
          <Button
            variant="secondary"
            onClick={() => {
              setLocalPreferences(preferences || {});
              setHasChanges(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatePreferences.isPending}
          >
            {updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      )}

      {/* Last Updated */}
      {localPreferences.updated_at && (
        <p className="text-xs text-text-muted text-center">
          Last updated: {new Date(localPreferences.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default SMSPreferences;
