import { useState, type ChangeEvent } from 'react';
import { OnboardingStep, StepSection } from '../OnboardingStep';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { OnboardingTechnician } from '../useOnboarding';

export interface AddTechniciansStepProps {
  technicians: OnboardingTechnician[];
  onAddTechnician: (technician: OnboardingTechnician) => void;
  onRemoveTechnician: (technicianId: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface TechnicianForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  skills: string[];
}

const EMPTY_FORM: TechnicianForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  skills: [],
};

const AVAILABLE_SKILLS = [
  { id: 'pumping', label: 'Pumping' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'repair', label: 'Repair' },
  { id: 'installation', label: 'Installation' },
  { id: 'grease_trap', label: 'Grease Trap' },
  { id: 'emergency', label: 'Emergency Response' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'diagnostics', label: 'Diagnostics' },
];

/**
 * Step 3: Add Technicians
 * Quick form to add technicians with basic info and skills
 */
export function AddTechniciansStep({
  technicians,
  onAddTechnician,
  onRemoveTechnician,
  onNext,
  onBack,
  onSkip,
}: AddTechniciansStepProps) {
  const [form, setForm] = useState<TechnicianForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(technicians.length === 0);

  const handleChange = (field: keyof TechnicianForm) => (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSkillToggle = (skillId: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter((s) => s !== skillId)
        : [...prev.skills, skillId],
    }));
  };

  const handleAddTechnician = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return;
    }

    const technician: OnboardingTechnician = {
      id: `tech-${Date.now()}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      skills: form.skills,
    };

    onAddTechnician(technician);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const isFormValid = form.firstName.trim() && form.lastName.trim();

  return (
    <OnboardingStep
      title="Add Technicians"
      description="Add your field technicians to start assigning work orders."
      isOptional
      isValid
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="space-y-8">
        {/* Add Technician Form */}
        {showForm ? (
          <StepSection title="New Technician">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="First Name"
                  placeholder="John"
                  value={form.firstName}
                  onChange={handleChange('firstName')}
                  required
                />
                <FormField
                  label="Last Name"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={handleChange('lastName')}
                  required
                />
                <FormField
                  label="Email"
                  type="email"
                  placeholder="john@company.com"
                  value={form.email}
                  onChange={handleChange('email')}
                />
                <FormField
                  label="Phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={handleChange('phone')}
                />
              </div>

              {/* Skills Selection */}
              <div className="mt-4">
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handleSkillToggle(skill.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        form.skills.includes(skill.id)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-bg-card text-text-primary border-border hover:border-primary'
                      )}
                    >
                      {skill.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  type="button"
                  onClick={handleAddTechnician}
                  disabled={!isFormValid}
                >
                  Add Technician
                </Button>
                {technicians.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          </StepSection>
        ) : (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(true)}
            >
              + Add Another Technician
            </Button>
          </div>
        )}

        {/* Technicians List */}
        {technicians.length > 0 && (
          <StepSection title={`Your Technicians (${technicians.length})`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {technicians.map((tech) => (
                <Card
                  key={tech.id}
                  className="p-4 relative group"
                >
                  <button
                    type="button"
                    onClick={() => onRemoveTechnician(tech.id)}
                    className="absolute top-2 right-2 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove technician"
                  >
                    X
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {tech.firstName[0]}{tech.lastName[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">
                        {tech.firstName} {tech.lastName}
                      </p>
                      {tech.email && (
                        <p className="text-sm text-text-muted truncate">{tech.email}</p>
                      )}
                      {tech.phone && (
                        <p className="text-sm text-text-muted">{tech.phone}</p>
                      )}
                      {tech.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tech.skills.map((skillId) => {
                            const skill = AVAILABLE_SKILLS.find((s) => s.id === skillId);
                            return (
                              <span
                                key={skillId}
                                className="text-xs px-2 py-0.5 bg-bg-muted rounded-full text-text-secondary"
                              >
                                {skill?.label || skillId}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </StepSection>
        )}

        {/* Empty State */}
        {technicians.length === 0 && !showForm && (
          <div className="text-center py-8">
            <p className="text-text-muted">No technicians added yet.</p>
          </div>
        )}
      </div>
    </OnboardingStep>
  );
}
