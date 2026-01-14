// Main components
export { OnboardingWizard } from "./OnboardingWizard";
export { OnboardingStep, StepSection } from "./OnboardingStep";
export { OnboardingCheck } from "./OnboardingCheck";
export { SetupWizard } from "./SetupWizard";
export { HelpCenter } from "./HelpCenter";

// Step components
export { CompanySetupStep } from "./steps/CompanySetupStep";
export { ImportCustomersStep } from "./steps/ImportCustomersStep";
export { AddTechniciansStep } from "./steps/AddTechniciansStep";
export { ConfigureServicesStep } from "./steps/ConfigureServicesStep";
export { ConnectIntegrationsStep } from "./steps/ConnectIntegrationsStep";
export { CompletionStep } from "./steps/CompletionStep";
export { FirstWorkOrderStep } from "./steps/FirstWorkOrderStep";
export { TechnicianInviteStep } from "./steps/TechnicianInviteStep";
export { CSVColumnMapper, type ColumnMapping } from "./steps/CSVColumnMapper";

// Hook and utilities
export {
  useOnboarding,
  isOnboardingCompleted,
  resetOnboarding,
  ONBOARDING_STEPS,
  type OnboardingStepName,
  type OnboardingData,
  type CompanyData,
  type ImportedCustomer,
  type OnboardingTechnician,
  type EnhancedTechnician,
  type FirstWorkOrderData,
  type ServiceType,
  type IntegrationStatus,
} from "./useOnboarding";
