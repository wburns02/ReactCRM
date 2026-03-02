import { useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Wrench,
  FileText,
  Clock,
  User,
  Building2,
  Calendar,
  Hash,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CALL_STATUS_CONFIG, ZONE_CONFIG, type CampaignContact, type ContactCallStatus } from "../types";

interface ContactScreenPopProps {
  contact: CampaignContact;
  onClose: () => void;
  /** If true, renders as a floating panel instead of a full modal overlay */
  inline?: boolean;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="w-3.5 h-3.5 text-text-tertiary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</div>
        <div className="text-sm text-text-primary break-words">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 px-1 text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && <div className="pb-2 px-1">{children}</div>}
    </div>
  );
}

export function ContactScreenPop({ contact, onClose, inline }: ContactScreenPopProps) {
  const zc = contact.service_zone ? ZONE_CONFIG[contact.service_zone] : null;
  const statusConf = CALL_STATUS_CONFIG[contact.call_status];

  const formatPhone = (digits: string) => {
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return digits;
  };

  const content = (
    <div className={`bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden ${inline ? "max-h-[70vh] overflow-y-auto" : ""}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-4 py-3 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text-primary truncate">
              {contact.account_name}
            </h3>
            {contact.company && (
              <div className="flex items-center gap-1 text-sm text-text-secondary">
                <Building2 className="w-3 h-3" />
                {contact.company}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {zc && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${zc.color}`}>
                  {contact.service_zone}
                </span>
              )}
              {contact.customer_type && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-text-secondary">
                  {contact.customer_type}
                </span>
              )}
              {statusConf && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${statusConf.color}`}>
                  {statusConf.icon} {statusConf.label}
                </span>
              )}
              {contact.call_priority_label && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  {contact.call_priority_label}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-2">
        {/* Contact Info */}
        <Section title="Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <InfoRow icon={Phone} label="Phone" value={formatPhone(contact.phone)} />
            <InfoRow icon={Mail} label="Email" value={contact.email} />
            <InfoRow icon={MapPin} label="Address" value={contact.address} />
            <InfoRow icon={Hash} label="Zip Code" value={contact.zip_code} />
            <InfoRow icon={User} label="Account #" value={contact.account_number} />
          </div>
        </Section>

        {/* Equipment & Contract */}
        <Section title="Equipment & Contract">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <InfoRow icon={Wrench} label="System Type" value={contact.system_type} />
            <InfoRow icon={FileText} label="Contract Type" value={contact.contract_type} />
            <InfoRow icon={FileText} label="Contract Status" value={contact.contract_status} />
            <InfoRow icon={Calendar} label="Contract Start" value={contact.contract_start} />
            <InfoRow icon={Calendar} label="Contract End" value={contact.contract_end} />
            {contact.contract_value != null && contact.contract_value > 0 && (
              <InfoRow icon={Hash} label="Contract Value" value={`$${contact.contract_value.toLocaleString()}`} />
            )}
          </div>
        </Section>

        {/* Call History */}
        <Section title="Call History" defaultOpen={contact.call_attempts > 0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <InfoRow icon={Phone} label="Attempts" value={contact.call_attempts > 0 ? contact.call_attempts : null} />
            <InfoRow
              icon={Clock}
              label="Last Call"
              value={contact.last_call_date ? new Date(contact.last_call_date).toLocaleString() : null}
            />
            <InfoRow
              icon={Clock}
              label="Duration"
              value={contact.last_call_duration ? `${Math.floor(contact.last_call_duration / 60)}m ${contact.last_call_duration % 60}s` : null}
            />
            {contact.last_disposition && (
              <InfoRow
                icon={FileText}
                label="Last Disposition"
                value={CALL_STATUS_CONFIG[contact.last_disposition as ContactCallStatus]?.label ?? contact.last_disposition}
              />
            )}
            <InfoRow icon={Calendar} label="Callback Date" value={contact.callback_date} />
            <InfoRow icon={User} label="Assigned Rep" value={contact.assigned_rep} />
          </div>
        </Section>

        {/* Notes */}
        {contact.notes && (
          <Section title="Notes">
            <div className="text-sm text-text-primary whitespace-pre-wrap bg-bg-hover rounded-lg p-3">
              {contact.notes}
            </div>
          </Section>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  // Full modal overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {content}
      </div>
    </div>
  );
}
