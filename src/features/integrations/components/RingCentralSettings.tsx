import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { useRCStatus } from '@/features/phone/api.ts';

/**
 * RingCentral configuration settings
 */
export function RingCentralSettings() {
  const { data: status, isLoading } = useRCStatus();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // In a real implementation, this would call an API to save the credentials
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('RingCentral settings saved (demo only)');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RingCentral Phone Integration</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-bg-muted w-48 mb-4 rounded" />
            <div className="h-10 bg-bg-muted rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="p-3 bg-bg-hover rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">Connection Status</p>
                  {status?.connected && status.account_name && (
                    <p className="text-sm text-text-secondary">
                      Connected to: {status.account_name} 
                    </p>
                  )}
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    status?.connected ? 'bg-success' : 'bg-text-muted'
                  }`}
                />
              </div>
            </div>

            {/* API Credentials */}
            <div>
              <Label htmlFor="rc-api-key">API Key</Label>
              <Input
                id="rc-api-key"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter RingCentral API key"
              />
            </div>

            <div>
              <Label htmlFor="rc-api-secret">API Secret</Label>
              <Input
                id="rc-api-secret"
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter RingCentral API secret"
              />
            </div>

            {/* Features */}
            <div>
              <p className="font-medium text-text-primary mb-2">Enabled Features</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Click-to-call from customer/prospect pages
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Call logging and disposition tracking
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Automatic call recording
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  SMS integration (coming soon)
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant="secondary" onClick={() => window.open('https://ringcentral.com')}>
                RingCentral Dashboard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
