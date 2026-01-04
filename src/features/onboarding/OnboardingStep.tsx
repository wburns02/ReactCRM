import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface OnboardingStepProps {
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Step content */
  children: ReactNode;
  /** Whether the step is optional */
  isOptional?: boolean;
  /** Whether the step is valid/complete */
  isValid?: boolean;
  /** Whether this is the first step */
  isFirstStep?: boolean;
  /** Whether this is the last step */
  isLastStep?: boolean;
  /** Whether this is the completion step */
  isCompleteStep?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Navigate to next step */
  onNext?: () => void;
  /** Navigate to previous step */
  onBack?: () => void;
  /** Skip this step */
  onSkip?: () => void;
  /** Custom next button text */
  nextButtonText?: string;
  /** Custom back button text */
  backButtonText?: string;
  /** Additional class name */
  className?: string;
}

/**
 * Reusable wrapper component for onboarding wizard steps
 * Provides consistent layout, navigation, and validation handling
 */
export function OnboardingStep({
  title,
  description,
  children,
  isOptional = false,
  isValid = true,
  isFirstStep = false,
  isLastStep = false,
  isCompleteStep = false,
  isLoading = false,
  onNext,
  onBack,
  onSkip,
  nextButtonText,
  backButtonText,
  className,
}: OnboardingStepProps) {
  // Determine button text based on step position
  const nextText = nextButtonText || (isLastStep ? 'Finish' : 'Continue');
  const backText = backButtonText || 'Back';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
          {isOptional && (
            <span className="text-xs font-medium text-text-muted bg-bg-muted px-2 py-0.5 rounded-full">
              Optional
            </span>
          )}
        </div>
        <p className="text-text-secondary">{description}</p>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto min-h-0">{children}</div>

      {/* Navigation Buttons */}
      {!isCompleteStep && (
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
          <div>
            {!isFirstStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                disabled={isLoading}
              >
                {backText}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isOptional && !isLastStep && (
              <Button
                type="button"
                variant="secondary"
                onClick={onSkip}
                disabled={isLoading}
              >
                Skip for now
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={onNext}
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'Saving...' : nextText}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Step content section wrapper for consistent spacing
 */
export function StepSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
