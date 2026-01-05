import { useState, useCallback, useEffect } from 'react';

/**
 * Onboarding step names
 */
export type OnboardingStepName =
  | 'company'
  | 'customers'
  | 'technicians'
  | 'services'
  | 'integrations'
  | 'firstWorkOrder'
  | 'complete';

/**
 * Company data collected in step 1
 */
export interface CompanyData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  logo?: string; // Base64 encoded image
}

/**
 * Customer imported in step 2
 */
export interface ImportedCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

/**
 * Technician added in step 3
 */
export interface OnboardingTechnician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  skills: string[];
}

/**
 * Enhanced technician with roles and certifications
 */
export interface EnhancedTechnician extends OnboardingTechnician {
  role: 'technician' | 'lead_technician' | 'supervisor';
  certifications: string[];
  sendInvite: boolean;
}

/**
 * First work order data
 */
export interface FirstWorkOrderData {
  customerId: string | null;
  customerName: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
}

/**
 * Service type configured in step 4
 */
export interface ServiceType {
  id: string;
  name: string;
  price: number;
  isCustom: boolean;
}

/**
 * Integration status in step 5
 */
export interface IntegrationStatus {
  quickbooks: boolean;
  stripe: boolean;
}

/**
 * Complete onboarding data structure
 */
export interface OnboardingData {
  company: CompanyData;
  customers: ImportedCustomer[];
  technicians: OnboardingTechnician[];
  services: ServiceType[];
  integrations: IntegrationStatus;
  firstWorkOrder: FirstWorkOrderData | null;
}

/**
 * All steps configuration
 */
export const ONBOARDING_STEPS: {
  name: OnboardingStepName;
  title: string;
  description: string;
  isOptional: boolean;
}[] = [
  {
    name: 'company',
    title: 'Company Setup',
    description: 'Tell us about your business',
    isOptional: false,
  },
  {
    name: 'customers',
    title: 'Import Customers',
    description: 'Add your existing customers',
    isOptional: true,
  },
  {
    name: 'technicians',
    title: 'Add Technicians',
    description: 'Set up your team',
    isOptional: true,
  },
  {
    name: 'services',
    title: 'Configure Services',
    description: 'Define your service offerings',
    isOptional: true,
  },
  {
    name: 'integrations',
    title: 'Connect Integrations',
    description: 'Link your existing tools',
    isOptional: true,
  },
  {
    name: 'firstWorkOrder',
    title: 'First Work Order',
    description: 'Create your first job',
    isOptional: true,
  },
  {
    name: 'complete',
    title: 'All Done!',
    description: 'You are ready to go',
    isOptional: false,
  },
];

const STORAGE_KEY = 'crm_onboarding_progress';
const COMPLETED_KEY = 'crm_onboarding_completed';

/**
 * Default empty onboarding data
 */
function getDefaultData(): OnboardingData {
  return {
    company: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      logo: undefined,
    },
    customers: [],
    technicians: [],
    services: [],
    integrations: {
      quickbooks: false,
      stripe: false,
    },
    firstWorkOrder: null,
  };
}

/**
 * Load saved progress from localStorage
 */
function loadProgress(): { step: number; data: OnboardingData } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Save progress to localStorage
 */
function saveProgress(step: number, data: OnboardingData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear saved progress
 */
function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if onboarding has been completed
 */
export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(COMPLETED_KEY, 'true');
    clearProgress();
  } catch {
    // Ignore storage errors
  }
}

/**
 * Reset onboarding (for testing or re-onboarding)
 */
