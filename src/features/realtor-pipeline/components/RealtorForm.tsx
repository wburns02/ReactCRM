import { useState } from "react";
import { useRealtorStore } from "../store";
import type { RealtorAgent, RealtorStage, PreferredContact } from "../types";
import { REALTOR_STAGE_LABELS, REALTOR_STAGES } from "../types";
import { X, Save, User, Building2, Phone, Mail, MapPin } from "lucide-react";

interface RealtorFormProps {
  agent?: RealtorAgent | null;
  onClose: () => void;
}

export function RealtorForm({ agent, onClose }: RealtorFormProps) {
  const addAgent = useRealtorStore((s) => s.addAgent);
  const updateAgent = useRealtorStore((s) => s.updateAgent);

  const [firstName, setFirstName] = useState(agent?.first_name ?? "");
  const [lastName, setLastName] = useState(agent?.last_name ?? "");
  const [brokerage, setBrokerage] = useState(agent?.brokerage ?? "");
  const [licenseNumber, setLicenseNumber] = useState(agent?.license_number ?? "");
  const [phone, setPhone] = useState(agent?.phone ?? "");
  const [email, setEmail] = useState(agent?.email ?? "");
  const [cell, setCell] = useState(agent?.cell ?? "");
  const [preferredContact, setPreferredContact] = useState<PreferredContact>(
    agent?.preferred_contact ?? "call",
  );
  const [coverageArea, setCoverageArea] = useState(agent?.coverage_area ?? "");
  const [city, setCity] = useState(agent?.city ?? "");
  const [state, setState] = useState(agent?.state ?? "TN");
  const [zipCode, setZipCode] = useState(agent?.zip_code ?? "");
  const [stage, setStage] = useState<RealtorStage>(agent?.stage ?? "cold");
  const [currentInspector, setCurrentInspector] = useState(agent?.current_inspector ?? "");
  const [notes, setNotes] = useState(agent?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.first_name = "First name is required";
    if (!lastName.trim()) errs.last_name = "Last name is required";
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) errs.phone = "Valid phone number is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      brokerage: brokerage.trim() || null,
      license_number: licenseNumber.trim() || null,
      phone: phone.replace(/\D/g, ""),
      email: email.trim() || null,
      cell: cell.trim() || null,
      preferred_contact: preferredContact,
      coverage_area: coverageArea.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      zip_code: zipCode.trim() || null,
      stage,
      current_inspector: currentInspector.trim() || null,
      relationship_notes: null,
      last_call_date: null,
      last_call_duration: null,
      last_disposition: null,
      next_follow_up: null,
      last_referral_date: null,
      one_pager_sent_date: null,
      assigned_rep: null,
      priority: 50,
      notes: notes.trim() || null,
    };

    if (agent) {
      updateAgent(agent.id, data);
    } else {
      addAgent(data);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-bg-card z-10 rounded-t-xl">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {agent ? "Edit Agent" : "Add New Agent"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Identity */}
          <fieldset>
            <legend className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Identity
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="First Name"
                required
                error={errors.first_name}
              >
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Sarah"
                  className={inputClass(errors.first_name)}
                />
              </Field>
              <Field
                label="Last Name"
                required
                error={errors.last_name}
              >
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Johnson"
                  className={inputClass(errors.last_name)}
                />
              </Field>
              <Field label="Brokerage">
                <input
                  type="text"
                  value={brokerage}
                  onChange={(e) => setBrokerage(e.target.value)}
                  placeholder="Keller Williams, RE/MAX..."
                  className={inputClass()}
                />
              </Field>
              <Field label="License #">
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Optional"
                  className={inputClass()}
                />
              </Field>
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset>
            <legend className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Info
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Phone"
                required
                error={errors.phone}
              >
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="615-555-0123"
                  className={inputClass(errors.phone)}
                />
              </Field>
              <Field label="Cell">
                <input
                  type="tel"
                  value={cell}
                  onChange={(e) => setCell(e.target.value)}
                  placeholder="Optional secondary"
                  className={inputClass()}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@kw.com"
                  className={inputClass()}
                />
              </Field>
              <Field label="Preferred Contact">
                <select
                  value={preferredContact}
                  onChange={(e) => setPreferredContact(e.target.value as PreferredContact)}
                  className={inputClass()}
                >
                  <option value="call">Phone Call</option>
                  <option value="text">Text / SMS</option>
                  <option value="email">Email</option>
                </select>
              </Field>
            </div>
          </fieldset>

          {/* Location */}
          <fieldset>
            <legend className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Coverage Area
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Coverage Area">
                <input
                  type="text"
                  value={coverageArea}
                  onChange={(e) => setCoverageArea(e.target.value)}
                  placeholder="South Nashville, Williamson Co..."
                  className={inputClass()}
                />
              </Field>
              <Field label="City">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Nashville"
                  className={inputClass()}
                />
              </Field>
              <Field label="State">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={inputClass()}
                >
                  <option value="TN">Tennessee</option>
                  <option value="SC">South Carolina</option>
                  <option value="TX">Texas</option>
                </select>
              </Field>
              <Field label="Zip Code">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="37064"
                  className={inputClass()}
                />
              </Field>
            </div>
          </fieldset>

          {/* Pipeline */}
          <fieldset>
            <legend className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Pipeline
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Stage">
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as RealtorStage)}
                  className={inputClass()}
                >
                  {REALTOR_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {REALTOR_STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Current Inspector">
                <input
                  type="text"
                  value={currentInspector}
                  onChange={(e) => setCurrentInspector(e.target.value)}
                  placeholder="Who they currently use"
                  className={inputClass()}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything relevant about this agent..."
                    rows={3}
                    className={inputClass() + " resize-none"}
                  />
                </Field>
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <Save className="w-4 h-4" />
              {agent ? "Save Changes" : "Add Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputClass(error?: string): string {
  return `w-full px-3 py-2 rounded-lg border text-sm text-text-primary bg-bg-card placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 transition-colors ${
    error
      ? "border-red-400 focus:ring-red-300"
      : "border-border focus:ring-primary/30"
  }`;
}
