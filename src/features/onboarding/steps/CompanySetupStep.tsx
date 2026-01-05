import { useState, useRef, type ChangeEvent } from 'react';
import { OnboardingStep, StepSection } from '../OnboardingStep';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toastWarning } from '@/components/ui/Toast';
import type { CompanyData } from '../useOnboarding';

export interface CompanySetupStepProps {
  data: CompanyData;
  onUpdate: (data: Partial<CompanyData>) => void;
  onNext: () => void;
  isValid: boolean;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

/**
 * Step 1: Company Setup
 * Collects basic company information
 */
export function CompanySetupStep({
  data,
  onUpdate,
  onNext,
  isValid,
}: CompanySetupStepProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(data.logo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof CompanyData) => (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    onUpdate({ [field]: e.target.value });
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastWarning('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toastWarning('Image must be smaller than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      onUpdate({ logo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    onUpdate({ logo: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <OnboardingStep
      title="Company Setup"
      description="Let's start by setting up your company profile. This information will appear on invoices and customer communications."
      isFirstStep
      isValid={isValid}
      onNext={onNext}
      nextButtonText="Continue"
    >
      <div className="space-y-8">
        {/* Logo Upload */}
        <StepSection title="Company Logo">
          <div className="flex items-start gap-6">
            <div
              className={cn(
                'w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden',
                logoPreview ? 'border-primary' : 'border-border'
              )}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-4xl text-text-muted">+</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClickUpload}
              >
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                >
                  Remove
                </Button>
              )}
              <p className="text-sm text-text-muted">
                PNG, JPG, or GIF. Max 2MB.
              </p>
            </div>
          </div>
        </StepSection>

        {/* Company Details */}
        <StepSection title="Company Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormField
                label="Company Name"
                placeholder="Acme Septic Services"
                value={data.name}
                onChange={handleChange('name')}
                required
                error={!data.name ? '' : undefined}
              />
            </div>
            <div className="md:col-span-2">
              <FormField
                label="Street Address"
                placeholder="123 Main Street"
                value={data.address}
                onChange={handleChange('address')}
                required
              />
            </div>
            <FormField
              label="City"
              placeholder="Tampa"
              value={data.city}
              onChange={handleChange('city')}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  State <span className="text-danger">*</span>
                </label>
                <select
                  value={data.state}
                  onChange={handleChange('state')}
                  className={cn(
                    'flex h-10 w-full rounded-md border bg-bg-card px-3 py-2 text-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    'border-border'
                  )}
                >
                  <option value="">Select...</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <FormField
                label="ZIP Code"
                placeholder="33601"
                value={data.zipCode}
                onChange={handleChange('zipCode')}
                required
              />
            </div>
          </div>
        </StepSection>

        {/* Contact Info */}
        <StepSection title="Contact Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Phone Number"
              placeholder="(555) 123-4567"
              value={data.phone}
              onChange={handleChange('phone')}
              type="tel"
              required
            />
          </div>
        </StepSection>
      </div>
    </OnboardingStep>
  );
}
