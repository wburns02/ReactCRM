/**
 * First Work Order Step
 * Guided step to help users create their first work order
 */
import { useState } from 'react';
import { OnboardingStep, StepSection } from '../OnboardingStep';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { ImportedCustomer, ServiceType } from '../useOnboarding';

export interface FirstWorkOrderData {
  customerId: string | null;
  customerName: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
}

export interface FirstWorkOrderStepProps {
  customers: ImportedCustomer[];
  services: ServiceType[];
  workOrder: FirstWorkOrderData | null;
  onSaveWorkOrder: (workOrder: FirstWorkOrderData) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const EMPTY_WORK_ORDER: FirstWorkOrderData = {
  customerId: null,
  customerName: '',
  serviceType: '',
  scheduledDate: '',
  scheduledTime: '09:00',
  notes: '',
};

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

/**
 * Step 6: Create First Work Order
 * Guided workflow to create the first work order
 */
export function FirstWorkOrderStep({
  customers,
  services,
  workOrder,
  onSaveWorkOrder,
  onNext,
  onBack,
  onSkip,
}: FirstWorkOrderStepProps) {
  const [formData, setFormData] = useState<FirstWorkOrderData>(
    workOrder || EMPTY_WORK_ORDER
  );
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [step, setStep] = useState<'customer' | 'service' | 'schedule' | 'review'>('customer');

  const activeServices = services.filter(s => s.price > 0);

  const updateForm = <K extends keyof FirstWorkOrderData>(
    field: K,
    value: FirstWorkOrderData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectCustomer = (customer: ImportedCustomer | null, name: string = '') => {
    updateForm('customerId', customer?.id || null);
    updateForm('customerName', customer?.name || name);
    if (customer || name) {
      setStep('service');
    }
  };

  const selectService = (service: ServiceType) => {
    updateForm('serviceType', service.name);
    setStep('schedule');
  };

  const handleScheduleComplete = () => {
    if (formData.scheduledDate && formData.scheduledTime) {
      setStep('review');
    }
  };

  const handleSave = () => {
    onSaveWorkOrder(formData);
    onNext();
  };

  const isValid =
    formData.customerName &&
    formData.serviceType &&
    formData.scheduledDate &&
    formData.scheduledTime;

  return (
    <OnboardingStep
      title="Create Your First Work Order"
      description="Let's walk through creating a work order. This is how you'll schedule and track jobs."
      isOptional
      isValid={!!isValid}
      onNext={handleSave}
      onBack={onBack}
      onSkip={onSkip}
    >
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(['customer', 'service', 'schedule', 'review'] as const).map((s, idx) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step === s
                  ? 'bg-primary text-white'
                  : ['customer', 'service', 'schedule', 'review'].indexOf(step) > idx
                  ? 'bg-success text-white'
                  : 'bg-bg-muted text-text-muted'
              )}
            >
              {['customer', 'service', 'schedule', 'review'].indexOf(step) > idx ? '✓' : idx + 1}
            </div>
            {idx < 3 && (
              <div className={cn(
                'w-8 h-0.5 mx-1',
                ['customer', 'service', 'schedule', 'review'].indexOf(step) > idx
                  ? 'bg-success'
                  : 'bg-bg-muted'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Customer */}
      {step === 'customer' && (
        <StepSection title="1. Select a Customer">
          <p className="text-sm text-text-secondary mb-4">
            Who is this work order for?
          </p>

          {customers.length > 0 && !showNewCustomer && (
            <div className="space-y-2 mb-4">
              {customers.slice(0, 5).map(customer => (
                <Card
                  key={customer.id}
                  className={cn(
                    'p-3 cursor-pointer transition-all hover:border-primary',
                    formData.customerId === customer.id && 'border-primary bg-primary/5'
                  )}
                  onClick={() => selectCustomer(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-text-muted">
                        {customer.email || customer.phone || 'No contact info'}
                      </p>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      formData.customerId === customer.id
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    )}>
                      {formData.customerId === customer.id && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              <button
                onClick={() => setShowNewCustomer(true)}
                className="text-sm text-primary hover:underline"
              >
                + Add new customer
              </button>
            </div>
          )}

          {(customers.length === 0 || showNewCustomer) && (
            <div className="space-y-4">
              <FormField
                label="Customer Name"
                placeholder="John Smith"
                value={formData.customerName}
                onChange={(e) => updateForm('customerName', e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => selectCustomer(null, formData.customerName)}
                  disabled={!formData.customerName.trim()}
                >
                  Continue
                </Button>
                {customers.length > 0 && (
                  <Button variant="ghost" onClick={() => setShowNewCustomer(false)}>
                    Select existing
                  </Button>
                )}
              </div>
            </div>
          )}
        </StepSection>
      )}

      {/* Step 2: Select Service */}
      {step === 'service' && (
        <StepSection title="2. Select Service Type">
          <p className="text-sm text-text-secondary mb-4">
            What type of service will you provide?
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {activeServices.length > 0 ? (
              activeServices.map(service => (
                <Card
                  key={service.id}
                  className={cn(
                    'p-4 cursor-pointer text-center transition-all hover:border-primary',
                    formData.serviceType === service.name && 'border-primary bg-primary/5'
                  )}
                  onClick={() => selectService(service)}
                >
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-text-muted">${service.price}</p>
                </Card>
              ))
            ) : (
              // Default services if none configured
              ['Septic Pumping', 'Inspection', 'Repair', 'Installation'].map(name => (
                <Card
                  key={name}
                  className={cn(
                    'p-4 cursor-pointer text-center transition-all hover:border-primary',
                    formData.serviceType === name && 'border-primary bg-primary/5'
                  )}
                  onClick={() => {
                    updateForm('serviceType', name);
                    setStep('schedule');
                  }}
                >
                  <p className="font-medium">{name}</p>
                </Card>
              ))
            )}
          </div>

          <div className="mt-4">
            <Button variant="ghost" onClick={() => setStep('customer')}>
              ← Back to customer
            </Button>
          </div>
        </StepSection>
      )}

      {/* Step 3: Schedule */}
      {step === 'schedule' && (
        <StepSection title="3. Schedule the Job">
          <p className="text-sm text-text-secondary mb-4">
            When should this job be scheduled?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => updateForm('scheduledDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-10 px-3 rounded-md border border-border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <div className="grid grid-cols-5 gap-1">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    onClick={() => updateForm('scheduledTime', time)}
                    className={cn(
                      'py-2 px-1 text-sm rounded border transition-colors',
                      formData.scheduledTime === time
                        ? 'bg-primary text-white border-primary'
                        : 'border-border hover:border-primary'
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <FormField
            label="Notes (optional)"
            placeholder="Any special instructions or details about the job..."
            value={formData.notes}
            onChange={(e) => updateForm('notes', e.target.value)}
          />

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleScheduleComplete}
              disabled={!formData.scheduledDate || !formData.scheduledTime}
            >
              Review Work Order
            </Button>
            <Button variant="ghost" onClick={() => setStep('service')}>
              ← Back
            </Button>
          </div>
        </StepSection>
      )}

      {/* Step 4: Review */}
      {step === 'review' && (
        <StepSection title="4. Review & Save">
          <Card className="p-6 bg-bg-muted/50">
            <h4 className="font-semibold mb-4">Work Order Summary</h4>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Customer:</span>
                <span className="font-medium">{formData.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Service:</span>
                <span className="font-medium">{formData.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Date:</span>
                <span className="font-medium">
                  {formData.scheduledDate && new Date(formData.scheduledDate + 'T00:00').toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Time:</span>
                <span className="font-medium">{formData.scheduledTime}</span>
              </div>
              {formData.notes && (
                <div className="pt-2 border-t border-border">
                  <span className="text-text-muted">Notes:</span>
                  <p className="mt-1">{formData.notes}</p>
                </div>
              )}
            </div>
          </Card>

          <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-sm text-success font-medium mb-1">Ready to save!</p>
            <p className="text-xs text-text-secondary">
              This work order will be saved when you complete onboarding.
              You can create more work orders from the Dispatch Board.
            </p>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={() => setStep('schedule')}>
              ← Edit
            </Button>
          </div>
        </StepSection>
      )}
    </OnboardingStep>
  );
}

export default FirstWorkOrderStep;
