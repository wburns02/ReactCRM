import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useRCStatus, useTwilioStatus, useMyExtension } from '../api.ts';

type PhoneProvider = 'ringcentral' | 'twilio';

interface PhoneSettingsProps {
  onProviderChange?: (provider: PhoneProvider) => void;
}

export function PhoneSettings({ onProviderChange }: PhoneSettingsProps) {
  const [selectedProvider, setSelectedProvider] = useState<PhoneProvider>(() => {
    const stored = localStorage.getItem('phone_provider');
    return (stored as PhoneProvider) || 'ringcentral';
  });

  const { data: rcStatus, isLoading: rcLoading } = useRCStatus();
  const { data: twilioStatus, isLoading: twilioLoading } = useTwilioStatus();
  const { data: myExtension } = useMyExtension();

  useEffect(() => {
    localStorage.setItem('phone_provider', selectedProvider);
    onProviderChange?.(selectedProvider);
  }, [selectedProvider, onProviderChange]);

  const handleProviderSelect = (provider: PhoneProvider) => {
    setSelectedProvider(provider);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Phone Provider Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleProviderSelect('ringcentral')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedProvider === 'ringcentral'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-text-primary">RingCentral</span>
              {selectedProvider === 'ringcentral' && <Badge variant="success">Active</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${rcStatus?.connected ? 'bg-success' : 'bg-danger'}`} />
              <span className="text-text-secondary">
                {rcLoading ? 'Checking...' : rcStatus?.connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <p className="text-text-muted text-sm mt-2">Rings your phone first, then connects to customer.</p>
          </div>
          <div
            onClick={() => handleProviderSelect('twilio')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedProvider === 'twilio'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-text-primary">Twilio</span>
              {selectedProvider === 'twilio' && <Badge variant="success">Active</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${twilioStatus?.connected ? 'bg-success' : 'bg-danger'}`} />
              <span className="text-text-secondary">
                {twilioLoading ? 'Checking...' : twilioStatus?.connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <p className="text-text-muted text-sm mt-2">Direct outbound calls without ringing your phone.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function usePhoneProvider(): PhoneProvider {
  const [provider, setProvider] = useState<PhoneProvider>(() => {
    const stored = localStorage.getItem('phone_provider');
    return (stored as PhoneProvider) || 'ringcentral';
  });
  return provider;
}

