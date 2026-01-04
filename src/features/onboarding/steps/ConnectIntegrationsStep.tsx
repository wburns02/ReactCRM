import { useState } from 'react';
import { OnboardingStep, StepSection } from '../OnboardingStep';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { IntegrationStatus } from '../useOnboarding';

export interface ConnectIntegrationsStepProps {
  integrations: IntegrationStatus;
  onUpdateIntegrations: (integrations: Partial<IntegrationStatus>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface IntegrationConfig {
  id: keyof IntegrationStatus;
  name: string;
  description: string;
  icon: string;
  color: string;
  connectLabel: string;
}

const AVAILABLE_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices and payments with your QuickBooks account.',
    icon: 'QB',
    color: 'bg-green-500',
    connectLabel: 'Connect QuickBooks',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept credit card payments directly from invoices.',
    icon: 'S',
    color: 'bg-purple-500',
    connectLabel: 'Connect Stripe',
  },
];

/**
 * Step 5: Connect Integrations
 * Optional step to connect QuickBooks and Stripe
 */
export function ConnectIntegrationsStep({
  integrations,
  onUpdateIntegrations,
  onNext,
  onBack,
  onSkip,
}: ConnectIntegrationsStepProps) {
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (integrationId: keyof IntegrationStatus) => {
    setConnecting(integrationId);

    // Simulate OAuth flow delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In a real app, this would open an OAuth popup and handle the callback
    // For now, we just mark it as connected
    onUpdateIntegrations({ [integrationId]: true });
    setConnecting(null);
  };

  const handleDisconnect = (integrationId: keyof IntegrationStatus) => {
    onUpdateIntegrations({ [integrationId]: false });
  };

  const connectedCount = Object.values(integrations).filter(Boolean).length;

  return (
    <OnboardingStep
      title="Connect Integrations"
      description="Connect your accounting and payment tools for seamless operations."
      isOptional
      isValid
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="space-y-8">
        <StepSection>
          <p className="text-text-muted text-sm">
            These integrations are optional and can be configured later in Settings.
          </p>
        </StepSection>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {AVAILABLE_INTEGRATIONS.map((integration) => {
            const isConnected = integrations[integration.id];
            const isConnecting = connecting === integration.id;

            return (
              <Card
                key={integration.id}
                className={cn(
                  'p-6 transition-all',
                  isConnected && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg',
                      integration.color
                    )}
                  >
                    {integration.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text-primary">
                        {integration.name}
                      </h3>
                      {isConnected && (
                        <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded-full">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted mb-4">
                      {integration.description}
                    </p>

                    {isConnected ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-success flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Connected
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDisconnect(integration.id)}
                          className="text-sm text-text-muted hover:text-danger"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConnect(integration.id)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? 'Connecting...' : integration.connectLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Box */}
        <Card className="p-4 bg-bg-muted border-0">
          <div className="flex items-start gap-3">
            <span className="text-xl">i</span>
            <div>
              <p className="text-sm text-text-primary font-medium">
                Why connect integrations?
              </p>
              <ul className="text-sm text-text-muted mt-1 space-y-1">
                <li>- Automatically sync invoices to QuickBooks</li>
                <li>- Accept credit card payments online</li>
                <li>- Reduce manual data entry and errors</li>
                <li>- Get real-time payment notifications</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Status Summary */}
        {connectedCount > 0 && (
          <div className="text-center text-sm text-text-muted">
            {connectedCount} of {AVAILABLE_INTEGRATIONS.length} integrations connected
          </div>
        )}
      </div>
    </OnboardingStep>
  );
}
