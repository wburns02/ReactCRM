import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { SMSComposeModal } from "@/features/sms/SMSComposeModal";
import { EmailComposeModal } from "../components/EmailComposeModal";
import { CommunicationsNav } from "../components/CommunicationsNav";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  getInitials,
  getAvatarColor,
  relativeTime,
  getStatusBadge,
  CHANNEL_CONFIG,
} from "../utils";

// ── Types ────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: "sms" | "email" | "call" | "note";
  customer_name: string;
  customer_id: string | null;
  content: string | null;
  subject: string | null;
  direction: "inbound" | "outbound";
  status: string;
  to_address: string | null;
  from_address: string | null;
  created_at: string | null;
  sent_at: string | null;
}

interface CommStats {
  unread_sms: number;
  unread_email: number;
  pending_reminders: number;
}

function getPreview(item: ActivityItem): string {
  if (item.subject && item.content) return `${item.subject} — ${item.content}`;
  if (item.subject) return item.subject;
  if (item.content) return item.content;
  return "No content";
}

// ── Channel tabs ─────────────────────────────────────────────────────────

type ChannelFilter = "all" | "sms" | "email" | "call";

const CHANNEL_TABS: { value: ChannelFilter; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "📥" },
  { value: "sms", label: "SMS", icon: "💬" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "call", label: "Calls", icon: "📞" },
];

// ── Component ────────────────────────────────────────────────────────────

