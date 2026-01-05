import { useOnboarding, ONBOARDING_STEPS } from './useOnboarding';
import { CompanySetupStep } from './steps/CompanySetupStep';
import { ImportCustomersStep } from './steps/ImportCustomersStep';
import { AddTechniciansStep } from './steps/AddTechniciansStep';
import { ConfigureServicesStep } from './steps/ConfigureServicesStep';
import { ConnectIntegrationsStep } from './steps/ConnectIntegrationsStep';
import { FirstWorkOrderStep } from './steps/FirstWorkOrderStep';
import { CompletionStep } from './steps/CompletionStep';
import { cn } from '@/lib/utils';

/**
 * Main onboarding wizard component
 * Multi-step wizard for new user setup
 */
export function OnboardingWizard() {
  const {
    currentStep,
    totalSteps,
    currentStepConfig,
    data,
    isLoaded,
    isStepValid,
    nextStep,
    prevStep,
    skipStep,
    updateCompanyData,
    addCustomers,
    removeCustomer,
    clearCustomers,
    addTechnician,
    removeTechnician,
    updateServices,
    addService,
    removeService,
    updateIntegrations,
    saveFirstWorkOrder,
    completeOnboarding,
  } = useOnboarding();

  // Show loading while restoring progress
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render current step content
  const renderStep = () => {
    switch (currentStepConfig.name) {
      case 'company':
        return (
          <CompanySetupStep
            data={data.company}
            onUpdate={updateCompanyData}
            onNext={nextStep}
            isValid={isStepValid()}
          />
        );
      case 'customers':
        return (
          <ImportCustomersStep
            customers={data.customers}
            onAddCustomers={addCustomers}
            onRemoveCustomer={removeCustomer}
            onClearCustomers={clearCustomers}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 'technicians':
        return (
          <AddTechniciansStep
            technicians={data.technicians}
            onAddTechnician={addTechnician}
            onRemoveTechnician={removeTechnician}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 'services':
        return (
          <ConfigureServicesStep
            services={data.services}
            onUpdateServices={updateServices}
            onAddService={addService}
            onRemoveService={removeService}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 'integrations':
        return (
          <ConnectIntegrationsStep
            integrations={data.integrations}
            onUpdateIntegrations={updateIntegrations}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 'firstWorkOrder':
        return (
          <FirstWorkOrderStep
            customers={data.customers}
            services={data.services}
            workOrder={data.firstWorkOrder}
            onSaveWorkOrder={saveFirstWorkOrder}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipStep}
          />
        );
      case 'complete':
        return (
          <CompletionStep
            data={data}
            onComplete={completeOnboarding}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg-main">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome to ReactCRM
          </h1>
          <p className="text-text-secondary">
            Let's get your account set up in just a few steps
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          {/* Step Labels (Desktop) */}
          <div className="hidden md:flex justify-between mb-4">
            {ONBOARDING_STEPS.slice(0, -1).map((step, index) => (
              <div
                key={step.name}
                className={cn(
                  'flex-1 text-center text-sm',
                  index < currentStep
                    ? 'text-primary'
                    : index === currentStep
                    ? 'text-text-primary font-medium'
                    : 'text-text-muted'
                )}
              >
                {step.title}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / totalSteps) * 100}%`,
                }}
              />
            </div>

            {/* Step Indicators */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between">
              {ONBOARDING_STEPS.slice(0, -1).map((step, index) => (
                <div
                  key={step.name}
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                    index < currentStep
                      ? 'bg-primary text-white'
                      : index === currentStep
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-bg-card border-2 border-border text-text-muted'
                  )}
                >
                  {index < currentStep ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current Step (Mobile) */}
          <div className="md:hidden text-center mt-4 text-sm text-text-secondary">
            Step {currentStep + 1} of {totalSteps - 1}: {currentStepConfig.title}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-bg-card rounded-lg border border-border p-6 md:p-8 min-h-[500px]">
          {renderStep()}
        </div>

        {/* Help Text */}
        <div className="text-center mt-6 text-sm text-text-muted">
          Need help?{' '}
          <a href="mailto:support@example.com" className="text-primary hover:underline">
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
