import { useState, useRef, useEffect } from "react";
import { useCustomerLookup, useQuickCreate } from "@/api/hooks/useDispatch";
import { useTechnicians } from "@/api/hooks/useTechnicians";
import { Zap, Mic, MicOff, Check, Plus, ChevronDown, ChevronUp, Phone } from "lucide-react";

const JOB_TYPES = ["pumping", "inspection", "repair", "installation", "maintenance"] as const;

export function CommandCenterPage() {
  const [phoneInput, setPhoneInput] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    first_name: "", last_name: "", phone: "", address_line1: "",
    city: "", state: "TX", postal_code: "",
  });
  const [jobType, setJobType] = useState<string>("pumping");
  const [techId, setTechId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [notifyTech, setNotifyTech] = useState(true);
  const [listening, setListening] = useState(false);
  const [successResult, setSuccessResult] = useState<{ work_order_number: string; sms_sent: boolean; technician_name: string } | null>(null);

  const phoneRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Auto-focus phone input
  useEffect(() => { phoneRef.current?.focus(); }, []);

  // Customer lookup
  const lookup = useCustomerLookup(phoneInput);
  const quickCreate = useQuickCreate();

  // Technicians
  const { data: techData } = useTechnicians({ active_only: true, page_size: 50 });
  const technicians = techData?.items ?? [];

  // Auto-select first tech (John is usually first)
  useEffect(() => {
    if (technicians.length > 0 && !techId) {
      setTechId(technicians[0].id);
    }
  }, [technicians, techId]);

  // Auto-select found customer
  useEffect(() => {
    if (lookup.data?.found && lookup.data.customer) {
      setSelectedCustomerId(lookup.data.customer.id);
      setShowNewCustomer(false);
    } else if (lookup.data && !lookup.data.found) {
      setSelectedCustomerId(null);
    }
  }, [lookup.data]);

  // Format phone for display
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Voice-to-text for notes
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      setNotes((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const handleSubmit = () => {
    const custId = selectedCustomerId;
    const newCust = !custId && showNewCustomer ? newCustomer : null;

    if (!custId && !newCust) return;
    if (!techId) return;

    quickCreate.mutate(
      {
        customer_id: custId,
        new_customer: newCust && newCust.first_name && newCust.last_name && newCust.phone ? newCust : null,
        job_type: jobType,
        scheduled_date: scheduledDate,
        technician_id: techId,
        notes: notes || undefined,
        notify_tech: notifyTech,
      },
      {
        onSuccess: (data) => {
          setSuccessResult({
            work_order_number: data.work_order_number,
            sms_sent: data.sms_sent,
            technician_name: data.technician_name,
          });
        },
      },
    );
  };

  const resetForm = () => {
    setPhoneInput("");
    setSelectedCustomerId(null);
    setShowNewCustomer(false);
    setNewCustomer({ first_name: "", last_name: "", phone: "", address_line1: "", city: "", state: "TX", postal_code: "" });
    setJobType("pumping");
    setNotes("");
    setNotifyTech(true);
    setSuccessResult(null);
    phoneRef.current?.focus();
  };

  const selectedTechName = technicians.find((t) => t.id === techId)
    ? `${technicians.find((t) => t.id === techId)!.first_name}`
    : "Tech";

  const canSubmit = (selectedCustomerId || (showNewCustomer && newCustomer.first_name && newCustomer.last_name && newCustomer.phone)) && techId;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg font-bold text-text-primary">Quick Dispatch</h1>
        </div>
        <span className="text-sm text-text-secondary">
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Success state */}
      {successResult && (
        <div className="rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800 dark:text-green-300">
              {successResult.work_order_number} created
            </span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-400">
            {successResult.sms_sent
              ? `SMS sent to ${successResult.technician_name}`
              : `Assigned to ${successResult.technician_name} (no SMS)`}
          </p>
          <button
            onClick={resetForm}
            className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold active:bg-green-700 touch-manipulation"
          >
            New Dispatch
          </button>
        </div>
      )}

      {!successResult && (
        <>
          {/* Phone input */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Phone # or name
            </label>
            <input
              ref={phoneRef}
              type="tel"
              inputMode="numeric"
              autoFocus
              value={formatPhone(phoneInput)}
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 text-lg rounded-xl border border-border bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Customer card */}
          {lookup.data?.found && lookup.data.customer && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="font-semibold text-text-primary">
                  {lookup.data.customer.first_name} {lookup.data.customer.last_name}
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                {lookup.data.customer.address_line1}
                {lookup.data.customer.city && `, ${lookup.data.customer.city}`}
                {lookup.data.customer.state && ` ${lookup.data.customer.state}`}
              </p>
              <div className="flex gap-3 text-xs text-text-secondary">
                {lookup.data.customer.system_type && (
                  <span className="capitalize">{lookup.data.customer.system_type}</span>
                )}
                {lookup.data.last_work_order?.scheduled_date && (
                  <span>Last: {new Date(lookup.data.last_work_order.scheduled_date).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          )}

          {/* No customer found + phone entered */}
          {lookup.data && !lookup.data.found && phoneInput.replace(/\D/g, "").length >= 10 && (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">No customer found for this number.</p>
              <button
                onClick={() => {
                  setShowNewCustomer(!showNewCustomer);
                  if (!showNewCustomer) setNewCustomer((p) => ({ ...p, phone: phoneInput }));
                }}
                className="flex items-center gap-1.5 text-sm font-medium text-primary active:text-primary/70 touch-manipulation"
              >
                {showNewCustomer ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showNewCustomer ? "Cancel" : "New Customer"}
              </button>
            </div>
          )}

          {/* New customer form */}
          {showNewCustomer && (
            <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="First name"
                  value={newCustomer.first_name}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, first_name: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  placeholder="Last name"
                  value={newCustomer.last_name}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, last_name: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <input
                placeholder="Phone"
                type="tel"
                inputMode="numeric"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                placeholder="Address"
                value={newCustomer.address_line1}
                onChange={(e) => setNewCustomer((p) => ({ ...p, address_line1: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="City"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, city: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  placeholder="State"
                  value={newCustomer.state}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, state: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  placeholder="ZIP"
                  value={newCustomer.postal_code}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, postal_code: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Job type pills */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Job Type</label>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map((jt) => (
                <button
                  key={jt}
                  onClick={() => setJobType(jt)}
                  className={`px-4 py-2 rounded-full text-sm font-medium capitalize touch-manipulation transition-colors ${
                    jobType === jt
                      ? "bg-primary text-white"
                      : "bg-bg-card border border-border text-text-secondary active:bg-bg-hover"
                  }`}
                >
                  {jt}
                </button>
              ))}
            </div>
          </div>

          {/* Technician picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Technician</label>
            <div className="flex flex-wrap gap-2">
              {technicians.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTechId(t.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium touch-manipulation transition-colors ${
                    techId === t.id
                      ? "bg-primary text-white"
                      : "bg-bg-card border border-border text-text-secondary active:bg-bg-hover"
                  }`}
                >
                  {t.first_name}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Notes with voice */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Notes</label>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Job notes..."
                rows={2}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-bg-card text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {"webkitSpeechRecognition" in window || "SpeechRecognition" in window ? (
                <button
                  onClick={toggleVoice}
                  className={`absolute right-2 top-2 p-2 rounded-lg touch-manipulation ${
                    listening ? "text-red-500 bg-red-50 dark:bg-red-950/30" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              ) : null}
            </div>
          </div>

          {/* Notify toggle */}
          <label className="flex items-center gap-3 py-1 touch-manipulation cursor-pointer">
            <input
              type="checkbox"
              checked={notifyTech}
              onChange={(e) => setNotifyTech(e.target.checked)}
              className="w-5 h-5 rounded accent-primary"
            />
            <span className="text-sm text-text-primary">
              Notify {selectedTechName} via SMS
            </span>
          </label>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || quickCreate.isPending}
            className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-base disabled:opacity-50 active:bg-primary/80 touch-manipulation transition-colors"
          >
            {quickCreate.isPending
              ? "Creating..."
              : `Create & Notify ${selectedTechName}`}
          </button>
        </>
      )}
    </div>
  );
}
