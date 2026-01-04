import { useState, type ChangeEvent } from 'react';
import { OnboardingStep, StepSection } from '../OnboardingStep';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import type { ServiceType } from '../useOnboarding';

export interface ConfigureServicesStepProps {
  services: ServiceType[];
  onUpdateServices: (services: ServiceType[]) => void;
  onAddService: (service: ServiceType) => void;
  onRemoveService: (serviceId: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface CustomServiceForm {
  name: string;
  price: string;
}

const PRESET_SERVICES: Omit<ServiceType, 'id'>[] = [
  { name: 'Septic Tank Pumping', price: 350, isCustom: false },
  { name: 'Septic Inspection', price: 250, isCustom: false },
  { name: 'Grease Trap Cleaning', price: 200, isCustom: false },
  { name: 'Emergency Service', price: 500, isCustom: false },
  { name: 'Septic Repair', price: 400, isCustom: false },
  { name: 'System Installation', price: 5000, isCustom: false },
  { name: 'Drain Cleaning', price: 150, isCustom: false },
  { name: 'Maintenance Contract', price: 300, isCustom: false },
];

/**
 * Step 4: Configure Services
 * Select preset services or add custom service types with pricing
 */
export function ConfigureServicesStep({
  services,
  onUpdateServices,
  onAddService,
  onRemoveService,
  onNext,
  onBack,
  onSkip,
}: ConfigureServicesStepProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState<CustomServiceForm>({ name: '', price: '' });

  // Counter for generating unique IDs
  const [idCounter, setIdCounter] = useState(0);

  // Check if a preset is selected
  const isPresetSelected = (presetName: string) => {
    return services.some((s) => s.name === presetName);
  };

  const handlePresetToggle = (preset: Omit<ServiceType, 'id'>) => {
    if (isPresetSelected(preset.name)) {
      // Remove it
      const existing = services.find((s) => s.name === preset.name);
      if (existing) {
        onRemoveService(existing.id);
      }
    } else {
      // Add it with a unique ID
      const newId = idCounter;
      setIdCounter((prev) => prev + 1);
      onAddService({
        id: `preset-${newId}-${preset.name.replace(/\s+/g, '-')}`,
        ...preset,
      });
    }
  };

  const handleCustomFormChange = (field: keyof CustomServiceForm) => (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setCustomForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAddCustomService = () => {
    const name = customForm.name.trim();
    const price = parseFloat(customForm.price);

    if (!name || isNaN(price) || price < 0) {
      return;
    }

    onAddService({
      id: `custom-${Date.now()}`,
      name,
      price,
      isCustom: true,
    });

    setCustomForm({ name: '', price: '' });
    setShowCustomForm(false);
  };

  const handlePriceChange = (serviceId: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;

    const updated = services.map((s) =>
      s.id === serviceId ? { ...s, price } : s
    );
    onUpdateServices(updated);
  };

  // Note: These filtered arrays are available for future use
  // (e.g., showing separate sections for preset vs custom services)
  // const selectedServices = services.filter((s) => !s.isCustom);
  // const customServices = services.filter((s) => s.isCustom);

  return (
    <OnboardingStep
      title="Configure Services"
      description="Select the services you offer and set your pricing."
      isOptional
      isValid
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="space-y-8">
        {/* Preset Services */}
        <StepSection title="Common Services">
          <p className="text-sm text-text-muted mb-4">
            Click to select the services you offer. You can adjust pricing later.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_SERVICES.map((preset) => {
              const isSelected = isPresetSelected(preset.name);
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetToggle(preset)}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        isSelected ? 'border-primary bg-primary' : 'border-border'
                      )}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-text-primary">{preset.name}</span>
                  </div>
                  <span className="text-text-secondary">{formatCurrency(preset.price)}</span>
                </button>
              );
            })}
          </div>
        </StepSection>

        {/* Selected Services with Price Editing */}
        {services.length > 0 && (
          <StepSection title={`Your Services (${services.length})`}>
            <div className="border border-border rounded-lg divide-y divide-border">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 gap-4"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-medium text-text-primary truncate">
                      {service.name}
                    </span>
                    {service.isCustom && (
                      <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={service.price}
                      onChange={(e) => handlePriceChange(service.id, e.target.value)}
                      className="w-24 h-8 px-2 text-sm border border-border rounded bg-bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveService(service.id)}
                      className="text-text-muted hover:text-danger p-1"
                      aria-label="Remove service"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </StepSection>
        )}

        {/* Custom Service Form */}
        {showCustomForm ? (
          <StepSection title="Add Custom Service">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Service Name"
                  placeholder="e.g., Premium Inspection"
                  value={customForm.name}
                  onChange={handleCustomFormChange('name')}
                  required
                />
                <FormField
                  label="Price ($)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customForm.price}
                  onChange={handleCustomFormChange('price')}
                  required
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleAddCustomService}
                  disabled={!customForm.name.trim() || !customForm.price}
                >
                  Add Service
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCustomForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </StepSection>
        ) : (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCustomForm(true)}
            >
              + Add Custom Service
            </Button>
          </div>
        )}
      </div>
    </OnboardingStep>
  );
}
