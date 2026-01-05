/**
 * Setup Wizard Component
 * Guided onboarding for new users
 */
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useOnboardingProgress,
  useUpdateSetupStep,
  useSkipSetupStep,
  useCompleteOnboarding,
} from '@/api/hooks/useOnboarding';
import type { SetupStep, OnboardingProgress } from '@/api/types/onboarding';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/api/client';

export function SetupWizard() {
  const { data: progress, isLoading } = useOnboardingProgress();
  const updateStep = useUpdateSetupStep();
  const skipStep = useSkipSetupStep();
  const completeOnboarding = useCompleteOnboarding();

  const [activeStep, setActiveStep] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="h-96 bg-background-secondary animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-text-secondary">Unable to load onboarding progress</p>
      </div>
    );
  }

  // Check if completed
  if (progress.completed_at) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="text-2xl font-bold mt-4">Setup Complete!</h1>
        <p className="text-text-secondary mt-2">
          You're all set to start using the CRM.
        </p>
        <Button variant="primary" className="mt-6">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const handleSkip = async (stepId: string) => {
    try {
      await skipStep.mutateAsync(stepId);
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  const handleComplete = async () => {
    try {
      await completeOnboarding.mutateAsync();
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  const currentStep = activeStep
    ? progress.steps.find((s) => s.id === activeStep)
    : progress.steps.find((s) => s.status === 'in_progress' || s.status === 'pending');

  const completedSteps = progress.steps.filter((s) => s.status === 'completed').length;
  const totalSteps = progress.steps.length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary">Welcome to Your CRM</h1>
        <p className="text-text-secondary mt-2">
          Let's get you set up in just a few steps
        </p>
      </div>

      {/* Progress Bar */}
      <ProgressBar progress={progress.overall_progress} />

      {/* Step Summary */}
      <div className="flex items-center justify-center gap-4 text-sm text-text-secondary">
        <span>{completedSteps} of {totalSteps} steps completed</span>
        <span>•</span>
        <span>~{getEstimatedTime(progress.steps)} min remaining</span>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {progress.steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            isActive={currentStep?.id === step.id}
            onClick={() => setActiveStep(step.id)}
            onSkip={() => handleSkip(step.id)}
            isSkipping={skipStep.isPending}
          />
        ))}
      </div>

      {/* Current Step Content */}
      {currentStep && (
        <StepContent
          step={currentStep}
          onComplete={() => {
            updateStep.mutate({
              step_id: currentStep.id,
              status: 'completed',
            });
          }}
          isUpdating={updateStep.isPending}
        />
      )}

      {/* Complete Button */}
      {progress.overall_progress >= 100 && (
        <div className="text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleComplete}
            disabled={completeOnboarding.isPending}
          >
            Complete Setup & Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="relative">
      <div className="h-3 bg-background-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="absolute -right-2 -top-2">
        <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

function StepCard({
  step,
  isActive,
  onClick,
  onSkip,
  isSkipping,
}: {
  step: SetupStep;
  isActive: boolean;
  onClick: () => void;
  onSkip: () => void;
  isSkipping: boolean;
}) {
  const statusStyles = {
    pending: 'border-border',
    in_progress: 'border-primary bg-primary/5',
    completed: 'border-success bg-success/5',
    skipped: 'border-text-muted bg-text-muted/5',
  };

  const statusIcons = {
    pending: '○',
    in_progress: '◐',
    completed: '✓',
    skipped: '—',
  };

  const categoryIcons: Record<string, string> = {
    import: '📥',
    configuration: '⚙️',
    integrations: '🔗',
    team: '👥',
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        statusStyles[step.status],
        isActive && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold',
              step.status === 'completed' ? 'bg-success text-white' :
              step.status === 'skipped' ? 'bg-text-muted text-white' :
              step.status === 'in_progress' ? 'bg-primary text-white' :
              'bg-background-secondary text-text-muted'
            )}
          >
            {statusIcons[step.status]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{categoryIcons[step.category]}</span>
              <h3 className="font-semibold truncate">{step.title}</h3>
            </div>
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">
              {step.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                ~{step.estimated_minutes} min
              </Badge>
              {step.is_required && (
                <Badge className="bg-warning text-white text-xs">Required</Badge>
              )}
            </div>
          </div>
        </div>

        {step.status === 'pending' && !step.is_required && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            disabled={isSkipping}
          >
            Skip this step
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StepContent({
  step,
  onComplete,
  isUpdating,
}: {
  step: SetupStep;
  onComplete: () => void;
  isUpdating: boolean;
}) {
  // Render different content based on step category
  const renderContent = () => {
    switch (step.category) {
      case 'import':
        return <ImportStepContent step={step} onComplete={onComplete} />;
      case 'configuration':
        return <ConfigurationStepContent step={step} onComplete={onComplete} />;
      case 'integrations':
        return <IntegrationsStepContent step={step} onComplete={onComplete} />;
      case 'team':
        return <TeamStepContent step={step} onComplete={onComplete} />;
      default:
        return <GenericStepContent step={step} onComplete={onComplete} />;
    }
  };

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle>Step: {step.title}</CardTitle>
        <p className="text-text-secondary">{step.description}</p>
      </CardHeader>
      <CardContent>
        {step.status === 'completed' ? (
          <div className="text-center py-8">
            <span className="text-4xl">✅</span>
            <p className="text-success font-medium mt-2">Step completed!</p>
          </div>
        ) : (
          <>
            {renderContent()}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="primary"
                onClick={onComplete}
                disabled={isUpdating}
              >
                Mark as Complete
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ImportStepContent({ step, onComplete }: { step: SetupStep; onComplete: () => void }) {
  const importSources = [
    { id: 'csv', label: 'CSV File', icon: '📄', description: 'Upload a spreadsheet' },
    { id: 'quickbooks', label: 'QuickBooks', icon: '📊', description: 'Import from QuickBooks' },
    { id: 'servicetitan', label: 'ServiceTitan', icon: '🔧', description: 'Migrate from ServiceTitan' },
    { id: 'housecall_pro', label: 'Housecall Pro', icon: '🏠', description: 'Import from Housecall Pro' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Import your existing customer data to get started quickly.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {importSources.map((source) => (
          <button
            key={source.id}
            className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-left transition-colors"
          >
            <span className="text-2xl">{source.icon}</span>
            <h4 className="font-medium mt-2">{source.label}</h4>
            <p className="text-sm text-text-muted">{source.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigurationStepContent({ step, onComplete }: { step: SetupStep; onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Configure your service types and business settings.
      </p>
      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-background-secondary">
          <h4 className="font-medium">Service Types</h4>
          <p className="text-sm text-text-muted">Define the services you offer</p>
          <Button variant="outline" size="sm" className="mt-2">
            Add Service Types
          </Button>
        </div>
        <div className="p-4 rounded-lg bg-background-secondary">
          <h4 className="font-medium">Business Hours</h4>
          <p className="text-sm text-text-muted">Set your operating schedule</p>
          <Button variant="outline" size="sm" className="mt-2">
            Set Hours
          </Button>
        </div>
        <div className="p-4 rounded-lg bg-background-secondary">
          <h4 className="font-medium">Pricing</h4>
          <p className="text-sm text-text-muted">Configure default pricing</p>
          <Button variant="outline" size="sm" className="mt-2">
            Set Pricing
          </Button>
        </div>
      </div>
    </div>
  );
}

function IntegrationsStepContent({ step, onComplete }: { step: SetupStep; onComplete: () => void }) {
  const integrations = [
    { id: 'stripe', label: 'Stripe', icon: '💳', connected: false },
    { id: 'quickbooks', label: 'QuickBooks', icon: '📊', connected: false },
    { id: 'google_calendar', label: 'Google Calendar', icon: '📅', connected: false },
    { id: 'twilio', label: 'Twilio SMS', icon: '📱', connected: false },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Connect your existing tools for seamless workflow.
      </p>
      <div className="space-y-2">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between p-4 rounded-lg border border-border"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{integration.icon}</span>
              <span className="font-medium">{integration.label}</span>
            </div>
            <Button variant={integration.connected ? 'outline' : 'primary'} size="sm">
              {integration.connected ? 'Connected' : 'Connect'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamStepContent({ step, onComplete }: { step: SetupStep; onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Add your team members and technicians.
      </p>
      <div className="p-4 rounded-lg bg-background-secondary">
        <h4 className="font-medium">Invite Team Members</h4>
        <p className="text-sm text-text-muted">Send invitations to your staff</p>
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            placeholder="Enter email address"
            className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
          />
          <Button variant="primary">Send Invite</Button>
        </div>
      </div>
      <div className="p-4 rounded-lg bg-background-secondary">
        <h4 className="font-medium">Add Technicians</h4>
        <p className="text-sm text-text-muted">Set up technician profiles</p>
        <Button variant="outline" size="sm" className="mt-2">
          Add Technician
        </Button>
      </div>
    </div>
  );
}

function GenericStepContent({ step, onComplete }: { step: SetupStep; onComplete: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-text-secondary">{step.description}</p>
    </div>
  );
}

function getEstimatedTime(steps: SetupStep[]): number {
  return steps
    .filter((s) => s.status !== 'completed' && s.status !== 'skipped')
    .reduce((sum, s) => sum + s.estimated_minutes, 0);
}
