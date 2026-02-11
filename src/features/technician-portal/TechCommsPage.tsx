import { useState, useCallback } from "react";
import { useTechMessages, useSendMessage } from "@/api/hooks/useTechPortal.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

// ── Constants ──────────────────────────────────────────────────────────────

const TABS = [
  { key: "inbox", label: "Inbox", emoji: "📥" },
  { key: "sent", label: "Sent", emoji: "📤" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TYPE_ICONS: Record<string, string> = {
  sms: "📱",
  email: "📧",
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "info" | "danger" | "default"> = {
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

function formatMessageDate(iso: string | null | undefined): string {
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

function getContactDisplay(msg: {
  direction?: string | null;
  from_number?: string | null;
  from_email?: string | null;
  to_number?: string | null;
  to_email?: string | null;
  message_type?: string | null;
}): { label: string; value: string } {
  const isInbound = msg.direction === "inbound" || msg.direction === "received";
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

// ── Loading Skeleton ───────────────────────────────────────────────────────

function CommsPageSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      {/* Message card skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ── Message Card ───────────────────────────────────────────────────────────

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
  const dateStr = formatMessageDate(message.sent_at || message.created_at);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md active:shadow-inner"
      onClick={onToggle}
    >
      <CardContent className="pt-4 pb-4">
        {/* Row 1: Type icon + Subject/Contact + Status badge */}
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

        {/* Row 2: Preview (collapsed) or full content (expanded) */}
        {isExpanded ? (
          <div className="mt-3 p-3 rounded-lg bg-bg-muted text-sm text-text-primary whitespace-pre-wrap break-words">
            {message.content || "No content"}
          </div>
        ) : (
          <p className="text-sm text-text-muted mt-1 line-clamp-1">
            {getPreview(message.content)}
          </p>
        )}

        {/* Tap indicator */}
        <div className="flex justify-end mt-1">
          <span className="text-xs text-text-muted">
            {isExpanded ? "Tap to collapse" : "Tap to read"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabKey }) {
  const content = {
    inbox: { emoji: "📭", text: "No messages yet", sub: "Messages you receive will show up here" },
    sent: { emoji: "📤", text: "No sent messages", sub: "Messages you send will show up here" },
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

// ── Compose Panel ──────────────────────────────────────────────────────────

function ComposePanel({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const [msgType, setMsgType] = useState<"sms" | "email">("sms");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const sendMutation = useSendMessage();

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      toastError("Missing recipient", "Please enter a phone number or email");
      return;
    }
    if (!body.trim()) {
      toastError("Missing message", "Please type a message to send");
      return;
    }

    try {
      await sendMutation.mutateAsync({
        type: msgType,
        to: to.trim(),
        subject: msgType === "email" ? subject.trim() : undefined,
        content: body.trim(),
      });
      onSent();
    } catch {
      // Error toast is handled by the mutation hook
    }
  }, [msgType, to, subject, body, sendMutation, onSent]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Slide-up panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-bg-card rounded-t-2xl shadow-2xl border-t border-border max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-bg-muted" />
        </div>

        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-2xl">✏️</span> New Message
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-bg-hover text-text-muted text-lg"
            >
              ✕
            </button>
          </div>

          {/* Type Selector */}
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

          {/* To field */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              {msgType === "sms" ? "Phone Number" : "Email Address"}
            </label>
            <Input
              placeholder={msgType === "sms" ? "(555) 123-4567" : "name@example.com"}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              type={msgType === "sms" ? "tel" : "email"}
              className="h-12 text-base rounded-xl"
            />
          </div>

          {/* Subject (email only) */}
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

          {/* Message body */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              Message
            </label>
            <textarea
              placeholder="Type your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="flex w-full rounded-xl border border-border bg-bg-card px-3 py-3 text-base placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 resize-y"
            />
          </div>

          {/* Send Button */}
          <Button
            size="lg"
            onClick={handleSend}
            disabled={sendMutation.isPending || !to.trim() || !body.trim()}
            className="w-full h-14 text-lg rounded-xl font-bold"
          >
            {sendMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🔄</span> Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>🚀</span> Send {msgType === "sms" ? "SMS" : "Email"}
              </span>
            )}
          </Button>

          {/* Bottom spacing for mobile safe area */}
          <div className="h-4" />
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function TechCommsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("inbox");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const { data, isLoading, isFetching, refetch } = useTechMessages();

  // Filter messages by tab (direction)
  const messages = (data?.items ?? []).filter((msg) => {
    if (activeTab === "inbox") {
      return msg.direction === "inbound" || msg.direction === "received" || !msg.direction;
    }
    return msg.direction === "outbound" || msg.direction === "sent";
  });

  // Sort by date, newest first
  const sorted = [...messages].sort((a, b) => {
    const da = new Date(a.sent_at || a.created_at || 0).getTime();
    const db = new Date(b.sent_at || b.created_at || 0).getTime();
    return db - da;
  });

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleComposeSent = useCallback(() => {
    setShowCompose(false);
    setActiveTab("sent");
    refetch();
  }, [refetch]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <CommsPageSkeleton />;

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <span className="text-3xl">💬</span> Messages
        </h1>
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

      {/* Tab Bar */}
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedId(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
              {activeTab === tab.key && sorted.length > 0 && (
                <span className="ml-1 bg-white/20 rounded-full px-1.5 py-0.5 text-xs">
                  {sorted.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-muted">
          {sorted.length === 0
            ? "No messages"
            : sorted.length === 1
              ? "1 message"
              : `${sorted.length} messages`}
        </p>
        {isFetching && !isLoading && (
          <span className="text-xs text-text-muted animate-pulse">Refreshing...</span>
        )}
      </div>

      {/* Message List */}
      {sorted.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="space-y-3">
          {sorted.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              isExpanded={expandedId === msg.id}
              onToggle={() => handleToggleExpand(msg.id)}
            />
          ))}
        </div>
      )}

      {/* Floating Compose Button */}
      {!showCompose && (
        <button
          onClick={() => setShowCompose(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-cta text-white shadow-lg hover:bg-cta-hover active:shadow-inner flex items-center justify-center text-2xl transition-transform hover:scale-105"
          aria-label="Compose message"
        >
          ✏️
        </button>
      )}

      {/* Compose Panel */}
      {showCompose && (
        <ComposePanel
          onClose={() => setShowCompose(false)}
          onSent={handleComposeSent}
        />
      )}
    </div>
  );
}
