import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import {
  useSMSSettings,
  useUpdateSMSSettings,
  useSMSStats,
  useSMSTemplates,
  useCreateSMSTemplate,
  useUpdateSMSTemplate,
  useDeleteSMSTemplate,
  useTestTwilioConnection,
  type SMSTemplate,
} from '@/api/hooks/useSMS';

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
 * Template type labels
 */
const templateTypeLabels: Record<SMSTemplate['type'], string> = {
  appointment_reminder: 'Appointment Reminder',
  appointment_confirmation: 'Appointment Confirmation',
  service_complete: 'Service Complete',
  invoice_sent: 'Invoice Sent',
  payment_reminder: 'Payment Reminder',
  custom: 'Custom',
};

/**
 * SMS Settings Page
 */
export function SMSSettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useSMSSettings();
  const { data: stats } = useSMSStats();
  const { data: templates } = useSMSTemplates();
  const updateSettings = useUpdateSMSSettings();
  const testConnection = useTestTwilioConnection();
  const createTemplate = useCreateSMSTemplate();
  const updateTemplate = useUpdateSMSTemplate();
  const deleteTemplate = useDeleteSMSTemplate();

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'custom' as SMSTemplate['type'],
    content: '',
    is_active: true,
  });

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      toastSuccess(result.message);
    } catch (error) {
      toastError('Failed to test connection');
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          ...templateForm,
        });
      } else {
        await createTemplate.mutateAsync(templateForm);
      }
      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', type: 'custom', content: '', is_active: true });
    } catch (error) {
      toastError('Failed to save template');
    }
  };

  const handleEditTemplate = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type,
      content: template.content,
      is_active: template.is_active,
    });
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate.mutateAsync(id);
    } catch (error) {
      toastError('Failed to delete template');
    }
  };

  if (settingsLoading) {
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">SMS Settings</h1>
          <p className="text-text-secondary mt-1">
            Configure Twilio SMS integration and message templates
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Messages Today</p>
            <p className="text-2xl font-bold text-text-primary">{stats?.messages_today || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">This Month</p>
            <p className="text-2xl font-bold text-text-primary">{stats?.messages_this_month || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Delivery Rate</p>
            <p className="text-2xl font-bold text-success">
              {stats?.delivery_rate ? `${(stats.delivery_rate * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Opted Out</p>
            <p className="text-2xl font-bold text-text-primary">{stats?.opt_out_count || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Twilio Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📱</span> Twilio Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">SMS Enabled</p>
              <p className="text-sm text-text-muted">Enable or disable all SMS functionality</p>
            </div>
            <Toggle
              checked={settings?.twilio_enabled ?? false}
              onChange={(v) => updateSettings.mutate({ twilio_enabled: v })}
              disabled={updateSettings.isPending}
            />
          </div>

          {settings?.twilio_enabled && (
            <>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">Phone Number</p>
                    <p className="text-sm text-text-muted">
                      {settings.twilio_phone_number || 'Not configured'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        settings.twilio_account_status === 'active'
                          ? 'bg-success/20 text-success'
                          : settings.twilio_account_status === 'pending'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {settings.twilio_account_status || 'Unknown'}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testConnection.isPending}
                    >
                      {testConnection.isPending ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Auto-Send Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-text-primary">Appointment Reminders</p>
              <p className="text-sm text-text-muted">Automatically send reminders before appointments</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={settings?.reminder_hours_before || 24}
                  onChange={(e) => updateSettings.mutate({ reminder_hours_before: parseInt(e.target.value) })}
                  className="w-20"
                />
                <span className="text-sm text-text-muted">hours before</span>
              </div>
              <Toggle
                checked={settings?.auto_appointment_reminder ?? false}
                onChange={(v) => updateSettings.mutate({ auto_appointment_reminder: v })}
                disabled={updateSettings.isPending}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="font-medium text-text-primary">Service Complete</p>
              <p className="text-sm text-text-muted">Notify customers when service is completed</p>
            </div>
            <Toggle
              checked={settings?.auto_service_complete ?? false}
              onChange={(v) => updateSettings.mutate({ auto_service_complete: v })}
              disabled={updateSettings.isPending}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="font-medium text-text-primary">Invoice Sent</p>
              <p className="text-sm text-text-muted">Notify customers when an invoice is created</p>
            </div>
            <Toggle
              checked={settings?.auto_invoice_sent ?? false}
              onChange={(v) => updateSettings.mutate({ auto_invoice_sent: v })}
              disabled={updateSettings.isPending}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="font-medium text-text-primary">Payment Reminders</p>
              <p className="text-sm text-text-muted">Send reminders for overdue invoices</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={settings?.payment_reminder_days || 7}
                  onChange={(e) => updateSettings.mutate({ payment_reminder_days: parseInt(e.target.value) })}
                  className="w-20"
                />
                <span className="text-sm text-text-muted">days overdue</span>
              </div>
              <Toggle
                checked={settings?.auto_payment_reminder ?? false}
                onChange={(v) => updateSettings.mutate({ auto_payment_reminder: v })}
                disabled={updateSettings.isPending}
              />
            </div>
          </div>
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
              <p className="text-sm text-text-muted">Don't send automated messages during these hours</p>
            </div>
            <Toggle
              checked={settings?.quiet_hours_enabled ?? false}
              onChange={(v) => updateSettings.mutate({ quiet_hours_enabled: v })}
              disabled={updateSettings.isPending}
            />
          </div>

          {settings?.quiet_hours_enabled && (
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Start</label>
                <input
                  type="time"
                  value={settings.quiet_start || '21:00'}
                  onChange={(e) => updateSettings.mutate({ quiet_start: e.target.value })}
                  className="px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">End</label>
                <input
                  type="time"
                  value={settings.quiet_end || '08:00'}
                  onChange={(e) => updateSettings.mutate({ quiet_end: e.target.value })}
                  className="px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Templates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Message Templates</CardTitle>
          <Button
            onClick={() => {
              setEditingTemplate(null);
              setTemplateForm({ name: '', type: 'custom', content: '', is_active: true });
              setShowTemplateForm(true);
            }}
          >
            + New Template
          </Button>
        </CardHeader>
        <CardContent>
          {templates && templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-4 bg-bg-muted rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text-primary">{template.name}</h4>
                      <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                        {templateTypeLabels[template.type]}
                      </span>
                      {!template.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted mt-1 line-clamp-2">{template.content}</p>
                    {template.variables.length > 0 && (
                      <p className="text-xs text-text-muted mt-2">
                        Variables: {template.variables.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-danger hover:bg-danger/10"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <p>No templates yet. Create your first template to get started.</p>
            </div>
          )}

          {/* Template Form Modal */}
          {showTemplateForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-bg-card rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Template Name
                    </label>
                    <Input
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="e.g., 24-Hour Reminder"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Type
                    </label>
                    <select
                      value={templateForm.type}
                      onChange={(e) =>
                        setTemplateForm({ ...templateForm, type: e.target.value as SMSTemplate['type'] })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                    >
                      {Object.entries(templateTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Message Content
                    </label>
                    <textarea
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary resize-none"
                      placeholder="Hi {{customer_name}}, this is a reminder about your appointment on {{appointment_date}} at {{appointment_time}}."
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Available variables: {'{{customer_name}}'}, {'{{appointment_date}}'}, {'{{appointment_time}}'}, {'{{service_type}}'}, {'{{technician_name}}'}, {'{{invoice_amount}}'}, {'{{company_name}}'}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {templateForm.content.length}/160 characters (standard SMS)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={templateForm.is_active}
                      onChange={(v) => setTemplateForm({ ...templateForm, is_active: v })}
                    />
                    <span className="text-sm text-text-secondary">Template is active</span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowTemplateForm(false);
                      setEditingTemplate(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTemplate} disabled={!templateForm.name || !templateForm.content}>
                    {editingTemplate ? 'Save Changes' : 'Create Template'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