export function CommunicationsOverview() {
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────

  const { data: stats } = useQuery<CommStats>({
    queryKey: ["communications-stats"],
    queryFn: async () => {
      try {
        const r = await apiClient.get("/communications/stats");
        return r.data;
      } catch {
        return { unread_sms: 0, unread_email: 0, pending_reminders: 0 };
      }
    },
  });

  const { data: activityData, isLoading } = useQuery<{
    items: ActivityItem[];
    total: number;
  }>({
    queryKey: [
      "communications-activity",
      channel === "all" ? undefined : channel,
      searchQuery || undefined,
    ],
    queryFn: async () => {
      try {
        const params: Record<string, string | number> = { limit: 50 };
        if (channel !== "all") params.channel = channel;
        if (searchQuery) params.search = searchQuery;
        const r = await apiClient.get("/communications/activity", { params });
        return r.data;
      } catch {
        return { items: [], total: 0 };
      }
    },
    refetchInterval: 15000,
  });

  // Also fetch recent calls from RingCentral for the unified feed
  const { data: callsData } = useQuery<{ items: Array<Record<string, unknown>> }>({
    queryKey: ["ringcentral-calls-recent"],
    queryFn: async () => {
      try {
        const r = await apiClient.get("/ringcentral/calls", {
          params: { page: 1, page_size: 20 },
        });
        return r.data;
      } catch {
        return { items: [] };
      }
    },
    enabled: channel === "all" || channel === "call",
    refetchInterval: 30000,
  });

  // ── Merge messages + calls into unified feed ─────────────────────────

  const unifiedFeed = useMemo(() => {
    const messages: ActivityItem[] = activityData?.items || [];

    // Map call logs into ActivityItem format
    const callItems: ActivityItem[] = (callsData?.items || []).map((c) => ({
      id: String(c.id || c.ringcentral_call_id || ""),
      type: "call" as const,
      customer_name:
        (c.customer_name as string) ||
        (c.caller_number as string) ||
        (c.called_number as string) ||
        "Unknown Caller",
      customer_id: (c.customer_id as string) || null,
      content: c.ai_summary
        ? String(c.ai_summary)
        : c.duration_seconds
          ? `${Math.floor(Number(c.duration_seconds) / 60)}m ${Number(c.duration_seconds) % 60}s call`
          : "Call",
      subject: null,
      direction: (c.direction as "inbound" | "outbound") || "inbound",
      status: (c.call_disposition as string) || "completed",
      to_address: (c.called_number as string) || null,
      from_address: (c.caller_number as string) || null,
      created_at: (c.created_at as string) || (c.call_date as string) || null,
      sent_at: null,
    }));

    // Merge and deduplicate (by id), sort by created_at desc
    const allItems =
      channel === "call"
        ? callItems
        : channel === "all"
          ? [...messages, ...callItems]
          : messages;

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allItems.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // Sort by date descending
    unique.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return unique;
  }, [activityData, callsData, channel]);

  const selectedItem = useMemo(
    () => unifiedFeed.find((i) => i.id === selectedItemId) || null,
    [unifiedFeed, selectedItemId],
  );

  const totalUnread = (stats?.unread_sms || 0) + (stats?.unread_email || 0);

  // ── Quick reply handler ──────────────────────────────────────────────

  const handleQuickReply = useCallback(
    (item: ActivityItem) => {
      if (item.type === "sms") {
        setIsSMSModalOpen(true);
      } else if (item.type === "email") {
        setIsEmailModalOpen(true);
      }
      setSelectedItemId(item.id);
    },
    [],
  );

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              📥 Unified Inbox
              {totalUnread > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold bg-danger text-white rounded-full">
                  {totalUnread}
                </span>
              )}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              All customer communications in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSMSModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              💬 New SMS
            </button>
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
            >
              📧 New Email
            </button>
          </div>
        </div>

        {/* ── Stats bar ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-blue-500 font-semibold">
              {stats?.unread_sms || 0}
            </span>
            <span className="text-text-muted">unread SMS</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-purple-500 font-semibold">
              {stats?.unread_email || 0}
            </span>
            <span className="text-text-muted">unread emails</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-green-500 font-semibold">
              {callsData?.items?.length || 0}
            </span>
            <span className="text-text-muted">recent calls</span>
          </div>
        </div>

        {/* ── Search + Channel Tabs ──────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              🔍
            </span>
            <Input
              type="text"
              placeholder="Search messages, customers, phone numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center bg-bg-card border border-border rounded-lg p-0.5">
            {CHANNEL_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setChannel(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  channel === tab.value
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-hover",
                )}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.label}
                {tab.value === "sms" && (stats?.unread_sms || 0) > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                    {stats?.unread_sms}
                  </span>
                )}
                {tab.value === "email" && (stats?.unread_email || 0) > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-purple-500 text-white rounded-full">
                    {stats?.unread_email}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Feed ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Message list */}
        <div
          className={cn(
            "flex-1 overflow-y-auto",
            selectedItem && "hidden md:block md:max-w-[55%] md:border-r md:border-border",
          )}
        >
          {isLoading ? (
            <div className="p-8 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-text-muted">Loading messages...</p>
            </div>
          ) : unifiedFeed.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-5xl block mb-3">📭</span>
              <h3 className="font-semibold text-text-primary mb-1">
                {searchQuery ? "No results found" : "Your inbox is empty"}
              </h3>
              <p className="text-sm text-text-muted max-w-sm mx-auto">
                {searchQuery
                  ? `No messages matching "${searchQuery}"`
                  : "When you send or receive messages via SMS, email, or phone, they'll appear here in real time."}
              </p>
              {!searchQuery && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setIsSMSModalOpen(true)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Send first SMS
                  </button>
                  <button
                    onClick={() => setIsEmailModalOpen(true)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-purple-500 text-white hover:bg-purple-600"
                  >
                    Send first email
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {unifiedFeed.map((item) => {
                const cfg = CHANNEL_CONFIG[item.type] || CHANNEL_CONFIG.note;
                const isSelected = selectedItemId === item.id;
                const isNew =
                  item.direction === "inbound" &&
                  item.status === "received";

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-bg-hover transition-colors flex items-start gap-3",
                      isSelected && "bg-primary/5 border-l-3 border-l-primary",
                      isNew && "bg-blue-50/50 dark:bg-blue-500/5",
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold",
                        getAvatarColor(item.customer_name),
                      )}
                    >
                      {getInitials(item.customer_name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            "font-semibold text-sm truncate",
                            isNew
                              ? "text-text-primary"
                              : "text-text-primary/80",
                          )}
                        >
                          {item.customer_name}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full",
                            cfg.bgColor,
                            cfg.color,
                          )}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                        {isNew && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <span className="text-xs text-text-muted ml-auto flex-shrink-0">
                          {relativeTime(item.created_at || item.sent_at)}
                        </span>
                      </div>

                      <p className="text-sm text-text-secondary truncate">
                        {item.direction === "outbound" && (
                          <span className="text-text-muted">You: </span>
                        )}
                        {getPreview(item)}
                      </p>

                      {/* Status badge for outbound */}
                      {item.direction === "outbound" && (() => {
                        const badge = getStatusBadge(item.status);
                        return badge ? (
                          <Badge
                            variant={badge.variant}
                            size="sm"
                            className="mt-1"
                          >
                            {badge.label}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Detail panel (desktop) ─────────────────────────────── */}
        {selectedItem && (
          <div className="flex-1 flex flex-col bg-bg-card overflow-hidden md:min-w-[45%]">
            {/* Detail header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold",
                    getAvatarColor(selectedItem.customer_name),
                  )}
                >
                  {getInitials(selectedItem.customer_name)}
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {selectedItem.customer_name}
                  </h3>
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    {CHANNEL_CONFIG[selectedItem.type]?.icon}{" "}
                    {selectedItem.to_address || selectedItem.from_address}
                    <span className="mx-1">·</span>
                    {relativeTime(
                      selectedItem.created_at || selectedItem.sent_at,
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedItem.customer_id && (
                  <Link
                    to={`/customers/${selectedItem.customer_id}`}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-bg-hover transition-colors"
                  >
                    View Customer
                  </Link>
                )}
                <button
                  onClick={() => setSelectedItemId(null)}
                  className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Message content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full mb-3",
                  CHANNEL_CONFIG[selectedItem.type]?.bgColor,
                  CHANNEL_CONFIG[selectedItem.type]?.color,
                )}
              >
                {CHANNEL_CONFIG[selectedItem.type]?.icon}{" "}
                {selectedItem.direction === "inbound"
                  ? "Received"
                  : "Sent"}{" "}
                via {CHANNEL_CONFIG[selectedItem.type]?.label}
              </div>

              {selectedItem.subject && (
                <h4 className="font-semibold text-text-primary mb-2">
                  {selectedItem.subject}
                </h4>
              )}

              <div className="prose prose-sm text-text-secondary max-w-none whitespace-pre-wrap">
                {selectedItem.content || "No message content"}
              </div>

              {/* Metadata */}
              <div className="mt-6 pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Direction</span>
                  <span className="font-medium text-text-secondary">
                    {selectedItem.direction === "inbound"
                      ? "← Inbound"
                      : "→ Outbound"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Status</span>
                  <span className="font-medium text-text-secondary capitalize">
                    {selectedItem.status}
                  </span>
                </div>
                {selectedItem.to_address && (
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>To</span>
                    <span className="font-medium text-text-secondary">
                      {selectedItem.to_address}
                    </span>
                  </div>
                )}
                {selectedItem.from_address && (
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>From</span>
                    <span className="font-medium text-text-secondary">
                      {selectedItem.from_address}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Date</span>
                  <span className="font-medium text-text-secondary">
                    {selectedItem.created_at
                      ? new Date(selectedItem.created_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick reply footer */}
            {(selectedItem.type === "sms" ||
              selectedItem.type === "email") && (
              <div className="flex-shrink-0 p-4 border-t border-border bg-bg-card">
                <button
                  onClick={() => handleQuickReply(selectedItem)}
                  className={cn(
                    "w-full py-2.5 rounded-lg font-medium text-sm text-white transition-colors",
                    selectedItem.type === "sms"
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-purple-500 hover:bg-purple-600",
                  )}
                >
                  {selectedItem.type === "sms"
                    ? "💬 Reply via SMS"
                    : "📧 Reply via Email"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick nav links (bottom bar on mobile) ─────────────────── */}
      <CommunicationsNav />

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <SMSComposeModal
        open={isSMSModalOpen}
        onClose={() => setIsSMSModalOpen(false)}
        defaultPhone={
          selectedItem?.type === "sms"
            ? selectedItem.to_address || undefined
            : undefined
        }
        customerId={selectedItem?.customer_id || undefined}
        customerName={selectedItem?.customer_name || undefined}
      />
      <EmailComposeModal
        open={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        defaultEmail={
          selectedItem?.type === "email"
            ? selectedItem.to_address || undefined
            : undefined
        }
        customerId={selectedItem?.customer_id || undefined}
        customerName={selectedItem?.customer_name || undefined}
      />
    </div>
  );
}
