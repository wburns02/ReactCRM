import { useState } from 'react';
import { IntegrationCard } from './components/IntegrationCard.tsx';
import { RingCentralSettings } from './components/RingCentralSettings.tsx';
import { SamsaraSettings } from './components/SamsaraSettings.tsx';
import { useRCStatus } from '@/features/phone/api.ts';
import { useFleetLocations } from '@/features/fleet/api.ts';

/**
 * Integrations management page
 * Shows all available integrations and their configuration
 */
export function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const { data: rcStatus } = useRCStatus();
  const { data: vehicles } = useFleetLocations();

  const integrations = [
    {
      id: 'ringcentral',
      name: 'RingCentral',
      description: 'Cloud-based phone system for click-to-call and call tracking',
      icon: '📞',
      connected: rcStatus?.connected || false,
      lastSync: rcStatus?.connected ? new Date().toISOString() : undefined,
    },
    {
      id: 'samsara',
      name: 'Samsara GPS',
      description: 'Real-time fleet tracking and vehicle management',
      icon: '🚛',
      connected: (vehicles?.length || 0) > 0,
      lastSync: vehicles && vehicles.length > 0 ? new Date().toISOString() : undefined,
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Accounting and invoicing integration',
      icon: '💰',
      connected: false,
      lastSync: undefined,
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'CRM and marketing automation',
      icon: '🎯',
      connected: false,
      lastSync: undefined,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Integrations</h1>
        <p className="text-text-secondary">
          Connect MAC Septic CRM with your favorite tools and services
        </p>
      </div>

      {/* Integration Cards Grid */}
      {!selectedIntegration && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              name={integration.name}
              description={integration.description}
              icon={integration.icon}
              connected={integration.connected}
              lastSync={integration.lastSync}
              onConfigure={
                ['ringcentral', 'samsara'].includes(integration.id)
                  ? () => setSelectedIntegration(integration.id)
                  : undefined
              }
              onTest={
                integration.connected
                  ? () => alert(`Testing ${integration.name} connection...`)
                  : undefined
              }
              onDisconnect={
                integration.connected
                  ? () => {
                      if (confirm(`Disconnect ${integration.name}?`)) {
                        alert('Disconnected (demo only)');
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Detailed Settings View */}
      {selectedIntegration && (
        <div>
          <button
            onClick={() => setSelectedIntegration(null)}
            className="text-text-secondary hover:text-text-primary mb-4 text-sm"
          >
            ← Back to all integrations
          </button>

          {selectedIntegration === 'ringcentral' && <RingCentralSettings />}
          {selectedIntegration === 'samsara' && <SamsaraSettings />}
        </div>
      )}

      {/* Coming Soon Section */}
      {!selectedIntegration && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Mailchimp', icon: '📧', description: 'Email marketing' },
              { name: 'Stripe', icon: '💳', description: 'Payment processing' },
              { name: 'Zapier', icon: '⚡', description: 'Workflow automation' },
            ].map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-lg border border-border bg-bg-hover opacity-60"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <p className="font-medium text-text-primary">{item.name}</p>
                    <p className="text-sm text-text-secondary">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
