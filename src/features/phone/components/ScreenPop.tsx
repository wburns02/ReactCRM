import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { useCustomerLookup } from "@/api/hooks/useDispatch";
import { useCustomer } from "@/api/hooks/useCustomers";
import { useWorkOrders } from "@/api/hooks/useWorkOrders";
import { useVoiceToText, VoiceMicButton } from "@/hooks/useVoiceToText";
import type { ActiveCall } from "@/hooks/useWebPhone";
import { cn, formatPhone } from "@/lib/utils.ts";
import {
  User, MapPin, Mail, Phone, Wrench, Calendar, Clock, FileText,
  ChevronDown, ChevronUp, Save, Plus, ExternalLink, Droplets,
  UserPlus, Tag, AlertCircle, CheckCircle, Loader2,
  DollarSign, Shield, Home, Truck, Hash, Star, ArrowRight,
  PhoneIncoming, PhoneOutgoing, CreditCard, ClipboardList,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

interface ScreenPopProps {
  activeCall: ActiveCall | null;
  callDuration: number;
}

// ── Helpers ───────────────────────────────────────────────────────

function formatDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function timeAgo(date: string | null) {
  if (!date) return "N/A";
  const d = new Date(date);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}yr ago`;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return colors[status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
}

// ── Section Component ─────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wide hover:bg-bg-hover transition-colors"
      >
        <Icon className="w-3.5 h-3.5" />
        {title}
        <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, className }: {
  icon?: any;
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={cn("flex items-start gap-2 py-1", className)}>
      {Icon && <Icon className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <span className="text-[10px] text-text-muted block">{label}</span>
        <span className="text-xs text-text-primary">{value}</span>
      </div>
    </div>
  );
}

// ── Quick Customer Form ───────────────────────────────────────────

function QuickCustomerForm({ phone, onCreated }: { phone: string; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", address: "",
    city: "", state: "TX", zip: "", leadSource: "phone", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async (asProspect = false) => {
    if (!form.firstName.trim() && !form.lastName.trim()) { setError("Name required"); return; }
    setSaving(true); setError("");
    try {
      const { data } = await apiClient.post(asProspect ? "/prospects" : "/customers", {
        first_name: form.firstName.trim(), last_name: form.lastName.trim(),
        phone, email: form.email.trim() || null,
        address_line1: form.address.trim() || null, city: form.city.trim() || null,
        state: form.state.trim() || null, postal_code: form.zip.trim() || null,
        lead_source: form.leadSource, lead_notes: form.notes.trim() || null,
        customer_type: asProspect ? "prospect" : "residential",
      });
      queryClient.invalidateQueries({ queryKey: ["dispatch", "customer-lookup"] });
      onCreated(data.id);
    } catch (err: any) { setError(err?.response?.data?.detail || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2 px-4 pb-3">
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="First Name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
        <input placeholder="Last Name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <input placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
      <input placeholder="Address" value={form.address} onChange={(e) => set("address", e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
      <div className="grid grid-cols-3 gap-2">
        <input placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} className="px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
        <input placeholder="State" value={form.state} onChange={(e) => set("state", e.target.value)} className="px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
        <input placeholder="Zip" value={form.zip} onChange={(e) => set("zip", e.target.value)} className="px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <select value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs focus:outline-none focus:ring-1 focus:ring-primary">
        <option value="phone">Phone Call</option><option value="referral">Referral</option>
        <option value="website">Website</option><option value="google">Google</option>
        <option value="facebook">Facebook</option><option value="other">Other</option>
      </select>
      <textarea placeholder="Notes..." value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg-body text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
      {error && <p className="text-[10px] text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => handleSave(false)} disabled={saving} className="flex-1 px-2 py-1.5 rounded-md bg-primary text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />} Save Customer
        </button>
        <button onClick={() => handleSave(true)} disabled={saving} className="px-2 py-1.5 rounded-md border border-border text-xs disabled:opacity-50 flex items-center gap-1">
          <Tag className="w-3 h-3" /> Prospect
        </button>
      </div>
    </div>
  );
}

// ── Main Screen Pop ───────────────────────────────────────────────

export function ScreenPop({ activeCall, callDuration }: ScreenPopProps) {
  const navigate = useNavigate();
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [manualNotes, setManualNotes] = useState("");

  const phone = activeCall?.remoteNumber ?? "";
  const lookup = useCustomerLookup(phone);
  const customerId = lookup.data?.customer?.id || createdCustomerId;

  // Full customer detail — loads after lookup finds a match
  const { data: fullCustomer } = useCustomer(customerId || undefined);

  // Work order history for this customer
  const { data: woData } = useWorkOrders(
    customerId ? { customer_id: customerId, page_size: 10 } : {}
  );
  const workOrders = woData?.items || [];

  // Voice-to-text for auto notes
  const {
    isSupported, isListening, transcript, interimTranscript,
    startListening, stopListening, toggleListening, clearTranscript,
  } = useVoiceToText({ continuous: true });

  // Auto-start voice transcription when call becomes active
  useEffect(() => {
    if (activeCall && isSupported && !isListening) {
      // Small delay to not conflict with mic permission for WebRTC
      const t = setTimeout(() => startListening(), 2000);
      return () => clearTimeout(t);
    }
  }, [activeCall?.remoteNumber]);

  // Auto-stop when call ends
  useEffect(() => {
    if (!activeCall && isListening) stopListening();
  }, [activeCall]);

  // Save notes
  const handleSaveNotes = async () => {
    const fullNotes = [transcript, manualNotes].filter(Boolean).join("\n").trim();
    if (!fullNotes) return;
    setNoteSaving(true);
    try {
      await apiClient.post("/calls/quick-log", {
        customer_id: customerId || null,
        caller_number: phone,
        direction: activeCall?.direction || "inbound",
        notes: fullNotes,
        disposition: "answered",
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 3000);
    } catch (err) { console.error("Failed to save notes:", err); }
    finally { setNoteSaving(false); }
  };

  if (!activeCall) return null;

  const customer = fullCustomer || lookup.data?.customer;
  const lastWo = lookup.data?.last_work_order;
  const found = !!customer;

  // Calculate customer tenure
  const tenure = fullCustomer?.created_at
    ? timeAgo(fullCustomer.created_at)
    : null;

  // System age
  const systemAge = fullCustomer?.system_issued_date
    ? timeAgo(fullCustomer.system_issued_date)
    : null;

  return (
    <div className="h-full flex flex-col bg-bg-card overflow-hidden">
      {/* Header — call info bar */}
      <div className={cn(
        "flex-shrink-0 px-4 py-3 border-b border-border",
        found ? "bg-emerald-500/5" : "bg-amber-500/5",
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            found ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-amber-100 dark:bg-amber-500/15",
          )}>
            {found ? <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text-primary truncate">
              {customer ? `${(customer as any).first_name} ${(customer as any).last_name}` : "New Caller"}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="font-mono">{formatPhone(phone)}</span>
              <span className="text-primary font-semibold">{formatDur(callDuration)}</span>
              {isListening && <span className="text-red-500 animate-pulse">REC</span>}
            </div>
          </div>
          {found && (
            <button
              onClick={() => navigate(`/customers/${customerId}`)}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-primary transition-colors"
              title="Open full profile"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Known Customer — full workup */}
        {found && customer && (
          <>
            {/* Contact & Property Info */}
            <Section title="Contact & Property" icon={Home} defaultOpen={true}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                <InfoRow icon={MapPin} label="Address" value={
                  [(customer as any).address_line1, (customer as any).city, (customer as any).state, (customer as any).postal_code]
                    .filter(Boolean).join(", ") || null
                } />
                <InfoRow icon={Mail} label="Email" value={(customer as any).email} />
                <InfoRow icon={Phone} label="Phone" value={(customer as any).phone} />
                <InfoRow icon={Tag} label="Type" value={fullCustomer?.customer_type} />
                {fullCustomer?.lead_source && (
                  <InfoRow icon={Star} label="Lead Source" value={fullCustomer.lead_source} />
                )}
                {tenure && <InfoRow icon={Calendar} label="Customer Since" value={tenure} />}
              </div>
            </Section>

            {/* Septic System */}
            <Section title="Septic System" icon={Droplets} defaultOpen={true}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                <InfoRow icon={Wrench} label="System Type" value={(customer as any).system_type} />
                <InfoRow icon={Shield} label="Manufacturer" value={(customer as any).manufacturer} />
                {fullCustomer?.tank_size_gallons && (
                  <InfoRow icon={Hash} label="Tank Size" value={`${fullCustomer.tank_size_gallons} gal`} />
                )}
                {fullCustomer?.number_of_tanks && (
                  <InfoRow icon={Hash} label="# Tanks" value={String(fullCustomer.number_of_tanks)} />
                )}
                {fullCustomer?.installer_name && (
                  <InfoRow icon={Truck} label="Installer" value={fullCustomer.installer_name} />
                )}
                {systemAge && <InfoRow icon={Calendar} label="System Age" value={systemAge} />}
              </div>
              {!((customer as any).system_type || (customer as any).manufacturer) && (
                <p className="text-[10px] text-text-muted italic py-1">No system info on file</p>
              )}
            </Section>

            {/* Work Order History */}
            <Section title={`Work Orders (${workOrders.length})`} icon={ClipboardList} defaultOpen={true}>
              {workOrders.length === 0 && lastWo && (
                <div className="flex items-center gap-2 py-1.5 text-xs">
                  <Wrench className="w-3.5 h-3.5 text-text-muted" />
                  <span className="capitalize">{lastWo.job_type}</span>
                  <span className="text-text-muted">{lastWo.scheduled_date ? new Date(lastWo.scheduled_date).toLocaleDateString() : ""}</span>
                  <span className={cn("ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusBadge(lastWo.status || ""))}>{lastWo.status}</span>
                </div>
              )}
              {workOrders.length > 0 && (
                <div className="space-y-1">
                  {workOrders.slice(0, 5).map((wo: any) => (
                    <button
                      key={wo.id}
                      onClick={() => navigate(`/work-orders/${wo.id}`)}
                      className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-xs hover:bg-bg-hover transition-colors text-left"
                    >
                      <Wrench className="w-3 h-3 text-text-muted flex-shrink-0" />
                      <span className="capitalize flex-1 truncate">{wo.job_type}</span>
                      <span className="text-text-muted text-[10px]">
                        {wo.scheduled_date ? timeAgo(wo.scheduled_date) : ""}
                      </span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusBadge(wo.status || ""))}>
                        {wo.status}
                      </span>
                    </button>
                  ))}
                  {workOrders.length > 5 && (
                    <p className="text-[10px] text-text-muted text-center">+{workOrders.length - 5} more</p>
                  )}
                </div>
              )}
              {workOrders.length === 0 && !lastWo && (
                <p className="text-[10px] text-text-muted italic py-1">No work orders on file</p>
              )}
            </Section>

            {/* Billing */}
            {fullCustomer?.default_payment_terms && (
              <Section title="Billing" icon={CreditCard} defaultOpen={false}>
                <InfoRow icon={DollarSign} label="Payment Terms" value={fullCustomer.default_payment_terms} />
                {fullCustomer?.quickbooks_customer_id && (
                  <InfoRow icon={Hash} label="QuickBooks ID" value={fullCustomer.quickbooks_customer_id} />
                )}
              </Section>
            )}

            {/* Quick Actions */}
            <div className="px-4 py-3 border-b border-border">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/work-orders/new?customer_id=${customerId}`)}
                  className="px-2 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> New Work Order
                </button>
                <button
                  onClick={() => navigate(`/customers/${customerId}`)}
                  className="px-2 py-2 rounded-lg border border-border text-xs font-medium hover:bg-bg-hover flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full Profile
                </button>
              </div>
            </div>
          </>
        )}

        {/* Unknown Caller */}
        {!found && !createdCustomerId && (
          <>
            <div className="px-4 pt-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-2">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> No customer found
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">Add their info while on the call.</p>
              </div>
            </div>
            <QuickCustomerForm phone={phone} onCreated={setCreatedCustomerId} />
          </>
        )}

        {/* Just created */}
        {!found && createdCustomerId && (
          <div className="px-4 py-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Customer saved!
              </p>
              <button onClick={() => navigate(`/customers/${createdCustomerId}`)} className="mt-1.5 text-xs text-primary hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> View profile
              </button>
            </div>
          </div>
        )}

        {/* Call Notes — ALWAYS visible */}
        <Section title="Call Notes" icon={FileText} defaultOpen={true}>
          {/* Voice transcript */}
          {(transcript || interimTranscript) && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 mb-2 text-xs">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">Auto-Transcript</span>
                {isListening && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              </div>
              <p className="text-text-primary leading-relaxed">
                {transcript}
                {interimTranscript && <span className="text-text-muted italic"> {interimTranscript}</span>}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <VoiceMicButton
              isListening={isListening}
              isSupported={isSupported}
              onClick={toggleListening}
              className="!p-1.5 text-xs"
            />
            <span className="text-[10px] text-text-muted">
              {isListening ? "Transcribing..." : isSupported ? "Click mic to transcribe" : "Voice not supported"}
            </span>
            {transcript && (
              <button onClick={clearTranscript} className="ml-auto text-[10px] text-text-muted hover:text-text-primary">Clear</button>
            )}
          </div>

          <textarea
            placeholder="Type additional notes..."
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            rows={3}
            className="w-full px-2.5 py-2 rounded-md border border-border bg-bg-body text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSaveNotes}
              disabled={(!transcript && !manualNotes) || noteSaving}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5"
            >
              {noteSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : noteSaved ? <CheckCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {noteSaved ? "Saved!" : "Save Notes"}
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
