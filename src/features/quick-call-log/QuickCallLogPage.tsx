import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Plus,
  Clock,
  User,
  FileText,
  ChevronRight,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
}

interface QuickLogEntry {
  id: string;
  caller_number: string | null;
  direction: string | null;
  notes: string | null;
  call_disposition: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string | null;
}

const JOB_TYPES = [
  { value: "pumping", label: "Pumping" },
  { value: "inspection", label: "Inspection" },
  { value: "real_estate_inspection", label: "Real Estate Inspection" },
  { value: "repair", label: "Repair" },
  { value: "installation", label: "Installation" },
  { value: "emergency", label: "Emergency" },
  { value: "maintenance", label: "Maintenance" },
  { value: "grease_trap", label: "Grease Trap" },
];

export function QuickCallLogPage() {
  const queryClient = useQueryClient();
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [callerNumber, setCallerNumber] = useState("");
  const [direction, setDirection] = useState<"inbound" | "outbound">("inbound");
  const [notes, setNotes] = useState("");
  const [disposition, setDisposition] = useState("answered");
  const [createWO, setCreateWO] = useState(false);
  const [jobType, setJobType] = useState("pumping");
  const [showSearch, setShowSearch] = useState(false);

  // Customer search
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ["customer-search", customerSearch],
    queryFn: async () => {
      if (customerSearch.length < 2) return [];
      const { data } = await apiClient.get(
        `/customers/?search=${encodeURIComponent(customerSearch)}&page=1&page_size=8`
      );
      return (data.items || data.customers || data || []) as Customer[];
    },
    enabled: customerSearch.length >= 2 && showSearch,
    staleTime: 10_000,
  });

  // Recent logs
  const { data: recentLogs } = useQuery({
    queryKey: ["quick-call-logs"],
    queryFn: async () => {
      const { data } = await apiClient.get("/calls/recent-quick-logs?limit=15");
      return data.items as QuickLogEntry[];
    },
    staleTime: 15_000,
  });

  // Quick log mutation
  const logMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post("/calls/quick-log", payload);
      return data;
    },
    onSuccess: (data) => {
      const msg = data.work_order_number
        ? `Call logged & ${data.work_order_number} created`
        : "Call logged";
      toastSuccess(msg);
      queryClient.invalidateQueries({ queryKey: ["quick-call-logs"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      // Reset form
      setSelectedCustomer(null);
      setCustomerSearch("");
      setCallerNumber("");
      setNotes("");
      setCreateWO(false);
      setDisposition("answered");
      // Focus notes for next call
      setTimeout(() => notesRef.current?.focus(), 100);
    },
    onError: () => toastError("Failed to log call"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toastError("Please add notes about the call");
      return;
    }
    logMutation.mutate({
      customer_id: selectedCustomer?.id || null,
      caller_number: callerNumber || selectedCustomer?.phone || "",
      direction,
      notes: notes.trim(),
      disposition,
      create_work_order: createWO,
      work_order_job_type: createWO ? jobType : undefined,
      work_order_notes: createWO ? notes.trim() : undefined,
    });
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCallerNumber(c.phone || "");
    setCustomerSearch("");
    setShowSearch(false);
    notesRef.current?.focus();
  };

  // Auto-focus notes on mount
  useEffect(() => {
    notesRef.current?.focus();
  }, []);

  function formatPhone(p: string | null) {
    if (!p) return "";
    const d = p.replace(/\D/g, "");
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    return p;
  }

  function timeAgo(iso: string | null) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Quick Call Log</h1>
          <p className="text-sm text-text-secondary">
            Log calls, take notes, and create work orders in one place
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Call Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-bg-card border border-border rounded-xl p-6 space-y-5">
            {/* Customer Lookup */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Customer
              </label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatPhone(selectedCustomer.phone)}
                        {selectedCustomer.city && ` \u00b7 ${selectedCustomer.city}, ${selectedCustomer.state}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCallerNumber("");
                    }}
                    className="p-1 rounded hover:bg-bg-hover text-text-tertiary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or address..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowSearch(true);
                    }}
                    onFocus={() => setShowSearch(true)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary animate-spin" />
                  )}
                  {showSearch && searchResults && searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-bg-hover flex items-center gap-3 border-b border-border last:border-0"
                        >
                          <User className="w-4 h-4 text-text-tertiary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {c.first_name} {c.last_name}
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              {formatPhone(c.phone)}
                              {c.address_line1 && ` \u00b7 ${c.address_line1}`}
                              {c.city && `, ${c.city}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showSearch && customerSearch.length >= 2 && !searching && searchResults?.length === 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-bg-card border border-border rounded-lg shadow-lg p-4 text-center text-sm text-text-secondary">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Direction + Phone Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Direction
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection("inbound")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      direction === "inbound"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                        : "bg-bg-primary border-border text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    <PhoneIncoming className="w-4 h-4" />
                    Inbound
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("outbound")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      direction === "outbound"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                        : "bg-bg-primary border-border text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    <PhoneOutgoing className="w-4 h-4" />
                    Outbound
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="(555) 555-5555"
                  value={callerNumber}
                  onChange={(e) => setCallerNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            {/* Disposition */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Outcome
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "answered", label: "Answered", color: "emerald" },
                  { value: "voicemail", label: "Left VM", color: "amber" },
                  { value: "no_answer", label: "No Answer", color: "red" },
                  { value: "busy", label: "Busy", color: "orange" },
                  { value: "callback", label: "Callback", color: "blue" },
                ].map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDisposition(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      disposition === d.value
                        ? `bg-${d.color}-500/10 border-${d.color}-500/30 text-${d.color}-600`
                        : "bg-bg-primary border-border text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Call Notes <span className="text-danger">*</span>
              </label>
              <textarea
                ref={notesRef}
                placeholder="What did they call about? Key details, action items..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>

            {/* Create Work Order Toggle */}
            <div className="border border-border rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createWO}
                  onChange={(e) => setCreateWO(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Create Work Order
                  </p>
                  <p className="text-xs text-text-secondary">
                    Automatically create a draft work order from this call
                  </p>
                </div>
              </label>
              {createWO && (
                <div className="mt-3 pl-7">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Job Type
                  </label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {JOB_TYPES.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={logMutation.isPending || !notes.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-default"
            >
              {logMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {logMutation.isPending ? "Logging..." : "Log Call"}
            </button>
          </form>
        </div>

        {/* Right: Recent Call Log */}
        <div className="lg:col-span-1">
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-tertiary" />
              Recent Calls
            </h2>
            {!recentLogs || recentLogs.length === 0 ? (
              <p className="text-sm text-text-tertiary py-6 text-center">
                No calls logged yet. Start taking notes!
              </p>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-bg-hover hover:bg-bg-primary/80 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {log.direction === "outbound" ? (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-text-primary truncate">
                          {log.customer_name || formatPhone(log.caller_number) || "Unknown"}
                        </span>
                      </div>
                      <span className="text-xs text-text-tertiary whitespace-nowrap">
                        {timeAgo(log.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2 ml-5">
                      {log.notes}
                    </p>
                    {log.customer_id && (
                      <div className="mt-1.5 ml-5 flex gap-2">
                        <Link
                          to={`/customers/${log.customer_id}`}
                          className="text-xs text-primary hover:underline flex items-center gap-0.5"
                        >
                          View Customer <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