export function resetOnboarding(): void {
  try {
    localStorage.removeItem(COMPLETED_KEY);
    clearProgress();
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get initial state from localStorage or defaults
 */
function getInitialState(): { step: number; data: OnboardingData } {
  const saved = loadProgress();
  if (saved) {
    return { step: saved.step, data: saved.data };
  }
  return { step: 0, data: getDefaultData() };
}

/**
 * Hook to manage onboarding state
 */
export function useOnboarding() {
  // Use lazy initialization to load from localStorage
  const [currentStep, setCurrentStep] = useState(() => getInitialState().step);
  const [data, setData] = useState<OnboardingData>(() => getInitialState().data);
  const [isLoaded] = useState(true); // Always loaded after lazy init

  // Save progress whenever step or data changes
  useEffect(() => {
    if (isLoaded && currentStep < ONBOARDING_STEPS.length - 1) {
      saveProgress(currentStep, data);
    }
  }, [currentStep, data, isLoaded]);

  const totalSteps = ONBOARDING_STEPS.length;
  const currentStepConfig = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isCompleteStep = currentStepConfig.name === 'complete';

  /**
   * Go to next step
   */
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  /**
   * Go to previous step
   */
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  /**
   * Go to specific step
   */
  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  /**
   * Skip current step (only for optional steps)
   */
  const skipStep = useCallback(() => {
    if (currentStepConfig.isOptional) {
      nextStep();
    }
  }, [currentStepConfig, nextStep]);

  /**
   * Update company data
   */
  const updateCompanyData = useCallback((companyData: Partial<CompanyData>) => {
    setData((prev) => ({
      ...prev,
      company: { ...prev.company, ...companyData },
    }));
  }, []);

  /**
   * Add imported customers
   */
  const addCustomers = useCallback((customers: ImportedCustomer[]) => {
    setData((prev) => ({
      ...prev,
      customers: [...prev.customers, ...customers],
    }));
  }, []);

  /**
   * Remove a customer
   */
  const removeCustomer = useCallback((customerId: string) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== customerId),
    }));
  }, []);

  /**
   * Clear all customers
   */
  const clearCustomers = useCallback(() => {
    setData((prev) => ({
      ...prev,
      customers: [],
    }));
  }, []);

  /**
   * Add a technician
   */
  const addTechnician = useCallback((technician: OnboardingTechnician) => {
    setData((prev) => ({
      ...prev,
      technicians: [...prev.technicians, technician],
    }));
  }, []);

  /**
   * Remove a technician
   */
  const removeTechnician = useCallback((technicianId: string) => {
    setData((prev) => ({
      ...prev,
      technicians: prev.technicians.filter((t) => t.id !== technicianId),
    }));
  }, []);

  /**
   * Update services
   */
  const updateServices = useCallback((services: ServiceType[]) => {
    setData((prev) => ({
      ...prev,
      services,
    }));
  }, []);

  /**
   * Add a service
   */
  const addService = useCallback((service: ServiceType) => {
    setData((prev) => ({
      ...prev,
      services: [...prev.services, service],
    }));
  }, []);

  /**
   * Remove a service
   */
  const removeService = useCallback((serviceId: string) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== serviceId),
    }));
  }, []);

  /**
   * Update integration status
   */
  const updateIntegrations = useCallback((integrations: Partial<IntegrationStatus>) => {
    setData((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, ...integrations },
    }));
  }, []);

  /**
   * Save first work order
   */
  const saveFirstWorkOrder = useCallback((workOrder: FirstWorkOrderData) => {
    setData((prev) => ({
      ...prev,
      firstWorkOrder: workOrder,
    }));
  }, []);

  /**
   * Update technician (for enhanced technician data)
   */
  const updateTechnician = useCallback((technicianId: string, updates: Partial<OnboardingTechnician>) => {
    setData((prev) => ({
      ...prev,
      technicians: prev.technicians.map((t) =>
        t.id === technicianId ? { ...t, ...updates } : t
      ),
    }));
  }, []);

  /**
   * Complete onboarding
   */
  const completeOnboarding = useCallback(() => {
    markOnboardingCompleted();
  }, []);

  /**
   * Check if current step is valid
   */
  const isStepValid = useCallback((): boolean => {
    switch (currentStepConfig.name) {
      case 'company':
        return !!(
          data.company.name &&
          data.company.address &&
          data.company.city &&
          data.company.state &&
          data.company.zipCode &&
          data.company.phone
        );
      case 'customers':
      case 'technicians':
      case 'services':
      case 'integrations':
      case 'firstWorkOrder':
        return true; // Optional steps are always valid
      case 'complete':
        return true;
      default:
        return false;
    }
  }, [currentStepConfig.name, data.company]);

  return {
    // State
    currentStep,
    totalSteps,
    currentStepConfig,
    data,
    isLoaded,
    isFirstStep,
    isLastStep,
    isCompleteStep,

    // Validation
    isStepValid,

    // Navigation
    nextStep,
    prevStep,
    goToStep,
    skipStep,

    // Data updates
    updateCompanyData,
    addCustomers,
    removeCustomer,
    clearCustomers,
    addTechnician,
    removeTechnician,
    updateTechnician,
    updateServices,
    addService,
    removeService,
    updateIntegrations,
    saveFirstWorkOrder,
    completeOnboarding,
  };
}
