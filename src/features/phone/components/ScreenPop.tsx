import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { useCustomerLookup } from "@/api/hooks/useDispatch";
import { useVoiceToText, VoiceMicButton } from "@/hooks/useVoiceToText";
import type { ActiveCall } from "@/hooks/useWebPhone";
import { cn, formatPhone } from "@/lib/utils.ts";
import {
  User, MapPin, Mail, Phone, Wrench, Calendar, Clock, FileText,
  ChevronDown, ChevronUp, Save, Plus, ExternalLink, Droplets,
  Mic, MicOff, X, UserPlus, Building, Tag, AlertCircle, CheckCircle,
  Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

interface ScreenPopProps {
  activeCall: ActiveCall | null;
  callDuration: number;
  onClose?: () => void;
}

interface QuickNotePayload {
  customer_id?: string;
  caller_number: string;
  direction: string;
  notes: string;
  disposition?: string;
}

// ── Quick Customer Form (for unknown callers) ─────────────────────

function QuickCustomerForm({
  phone,
  onCreated,
}: {
  phone: string;
  onCreated: (id: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("TX");
  const [zip, setZip] = useState("");
  const [leadSource, setLeadSource] = useState("phone");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const handleSave = async (asProspect = false) => {
    if (!firstName.trim() && !lastName.trim()) {
      setError("At least a first or last name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.post(
        asProspect ? "/prospects" : "/customers",
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone,
          email: email.trim() || null,
          address_line1: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          postal_code: zip.trim() || null,
          lead_source: leadSource,
          lead_notes: notes.trim() || null,
          customer_type: asProspect ? "prospect" : "residential",
        }
      );
      queryClient.invalidateQueries({ queryKey: ["dispatch", "customer-lookup"] });
      onCreated(data.id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        <input
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          placeholder="Zip"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <select
        value={leadSource}
        onChange={(e) => setLeadSource(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="phone">Phone Call</option>
        <option value="referral">Referral</option>
        <option value="website">Website</option>
        <option value="google">Google</option>
        <option value="facebook">Facebook</option>
        <option value="other">Other</option>
      </select>
      <textarea
        placeholder="Notes about this caller..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      />
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Save as Customer
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="px-3 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-bg-hover disabled:opacity-50 flex items-center gap-1.5"
        >
          <Tag className="w-4 h-4" />
          Prospect
        </button>
      </div>
    </div>
  );
}

// ── Live Call Notes with Voice-to-Text ────────────────────────────

function LiveCallNotes({
  callerId,
  direction,
  customerId,
}: {
  callerId: string;
  direction: string;
  customerId?: string;
}) {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    setTranscript,
  } = useVoiceToText({ continuous: true });

  const [manualNotes, setManualNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Combine voice transcript + manual notes
  const fullNotes = [transcript, manualNotes].filter(Boolean).join("\n").trim();

  const handleSave = async () => {
    if (!fullNotes) return;
    setSaving(true);
    try {
      await apiClient.post("/calls/quick-log", {
        customer_id: customerId || null,
        caller_number: callerId,
        direction,
        notes: fullNotes,
        disposition: "answered",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save call notes:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Call Notes
        </h4>
        <div className="flex items-center gap-1.5">
          <VoiceMicButton
            isListening={isListening}
            isSupported={isSupported}
            onClick={toggleListening}
            className="!p-1.5 text-xs"
          />
          {isListening && (
            <span className="text-[10px] text-red-500 font-medium animate-pulse">
              Listening...
            </span>
          )}
        </div>
      </div>

      {/* Voice transcript display */}
      {(transcript || interimTranscript) && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2.5 text-sm">
          <p className="text-text-primary text-xs">
            {transcript}
            {interimTranscript && (
              <span className="text-text-muted italic"> {interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Manual notes */}
      <textarea
        placeholder="Type notes here or use the mic..."
        value={manualNotes}
        onChange={(e) => setManualNotes(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={!fullNotes || saving}
          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {saved ? "Saved!" : "Save Notes"}
        </button>
        {transcript && (
          <button
            onClick={clearTranscript}
            className="px-2 py-1.5 text-xs text-text-muted hover:text-text-primary"
          >
            Clear voice
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Screen Pop Component ─────────────────────────────────────

export function ScreenPop({ activeCall, callDuration, onClose }: ScreenPopProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  const phone = activeCall?.remoteNumber ?? "";
  const lookup = useCustomerLookup(phone);
  const customer = lookup.data?.customer;
  const lastWo = lookup.data?.last_work_order;
  const found = lookup.data?.found || !!createdCustomerId;

  // Auto-expand when call starts
  useEffect(() => {
    if (activeCall) setExpanded(true);
  }, [activeCall]);

  if (!activeCall) return null;

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-bg-card border border-border rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-hover transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            found
              ? "bg-emerald-100 dark:bg-emerald-500/15"
              : "bg-amber-100 dark:bg-amber-500/15",
          )}>
            {found ? (
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {customer
                ? `${customer.first_name} ${customer.last_name}`
                : createdCustomerId
                  ? "New Customer Saved"
                  : "Unknown Caller"}
            </p>
            <p className="text-xs text-text-muted font-mono">
              {formatPhone(phone)}
              <span className="ml-2 text-text-secondary">{formatDur(callDuration)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Known Customer */}
          {customer && (
            <>
              {/* Contact Info */}
              <div className="space-y-1.5">
                {customer.address_line1 && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{customer.address_line1}{customer.city ? `, ${customer.city}` : ""}{customer.state ? ` ${customer.state}` : ""} {customer.postal_code || ""}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {(customer.system_type || customer.manufacturer) && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Droplets className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="capitalize">
                      {[customer.system_type, customer.manufacturer].filter(Boolean).join(" — ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Last Work Order */}
              {lastWo && (
                <div className="bg-bg-hover rounded-lg p-2.5">
                  <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">Last Service</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <Wrench className="w-3.5 h-3.5 text-text-muted" />
                    <span className="capitalize text-text-primary">{lastWo.job_type}</span>
                    {lastWo.scheduled_date && (
                      <span className="text-text-muted">{new Date(lastWo.scheduled_date).toLocaleDateString()}</span>
                    )}
                    <span className={cn(
                      "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      lastWo.status === "completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    )}>
                      {lastWo.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Profile
                </button>
                <button
                  onClick={() => navigate(`/work-orders/new?customer_id=${customer.id}`)}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Work Order
                </button>
              </div>
            </>
          )}

          {/* Unknown Caller — show quick create form */}
          {!customer && !createdCustomerId && (
            <div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  No customer found for this number
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Add their info below while you have them on the line.
                </p>
              </div>
              <QuickCustomerForm
                phone={phone}
                onCreated={(id) => setCreatedCustomerId(id)}
              />
            </div>
          )}

          {/* Customer just created */}
          {!customer && createdCustomerId && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Customer saved successfully!
              </p>
              <button
                onClick={() => navigate(`/customers/${createdCustomerId}`)}
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> View profile
              </button>
            </div>
          )}

          {/* Live Call Notes — always show during active call */}
          <LiveCallNotes
            callerId={phone}
            direction={activeCall.direction}
            customerId={customer?.id || createdCustomerId || undefined}
          />
        </div>
      )}
    </div>
  );
}
