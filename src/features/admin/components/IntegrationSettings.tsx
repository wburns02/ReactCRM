import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useIntegrationSettings, useUpdateIntegrationSettings } from '@/api/hooks/useAdmin.ts';
import { getErrorMessage } from '@/api/client.ts';
import { formatDate } from '@/lib/utils.ts';

export function IntegrationSettings() {
  const { data: settings, isLoading } = useIntegrationSettings();
  const updateSettings = useUpdateIntegrationSettings();

  const [formData, setFormData] = useState({
    quickbooks_enabled: false,
    quickbooks_client_id: '',
    stripe_enabled: false,
    stripe_publishable_key: '',
    mailchimp_enabled: false,
    mailchimp_api_key: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        quickbooks_enabled: settings.quickbooks_enabled,
        quickbooks_client_id: settings.quickbooks_client_id || '',
        stripe_enabled: settings.stripe_enabled,
        stripe_publishable_key: settings.stripe_publishable_key || '',
        mailchimp_enabled: settings.mailchimp_enabled,
        mailchimp_api_key: settings.mailchimp_api_key || '',
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
      alert('Integration settings saved successfully!');
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  if (isLoading) {
    return <div className="text-text-secondary">Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* QuickBooks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>QuickBooks Integration</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  Sync invoices and payments with QuickBooks Online
                </p>
              </div>
              {settings?.quickbooks_connected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="quickbooks_enabled"
                checked={formData.quickbooks_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, quickbooks_enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="quickbooks_enabled" className="font-normal">
                Enable QuickBooks integration
              </Label>
            </div>

            {formData.quickbooks_enabled && (
              <>
                <div>
                  <Label htmlFor="quickbooks_client_id">Client ID</Label>
                  <Input
                    id="quickbooks_client_id"
                    value={formData.quickbooks_client_id}
                    onChange={(e) =>
                      setFormData({ ...formData, quickbooks_client_id: e.target.value })
                    }
                    placeholder="Enter QuickBooks Client ID"
                  />
                </div>

                {settings?.quickbooks_connected && settings.quickbooks_last_sync && (
                  <div className="text-sm text-text-secondary">
                    Last synced: {formatDate(settings.quickbooks_last_sync)}
                  </div>
                )}

                {settings?.quickbooks_connected && (
                  <Button type="button" variant="secondary" size="sm">
                    Disconnect QuickBooks
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Stripe */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Stripe Integration</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  Accept credit card payments online
                </p>
              </div>
              {settings?.stripe_connected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stripe_enabled"
                checked={formData.stripe_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, stripe_enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="stripe_enabled" className="font-normal">
                Enable Stripe payments
              </Label>
            </div>

            {formData.stripe_enabled && (
              <>
                <div>
                  <Label htmlFor="stripe_publishable_key">Publishable Key</Label>
                  <Input
                    id="stripe_publishable_key"
                    value={formData.stripe_publishable_key}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stripe_publishable_key: e.target.value,
                      })
                    }
                    placeholder="pk_live_..."
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Your Stripe publishable key (starts with pk_)
                  </p>
                </div>

                {settings?.stripe_connected && (
                  <Button type="button" variant="secondary" size="sm">
                    Disconnect Stripe
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Mailchimp */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mailchimp Integration</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  Sync customer email lists with Mailchimp
                </p>
              </div>
              {settings?.mailchimp_connected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mailchimp_enabled"
                checked={formData.mailchimp_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, mailchimp_enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="mailchimp_enabled" className="font-normal">
                Enable Mailchimp sync
              </Label>
            </div>

            {formData.mailchimp_enabled && (
              <>
                <div>
                  <Label htmlFor="mailchimp_api_key">API Key</Label>
                  <Input
                    id="mailchimp_api_key"
                    value={formData.mailchimp_api_key}
                    onChange={(e) =>
                      setFormData({ ...formData, mailchimp_api_key: e.target.value })
                    }
                    placeholder="Enter Mailchimp API key"
                  />
                </div>

                {settings?.mailchimp_connected && (
                  <Button type="button" variant="secondary" size="sm">
                    Disconnect Mailchimp
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
