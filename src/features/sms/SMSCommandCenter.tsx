import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
} from "@/components/ui/Dialog";
import {
  useSendSMS,
  useSendBulkSMS,
  useSearchCustomersForSMS,
  type SMSCustomer,
  type BulkSMSResponse,
} from "@/api/hooks/useSMS";
import { toastError, toastSuccess } from "@/components/ui/Toast";

// ── Icons (inline SVG for zero deps) ──────────────────────────────────

function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function IconUser({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function IconUsers({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function IconSend({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
function IconX({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconPhone({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
function IconMegaphone({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

// ── Types ──────────────────────────────────────────────────────────────

type SendMode = "single" | "group" | "mass";

interface SMSCommandCenterProps {
  open: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultCustomerId?: string;
  defaultCustomerName?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function personalizePreview(template: string, customer: SMSCustomer): string {
  return template
    .replace(/\{\{customer_name\}\}/g, customer.name || "Customer")
    .replace(/\{\{first_name\}\}/g, customer.first_name || "Customer")
    .replace(/\{\{last_name\}\}/g, customer.last_name || "");
}

// ── Main Component ────────────────────────────────────────────────────

export function SMSCommandCenter({
  open,
  onClose,
  defaultPhone = "",
  defaultCustomerId,
  defaultCustomerName,
}: SMSCommandCenterProps) {
  // ── State ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<SendMode>("single");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<SMSCustomer[]>([]);
  const [manualPhone, setManualPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkSMSResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState<SMSCustomer | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // ── Queries ───────────────────────────────────────────────────────
  const { data: customerData, isLoading: isSearching } = useSearchCustomersForSMS(
    searchQuery,
    1,
    50,
  );
  const sendSMS = useSendSMS();
  const sendBulkSMS = useSendBulkSMS();

  const customers = customerData?.items || [];

  // Filter out already selected
  const filteredCustomers = useMemo(() => {
    const selectedIds = new Set(selectedCustomers.map((c) => c.id));
    return customers.filter((c) => !selectedIds.has(c.id));
  }, [customers, selectedCustomers]);

  // ── Handlers ──────────────────────────────────────────────────────

  const handleSelectCustomer = useCallback(
    (customer: SMSCustomer) => {
      if (mode === "single") {
        setSelectedCustomers([customer]);
        setManualPhone(customer.phone);
      } else {
        setSelectedCustomers((prev) => [...prev, customer]);
      }
      setSearchQuery("");
      messageRef.current?.focus();
    },
    [mode],
  );

  const handleRemoveCustomer = useCallback((customerId: string) => {
    setSelectedCustomers((prev) => prev.filter((c) => c.id !== customerId));
  }, []);

  const handleSelectAll = useCallback(() => {
    const selectedIds = new Set(selectedCustomers.map((c) => c.id));
    const newCustomers = customers.filter((c) => !selectedIds.has(c.id));
    setSelectedCustomers((prev) => [...prev, ...newCustomers]);
  }, [customers, selectedCustomers]);

  const handleClearAll = useCallback(() => {
    setSelectedCustomers([]);
  }, []);

  const insertVariable = useCallback(
    (variable: string) => {
      const textarea = messageRef.current;
      if (!textarea) {
        setMessage((prev) => prev + variable);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMsg = message.substring(0, start) + variable + message.substring(end);
      setMessage(newMsg);
      // Restore cursor position after variable
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    },
    [message],
  );

  const handleSend = async () => {
    if (!message.trim()) {
      toastError("Please enter a message");
      return;
    }

    setIsSending(true);
    setBulkResult(null);

    try {
      if (mode === "single") {
        const phone = selectedCustomers[0]?.phone || manualPhone;
        if (!phone) {
          toastError("Please select a customer or enter a phone number");
          setIsSending(false);
          return;
        }
        await sendSMS.mutateAsync({
          to_phone: phone,
          message: message,
          customer_id: selectedCustomers[0]?.id,
        });
        toastSuccess("SMS sent successfully!");
        handleReset();
        onClose();
      } else {
        // Group or mass mode
        if (selectedCustomers.length === 0) {
          toastError("Please select at least one customer");
          setIsSending(false);
          return;
        }
        const result = await sendBulkSMS.mutateAsync({
          customer_ids: selectedCustomers.map((c) => c.id),
          message: message,
        });
        setBulkResult(result);
        if (result.sent > 0) {
          toastSuccess(`${result.sent} SMS sent successfully!`);
        }
        if (result.failed > 0) {
          toastError(`${result.failed} SMS failed to send`);
        }
      }
    } catch (error) {
      toastError("Failed to send SMS. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    setSelectedCustomers([]);
    setManualPhone("");
    setMessage("");
    setBulkResult(null);
    setPreviewCustomer(null);
    setSearchQuery("");
  };

  const handleModeChange = (newMode: SendMode) => {
    setMode(newMode);
    setBulkResult(null);
    if (newMode === "single" && selectedCustomers.length > 1) {
      setSelectedCustomers(selectedCustomers.slice(0, 1));
    }
  };

  // Reset on open
  useEffect(() => {
    if (open) {
      handleReset();
      if (defaultPhone) setManualPhone(defaultPhone);
      setMode("single");
    }
  }, [open]);

  // Set preview customer for template personalization
  useEffect(() => {
    if (selectedCustomers.length > 0) {
      setPreviewCustomer(selectedCustomers[0]);
    } else {
      setPreviewCustomer(null);
    }
  }, [selectedCustomers]);

  // ── Computed ──────────────────────────────────────────────────────
  const charCount = message.length;
  const segmentCount = Math.ceil(charCount / 160) || 0;
  const hasTemplateVars = message.includes("{{");
  const canSend =
    message.trim().length > 0 &&
    (mode === "single"
      ? selectedCustomers.length === 1 || manualPhone.replace(/\D/g, "").length >= 10
      : selectedCustomers.length > 0);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="2xl">
        <DialogHeader onClose={onClose}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <IconSend className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-text-primary">SMS Command Center</span>
              <p className="text-xs text-text-muted font-normal mt-0.5">
                Send individual, group, or mass text messages
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {/* ── If showing bulk results ──────────────────────────── */}
          {bulkResult ? (
            <BulkResultsPanel
              result={bulkResult}
              onClose={() => {
                handleReset();
                onClose();
              }}
              onSendMore={handleReset}
            />
          ) : (
            <div className="space-y-4">
              {/* ── Mode Tabs ────────────────────────────────────── */}
              <div className="flex gap-1 p-1 bg-bg-muted rounded-xl">
                {(
                  [
                    { key: "single", label: "Single", icon: IconUser, desc: "One recipient" },
                    { key: "group", label: "Group", icon: IconUsers, desc: "Same message" },
                    { key: "mass", label: "Mass", icon: IconMegaphone, desc: "Personalized" },
                  ] as const
                ).map(({ key, label, icon: Icon, desc }) => (
                  <button
                    key={key}
                    onClick={() => handleModeChange(key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                      mode === key
                        ? "bg-bg-card text-text-primary shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    <span className="hidden sm:inline text-xs font-normal opacity-60">
                      {desc}
                    </span>
                  </button>
                ))}
              </div>

              {/* ── Mode description ─────────────────────────────── */}
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {mode === "single" && "Send a message to one customer. Search and select, or enter a phone number manually."}
                  {mode === "group" && "Send the same message to multiple customers at once. Select recipients below."}
                  {mode === "mass" && (
                    <>
                      Send personalized messages using template variables. Use{" "}
                      <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-500/20 rounded text-xs font-mono">
                        {"{{first_name}}"}
                      </code>{" "}
                      to personalize each SMS.
                    </>
                  )}
                </p>
              </div>

              {/* ── Two-column layout ────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ── LEFT: Customer Selection ─────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                      <IconUsers className="w-4 h-4 text-text-muted" />
                      Recipients
                      {selectedCustomers.length > 0 && (
                        <Badge variant="primary" size="sm">
                          {selectedCustomers.length}
                        </Badge>
                      )}
                    </h3>
                    {mode !== "single" && selectedCustomers.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-xs text-text-muted hover:text-danger transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search customers by name, phone, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Selected chips */}
                  {selectedCustomers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-bg-muted rounded-lg">
                      {selectedCustomers.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                        >
                          {c.name || c.phone}
                          <button
                            onClick={() => handleRemoveCustomer(c.id)}
                            className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                          >
                            <IconX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Customer results */}
                  <div className="border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-6 flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                        <p className="text-xs text-text-muted">Searching...</p>
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="p-6 text-center">
                        <IconUser className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                        <p className="text-sm text-text-muted">
                          {searchQuery
                            ? "No customers found"
                            : "Type to search customers"}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Select all for group/mass modes */}
                        {mode !== "single" && filteredCustomers.length > 1 && (
                          <button
                            onClick={handleSelectAll}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 border-b border-border transition-colors"
                          >
                            <IconCheck className="w-3.5 h-3.5" />
                            Select all {filteredCustomers.length} results
                          </button>
                        )}
                        <div className="divide-y divide-border">
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-hover transition-colors text-left"
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${getAvatarColor(customer.name)}`}
                              >
                                {getInitials(customer.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                  {customer.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-text-muted">
                                  <span className="flex items-center gap-0.5">
                                    <IconPhone className="w-3 h-3" />
                                    {customer.phone}
                                  </span>
                                  {customer.city && (
                                    <span>{customer.city}, {customer.state}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Manual phone for single mode */}
                  {mode === "single" && selectedCustomers.length === 0 && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Or enter phone number manually
                      </label>
                      <div className="relative">
                        <IconPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <Input
                          value={manualPhone}
                          onChange={(e) => setManualPhone(formatPhone(e.target.value))}
                          placeholder="(555) 123-4567"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RIGHT: Message Compose ───────────────────── */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <IconSend className="w-4 h-4 text-text-muted" />
                    Compose Message
                  </h3>

                  {/* Template variables (mass mode) */}
                  {mode === "mass" && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-text-muted mr-1">Insert:</span>
                      {[
                        { label: "Name", value: "{{customer_name}}" },
                        { label: "First", value: "{{first_name}}" },
                        { label: "Last", value: "{{last_name}}" },
                      ].map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => insertVariable(value)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 rounded-md hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Textarea */}
                  <div>
                    <textarea
                      ref={messageRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      maxLength={1600}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-bg-card text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      placeholder={
                        mode === "mass"
                          ? "Hi {{first_name}}, we wanted to let you know..."
                          : "Type your message here..."
                      }
                    />
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        {segmentCount > 1 && (
                          <Badge variant="warning" size="sm">
                            {segmentCount} segments
                          </Badge>
                        )}
                        {hasTemplateVars && (
                          <Badge variant="info" size="sm">
                            Personalized
                          </Badge>
                        )}
                      </div>
                      <span
                        className={`text-xs ${charCount > 1600 ? "text-danger font-medium" : "text-text-muted"}`}
                      >
                        {charCount}/1,600
                      </span>
                    </div>
                  </div>

                  {/* Live preview (mass mode with template vars) */}
                  {mode === "mass" && hasTemplateVars && previewCustomer && (
                    <div className="rounded-lg border border-dashed border-purple-300 dark:border-purple-500/40 bg-purple-50/50 dark:bg-purple-500/5 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold ${getAvatarColor(previewCustomer.name)}`}
                        >
                          {getInitials(previewCustomer.name)}
                        </div>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          Preview for {previewCustomer.name}
                        </span>
                      </div>
                      <p className="text-sm text-text-primary leading-relaxed bg-white dark:bg-bg-card rounded-lg px-3 py-2 shadow-sm border border-purple-100 dark:border-purple-500/20">
                        {personalizePreview(message, previewCustomer)}
                      </p>
                    </div>
                  )}

                  {/* Quick templates */}
                  <div>
                    <p className="text-xs text-text-muted mb-1.5">Quick templates:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          label: "Reminder",
                          text:
                            mode === "mass"
                              ? "Hi {{first_name}}, this is a friendly reminder about your upcoming service. Reply CONFIRM to confirm or call us to reschedule."
                              : "Hi! This is a friendly reminder about your upcoming service. Reply CONFIRM to confirm or call us to reschedule.",
                        },
                        {
                          label: "Thank you",
                          text:
                            mode === "mass"
                              ? "Hi {{first_name}}, thank you for choosing MAC Septic Services! We appreciate your business. Feel free to reach out if you need anything."
                              : "Thank you for choosing MAC Septic Services! We appreciate your business. Feel free to reach out if you need anything.",
                        },
                        {
                          label: "Follow-up",
                          text:
                            mode === "mass"
                              ? "Hi {{first_name}}, we hope your recent service went well! If you have any questions or concerns, please don't hesitate to reach out."
                              : "We hope your recent service went well! If you have any questions or concerns, please don't hesitate to reach out.",
                        },
                        {
                          label: "Seasonal",
                          text:
                            mode === "mass"
                              ? "Hi {{first_name}}, it's time for your seasonal septic system check-up! Call us or reply to schedule your appointment."
                              : "It's time for your seasonal septic system check-up! Call us or reply to schedule your appointment.",
                        },
                      ].map(({ label, text }) => (
                        <button
                          key={label}
                          onClick={() => setMessage(text)}
                          className="px-2.5 py-1 text-xs font-medium bg-bg-muted hover:bg-bg-hover text-text-secondary rounded-md transition-colors border border-border"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Send Bar ─────────────────────────────────────── */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="text-sm text-text-muted">
                  {mode === "single" ? (
                    selectedCustomers[0] ? (
                      <span>
                        Sending to{" "}
                        <span className="font-medium text-text-primary">
                          {selectedCustomers[0].name}
                        </span>{" "}
                        ({selectedCustomers[0].phone})
                      </span>
                    ) : manualPhone ? (
                      <span>
                        Sending to{" "}
                        <span className="font-medium text-text-primary">{manualPhone}</span>
                      </span>
                    ) : (
                      <span className="text-text-muted italic">No recipient selected</span>
                    )
                  ) : (
                    <span>
                      <span className="font-medium text-text-primary">
                        {selectedCustomers.length}
                      </span>{" "}
                      recipient{selectedCustomers.length !== 1 ? "s" : ""} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={onClose} disabled={isSending}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={!canSend || isSending}
                    className="gap-2"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <IconSend className="w-4 h-4" />
                        {mode === "single"
                          ? "Send SMS"
                          : `Send to ${selectedCustomers.length} recipient${selectedCustomers.length !== 1 ? "s" : ""}`}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Results Panel ────────────────────────────────────────────────

function BulkResultsPanel({
  result,
  onClose,
  onSendMore,
}: {
  result: BulkSMSResponse;
  onClose: () => void;
  onSendMore: () => void;
}) {
  const successRate = result.total > 0 ? Math.round((result.sent / result.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: result.total, color: "text-text-primary", bg: "bg-bg-muted" },
          { label: "Sent", value: result.sent, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Failed", value: result.failed, color: "text-red-600", bg: "bg-red-50 dark:bg-red-500/10" },
          { label: "Skipped", value: result.skipped, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-text-primary">
            Delivery Rate
          </span>
          <span className="text-sm font-bold text-emerald-600">{successRate}%</span>
        </div>
        <div className="w-full bg-bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2.5 rounded-full transition-all duration-1000"
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {/* Detailed results */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-bg-muted px-3 py-2 border-b border-border">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Delivery Details
          </h4>
        </div>
        <div className="max-h-48 overflow-y-auto divide-y divide-border">
          {result.results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  r.status === "sent"
                    ? "bg-emerald-500"
                    : r.status === "skipped"
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {r.customer_name}
                </p>
                {r.phone && (
                  <p className="text-xs text-text-muted">{r.phone}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <Badge
                  variant={
                    r.status === "sent"
                      ? "success"
                      : r.status === "skipped"
                        ? "warning"
                        : "danger"
                  }
                  size="sm"
                >
                  {r.status}
                </Badge>
                {r.reason && (
                  <p className="text-xs text-text-muted mt-0.5">{r.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button variant="secondary" onClick={onSendMore}>
          Send More
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
