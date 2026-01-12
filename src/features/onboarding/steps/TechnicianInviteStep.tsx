/**
 * Enhanced Technician Step with Email Invites
 * Allows adding technicians with role assignment and email invites
 */
import { useState } from "react";
import { OnboardingStep, StepSection } from "../OnboardingStep";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface EnhancedTechnician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "technician" | "lead_technician" | "supervisor";
  skills: string[];
  certifications: string[];
  sendInvite: boolean;
}

export interface TechnicianInviteStepProps {
  technicians: EnhancedTechnician[];
  onAddTechnician: (technician: EnhancedTechnician) => void;
  onRemoveTechnician: (id: string) => void;
  onUpdateTechnician: (
    id: string,
    updates: Partial<EnhancedTechnician>,
  ) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const SKILLS = [
  { id: "pumping", label: "Septic Pumping", icon: "🚛" },
  { id: "inspection", label: "Inspection", icon: "🔍" },
  { id: "repair", label: "Repair", icon: "🔧" },
  { id: "installation", label: "Installation", icon: "🏗️" },
  { id: "maintenance", label: "Maintenance", icon: "⚙️" },
  { id: "emergency", label: "Emergency Service", icon: "🚨" },
  { id: "grease_trap", label: "Grease Trap", icon: "🍳" },
  { id: "lift_station", label: "Lift Station", icon: "⬆️" },
];

const CERTIFICATIONS = [
  { id: "septic_installer", label: "Licensed Septic Installer" },
  { id: "plumber", label: "Licensed Plumber" },
  { id: "cdl", label: "CDL Class B" },
  { id: "hazmat", label: "Hazmat Certified" },
  { id: "confined_space", label: "Confined Space Entry" },
  { id: "osha_10", label: "OSHA 10" },
  { id: "osha_30", label: "OSHA 30" },
  { id: "first_aid", label: "First Aid/CPR" },
];

const ROLES = [
  {
    value: "technician",
    label: "Technician",
    description: "Field service technician",
  },
  {
    value: "lead_technician",
    label: "Lead Technician",
    description: "Senior tech, can train others",
  },
  {
    value: "supervisor",
    label: "Supervisor",
    description: "Full access, can manage team",
  },
];

const EMPTY_FORM: Omit<EnhancedTechnician, "id"> = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "technician",
  skills: [],
  certifications: [],
  sendInvite: true,
};

export function TechnicianInviteStep({
  technicians,
  onAddTechnician,
  onRemoveTechnician,
  onUpdateTechnician: _onUpdateTechnician,
  onNext,
  onBack,
  onSkip,
}: TechnicianInviteStepProps) {
  // _onUpdateTechnician is available for future use when inline editing is added
  void _onUpdateTechnician;
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter((s) => s !== skillId)
        : [...prev.skills, skillId],
    }));
  };

  const toggleCertification = (certId: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(certId)
        ? prev.certifications.filter((c) => c !== certId)
        : [...prev.certifications, certId],
    }));
  };

  const handleAdd = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;

    onAddTechnician({
      ...formData,
      id: `tech-${Date.now()}`,
    });

    setFormData(EMPTY_FORM);
    setShowForm(false);
  };

  const isFormValid = formData.firstName.trim() && formData.lastName.trim();

  return (
    <OnboardingStep
      title="Add Your Team"
      description="Add technicians to your team. They'll receive an email invite to join."
      isOptional
      isValid
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="space-y-6">
        {/* Technician List */}
        {technicians.length > 0 && (
          <StepSection title={`Team Members (${technicians.length})`}>
            <div className="space-y-3">
              {technicians.map((tech) => (
                <Card key={tech.id} className="overflow-hidden">
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedTech(expandedTech === tech.id ? null : tech.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                          {tech.firstName[0]}
                          {tech.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {tech.firstName} {tech.lastName}
                          </p>
                          <p className="text-sm text-text-muted">
                            {tech.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            tech.role === "supervisor"
                              ? "warning"
                              : tech.role === "lead_technician"
                                ? "primary"
                                : "default"
                          }
                        >
                          {ROLES.find((r) => r.value === tech.role)?.label}
                        </Badge>
                        {tech.sendInvite && (
                          <Badge variant="outline" className="text-xs">
                            Invite pending
                          </Badge>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTechnician(tech.id);
                          }}
                          className="p-1 text-text-muted hover:text-danger"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedTech === tech.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-text-muted mb-1">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {tech.skills.length > 0 ? (
                              tech.skills.map((skillId) => (
                                <Badge
                                  key={skillId}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {SKILLS.find((s) => s.id === skillId)
                                    ?.label || skillId}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-text-muted">
                                None assigned
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-1">
                            Certifications
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tech.certifications.length > 0 ? (
                              tech.certifications.map((certId) => (
                                <Badge
                                  key={certId}
                                  variant="success"
                                  className="text-xs"
                                >
                                  {CERTIFICATIONS.find((c) => c.id === certId)
                                    ?.label || certId}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-text-muted">
                                None
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </StepSection>
        )}

        {/* Add Form */}
        {showForm ? (
          <StepSection title="Add Team Member">
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField
                  label="First Name"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  required
                />
                <FormField
                  label="Last Name"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  required
                />
                <FormField
                  label="Email"
                  type="email"
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                <FormField
                  label="Phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>

              {/* Role Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() =>
                        updateField(
                          "role",
                          role.value as EnhancedTechnician["role"],
                        )
                      }
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        formData.role === role.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <p className="font-medium text-sm">{role.label}</p>
                      <p className="text-xs text-text-muted">
                        {role.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm flex items-center gap-1 transition-colors",
                        formData.skills.includes(skill.id)
                          ? "bg-primary text-white"
                          : "bg-bg-muted text-text-secondary hover:bg-bg-hover",
                      )}
                    >
                      <span>{skill.icon}</span>
                      {skill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Certifications
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CERTIFICATIONS.map((cert) => (
                    <label
                      key={cert.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors",
                        formData.certifications.includes(cert.id)
                          ? "border-success bg-success/5"
                          : "border-border hover:border-success/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formData.certifications.includes(cert.id)}
                        onChange={() => toggleCertification(cert.id)}
                        className="rounded border-border"
                      />
                      <span className="text-sm">{cert.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Send Invite Toggle */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sendInvite}
                    onChange={(e) =>
                      updateField("sendInvite", e.target.checked)
                    }
                    className="rounded border-border"
                  />
                  <span className="text-sm">
                    Send email invite to join the team
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={!isFormValid}>
                  Add Team Member
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          </StepSection>
        ) : (
          <div className="text-center py-8">
            <Button onClick={() => setShowForm(true)}>+ Add Team Member</Button>
            <p className="text-sm text-text-muted mt-2">
              You can add more team members later from Admin Settings
            </p>
          </div>
        )}
      </div>
    </OnboardingStep>
  );
}

export default TechnicianInviteStep;
