import { useState, useCallback } from "react";
import { useTechMessages } from "@/api/hooks/useTechPortal.ts";
import {
  useRCStatus,
  useCallLog,
  useInitiateCall,
} from "@/features/phone/api.ts";
import type { CallRecord } from "@/features/phone/types.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

// ── Constants ──────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { key: "phone", label: "Phone", emoji: "📞" },
  { key: "sms", label: "SMS", emoji: "📱" },
  { key: "email", label: "Email", emoji: "📧" },
] as const;

type MainTabKey = (typeof MAIN_TABS)[number]["key"];

const MSG_TABS = [
  { key: "inbox", label: "Inbox", emoji: "📥" },
  { key: "sent", label: "Sent", emoji: "📤" },
] as const;

type MsgTabKey = (typeof MSG_TABS)[number]["key"];

const TYPE_ICONS: Record<string, string> = { sms: "📱", email: "📧" };

const STATUS_VARIANTS: Record<
  string,
  "success" | "warning" | "info" | "danger" | "default"
> = {
  delivered: "success",
  sent: "success",
  read: "success",
  pending: "warning",
  queued: "info",
  failed: "danger",
  bounced: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  delivered: "Delivered",
  sent: "Sent",
  read: "Read",
  pending: "Pending",
  queued: "Queued",
  failed: "Failed",
  bounced: "Bounced",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatPhone(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return number;
}

function getContactDisplay(msg: {
  direction?: string | null;
  from_number?: string | null;
  from_email?: string | null;
  to_number?: string | null;
  to_email?: string | null;
  message_type?: string | null;
}): { label: string; value: string } {
  const isInbound =
    msg.direction === "inbound" || msg.direction === "received";
  if (msg.message_type === "sms") {
    return {
      label: isInbound ? "From" : "To",
      value: (isInbound ? msg.from_number : msg.to_number) || "Unknown",
    };
  }
  return {
    label: isInbound ? "From" : "To",
    value: (isInbound ? msg.from_email : msg.to_email) || "Unknown",
  };
}

function getPreview(content: string | null | undefined, maxLen = 80): string {
  if (!content) return "No content";
  const stripped = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen) + "...";
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function CommsPageSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ── Call Card ──────────────────────────────────────────────────────────────

function CallCard({
  call,
  onCall,
  isCalling,
}: {
  call: CallRecord;
  onCall: (number: string) => void;
  isCalling: boolean;
}) {
  const isInbound = call.direction === "inbound";
  const isMissed =
    call.status === "missed" ||
    call.status === "voicemail" ||
    (call.duration_seconds ?? 0) === 0;
  const dirIcon = isMissed ? "📵" : isInbound ? "↙️" : "↗️";
  const dirColor = isMissed
    ? "text-red-600"
    : isInbound
      ? "text-green-600"
      : "text-primary";
  const otherNumber = isInbound ? call.from_number : call.to_number;
  const otherName = isInbound
    ? call.from_name || call.contact_name
    : call.to_name || call.contact_name;
  const dateStr = formatRelative(call.start_time || call.created_at);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          {/* Left: direction + number */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className={`text-2xl ${dirColor}`}>{dirIcon}</span>
            <div className="min-w-0 flex-1">
              {otherName && (
                <p className="text-base font-semibold text-text-primary truncate">
                  {otherName}
                </p>
              )}
              <p className="text-sm text-text-secondary truncate">
                {formatPhone(otherNumber)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted">{dateStr}</span>
                {(call.duration_seconds ?? 0) > 0 && (
                  <span className="text-xs text-text-muted">
                    {formatDuration(call.duration_seconds)}
                  </span>
                )}
                {isMissed && (
                  <Badge variant="danger" size="sm">
                    Missed
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right: call back button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCall(otherNumber);
            }}
            disabled={isCalling}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-xl shadow-md transition-colors disabled:opacity-50"
            title={`Call ${formatPhone(otherNumber)}`}
          >
            📞
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Phone Tab Content ─────────────────────────────────────────────────────

function PhoneTab() {
  const [dialNumber, setDialNumber] = useState("");
  const { data: rcStatus } = useRCStatus();
  const { data: calls, isLoading: callsLoading } = useCallLog({
    page: 1,
    page_size: 30,
  });
  const callMutation = useInitiateCall();

  const isConnected = rcStatus?.connected ?? false;

  const handleCall = useCallback(
    (number: string) => {
      if (!number.trim()) {
        toastError("Enter a phone number");
        return;
      }
      if (!isConnected) {
        toastError("Phone not connected", "RingCentral is not configured");
        return;
      }
      const cleaned = number.replace(/\D/g, "");
      callMutation.mutate(
        { to_number: cleaned },
        {
          onSuccess: () => {
            toastSuccess("Calling...", `Dialing ${formatPhone(number)}`);
            setDialNumber("");
          },
          onError: () => {
            toastError("Call failed", "Could not place the call");
          },
        },
      );
    },
    [isConnected, callMutation],
  );

  const handleDialPad = useCallback((digit: string) => {
    setDialNumber((prev) => prev + digit);
  }, []);

  const DIAL_DIGITS = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "*",
    "0",
    "#",
  ];

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-400"}`}
          />
          <span className="text-sm text-text-secondary">
            {isConnected ? "Phone Connected" : "Phone Disconnected"}
          </span>
        </div>
        {rcStatus?.extension && (
          <span className="text-xs text-text-muted">
            Ext. {rcStatus.extension}
          </span>
        )}
      </div>

      {/* Dialer */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-xl">📞</span> Quick Dial
          </h3>

          {/* Number input */}
          <div className="flex gap-2 mb-3">
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              className="h-14 text-xl font-mono text-center rounded-xl flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCall(dialNumber);
              }}
            />
            {dialNumber && (
              <button
                onClick={() => setDialNumber("")}
                className="w-14 h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl flex items-center justify-center"
              >
                ⌫
              </button>
            )}
          </div>

          {/* Dial pad */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {DIAL_DIGITS.map((d) => (
              <button
                key={d}
                onClick={() => handleDialPad(d)}
                className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-xl font-medium text-text-primary transition-colors"
              >
                {d}
              </button>
            ))}
          </div>

          {/* Call button */}
          <Button
            onClick={() => handleCall(dialNumber)}
            disabled={
              !dialNumber.trim() || callMutation.isPending || !isConnected
            }
            className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white"
          >
            {callMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🔄</span> Calling...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">📞</span> Call
              </span>
            )}
          </Button>

          {!isConnected && (
            <p className="text-xs text-red-500 text-center mt-2">
              RingCentral not connected — ask your admin to configure it
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
          <span className="text-xl">📋</span> Recent Calls
        </h3>

        {callsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : !calls?.items?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">📵</p>
              <p className="text-base font-medium text-text-secondary">
                No recent calls
              </p>
              <p className="text-sm text-text-muted mt-1">
                Your call history will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {calls.items.map((call: CallRecord) => (
              <CallCard
                key={call.id}
                call={call}
                onCall={handleCall}
                isCalling={callMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Message Card ──────────────────────────────────────────────────────────

function MessageCard({
  message,
  isExpanded,
  onToggle,
}: {
  message: {
    id: string;
    message_type?: string | null;
    direction?: string | null;
    status?: string | null;
    from_number?: string | null;
    from_email?: string | null;
    to_number?: string | null;
    to_email?: string | null;
    subject?: string | null;
    content?: string | null;
    sent_at?: string | null;
    created_at?: string | null;
  };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const typeIcon = TYPE_ICONS[message.message_type || ""] || "💬";
  const contact = getContactDisplay(message);
  const statusKey = (message.status || "").toLowerCase();
  const badgeVariant = STATUS_VARIANTS[statusKey] || "default";
  const statusLabel = STATUS_LABELS[statusKey] || message.status || "Unknown";
  const dateStr = formatRelative(message.sent_at || message.created_at);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md active:shadow-inner"
      onClick={onToggle}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{typeIcon}</span>
            <div className="min-w-0 flex-1">
              {message.subject && (
                <p className="text-base font-bold text-text-primary truncate">
                  {message.subject}
                </p>
              )}
              <p className="text-sm text-text-secondary truncate">
                {contact.label}: {contact.value}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
            <Badge variant={badgeVariant} size="sm">
              {statusLabel}
            </Badge>
            <span className="text-xs text-text-muted">{dateStr}</span>
          </div>
        </div>

        {isExpanded ? (
          <div className="mt-3 p-3 rounded-lg bg-bg-muted text-sm text-text-primary whitespace-pre-wrap break-words">
            {message.content || "No content"}
          </div>
        ) : (
          <p className="text-sm text-text-muted mt-1 line-clamp-1">
            {getPreview(message.content)}
          </p>
        )}

        <div className="flex justify-end mt-1">
          <span className="text-xs text-text-muted">
            {isExpanded ? "Tap to collapse" : "Tap to read"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────

function MsgEmptyState({ tab }: { tab: MsgTabKey }) {
  const content = {
    inbox: {
      emoji: "📭",
      text: "No messages yet",
      sub: "Messages you receive will show up here",
    },
    sent: {
      emoji: "📤",
      text: "No sent messages",
      sub: "Messages you send will show up here",
    },
  };
  const c = content[tab];

  return (
    <Card>
      <CardContent className="py-16 text-center">
        <p className="text-5xl mb-4">{c.emoji}</p>
        <p className="text-lg font-medium text-text-secondary">{c.text}</p>
        <p className="text-sm text-text-muted mt-2">{c.sub}</p>
      </CardContent>
    </Card>
  );
}

// ── SMS/Email Tab Content ─────────────────────────────────────────────────

function MessagingTab({ type, onCompose }: { type: "sms" | "email"; onCompose: () => void }) {
  const [msgTab, setMsgTab] = useState<MsgTabKey>("inbox");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useTechMessages({ message_type: type });

  const messages = (data?.items ?? []).filter((msg) => {
    if (msgTab === "inbox") {
      return (
        msg.direction === "inbound" ||
        msg.direction === "received" ||
        !msg.direction
      );
    }
    return msg.direction === "outbound" || msg.direction === "sent";
  });

  const sorted = [...messages].sort((a, b) => {
    const da = new Date(a.sent_at || a.created_at || 0).getTime();
    const db = new Date(b.sent_at || b.created_at || 0).getTime();
    return db - da;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* New Message Button */}
      <button
        onClick={onCompose}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-base font-bold shadow-md transition-colors"
      >
        <span className="text-xl">✏️</span>
        New {type === "sms" ? "Text Message" : "Email"}
      </button>

      {/* Sub-tabs: Inbox / Sent */}
      <div className="flex gap-2">
        {MSG_TABS.map((tab) => {
          const isActive = msgTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setMsgTab(tab.key);
                setExpandedId(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-primary"
        >
          {isFetching ? (
            <span className="animate-spin text-lg">🔄</span>
          ) : (
            <span className="text-lg">🔄</span>
          )}
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-text-muted">
        {sorted.length === 0
          ? "No messages"
          : sorted.length === 1
            ? "1 message"
            : `${sorted.length} messages`}
      </p>

      {/* Messages */}
      {sorted.length === 0 ? (
        <MsgEmptyState tab={msgTab} />
      ) : (
        <div className="space-y-3">
          {sorted.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              isExpanded={expandedId === msg.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === msg.id ? null : msg.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Compose Panel ─────────────────────────────────────────────────────────

function ComposePanel({
  defaultType,
  onClose,
  onSent,
}: {
  defaultType: "sms" | "email";
  onClose: () => void;
  onSent: () => void;
}) {
  const [msgType, setMsgType] = useState<"sms" | "email">(defaultType);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSend = useCallback(() => {
    if (!to.trim()) {
      toastError("Missing recipient", "Please enter a phone number or email");
      return;
    }
    if (!body.trim()) {
      toastError("Missing message", "Please type a message to send");
      return;
    }

    if (msgType === "sms") {
      // Open native SMS app with pre-filled number and message
      const phone = to.trim().replace(/\D/g, "");
      const encoded = encodeURIComponent(body.trim());
      window.location.href = `sms:${phone}?body=${encoded}`;
    } else {
      // Open native email client with pre-filled fields
      const params = new URLSearchParams();
      if (subject.trim()) params.set("subject", subject.trim());
      params.set("body", body.trim());
      window.location.href = `mailto:${to.trim()}?${params.toString()}`;
    }
    onSent();
  }, [msgType, to, subject, body, onSent]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Full-screen compose overlay */}
      <div className="fixed inset-0 z-50 bg-bg-card flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header with Send button — always visible at top */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-text-secondary text-base font-medium hover:bg-bg-hover"
          >
            Cancel
          </button>
          <h2 className="text-lg font-bold text-text-primary">New Message</h2>
          <button
            onClick={handleSend}
            disabled={!to.trim() || !body.trim()}
            className="px-4 py-1.5 rounded-lg font-bold text-base bg-primary hover:bg-primary/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>

        {/* Scrollable form content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="flex gap-2">
            <button
              onClick={() => setMsgType("sms")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-base font-medium transition-colors ${
                msgType === "sms"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <span className="text-lg">📱</span> SMS
            </button>
            <button
              onClick={() => setMsgType("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-base font-medium transition-colors ${
                msgType === "email"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <span className="text-lg">📧</span> Email
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              {msgType === "sms" ? "Phone Number" : "Email Address"}
            </label>
            <Input
              placeholder={
                msgType === "sms" ? "(555) 123-4567" : "name@example.com"
              }
              value={to}
              onChange={(e) => setTo(e.target.value)}
              type={msgType === "sms" ? "tel" : "email"}
              className="h-12 text-base rounded-xl"
            />
          </div>

          {msgType === "email" && (
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                Subject
              </label>
              <Input
                placeholder="What's this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-12 text-base rounded-xl"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              Message
            </label>
            <textarea
              placeholder="Type your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="flex w-full rounded-xl border border-border bg-bg-card px-3 py-3 text-base placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 resize-y"
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export function TechCommsPage() {
  const [activeTab, setActiveTab] = useState<MainTabKey>("phone");
  const [showCompose, setShowCompose] = useState(false);

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 mb-4">
        <span className="text-3xl">💬</span> Communications
      </h1>

      {/* Main Tab Bar: Phone / SMS / Email */}
      <div className="flex gap-2 mb-4">
        {MAIN_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "phone" && <PhoneTab />}
      {activeTab === "sms" && <MessagingTab type="sms" onCompose={() => setShowCompose(true)} />}
      {activeTab === "email" && <MessagingTab type="email" onCompose={() => setShowCompose(true)} />}

      {/* Compose Panel */}
      {showCompose && (
        <ComposePanel
          defaultType={activeTab === "email" ? "email" : "sms"}
          onClose={() => setShowCompose(false)}
          onSent={() => {
            setShowCompose(false);
          }}
        />
      )}
    </div>
  );
}
