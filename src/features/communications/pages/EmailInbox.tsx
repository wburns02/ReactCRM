import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { EmailComposeModal } from "../components/EmailComposeModal";
import { CommunicationsNav } from "../components/CommunicationsNav";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getInitials, getAvatarColor, relativeTime } from "../utils";

// ── Types ────────────────────────────────────────────────────────────────

interface EmailThread {
  id: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  preview: string;
  received_at: string;
  unread: boolean;
  status: string;
  direction: "inbound" | "outbound";
}

// ── Filter tabs ──────────────────────────────────────────────────────────

type FilterType = "all" | "unread" | "sent";

const FILTER_TABS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All Mail" },
  { value: "unread", label: "Unread" },
  { value: "sent", label: "Sent" },
];

// ── Component ────────────────────────────────────────────────────────────

export function EmailInbox() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const {
    data: emails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["email-conversations", searchQuery, filter],
    queryFn: async () => {
      const response = await apiClient.get("/communications/history", {
        params: {
          message_type: "email",
          page: 1,
          page_size: 50,
        },
      });
      const items = response.data.items || [];
      return items.map(
        (msg: {
          id: string;
          to_address: string | null;
          from_address: string | null;
          subject: string | null;
          content: string | null;
          created_at: string | null;
          status: string;
          direction: string;
          customer_name: string | null;
        }) => ({
          id: msg.id,
          customer_name:
            msg.customer_name ||
            msg.to_address?.split("@")[0] ||
            "Unknown",
          customer_email: msg.to_address || msg.from_address || "",
          subject: msg.subject || "(No Subject)",
          preview: (msg.content || "").substring(0, 120),
          received_at: msg.created_at || "",
          unread: msg.status === "pending" || msg.status === "received",
          status: msg.status,
          direction: (msg.direction as "inbound" | "outbound") || "outbound",
        }),
      );
    },
    retry: 1,
  });

  const filteredEmails = useMemo(() => {
    let items: EmailThread[] = emails || [];
    // Apply filter
    if (filter === "unread") items = items.filter((e) => e.unread);
    if (filter === "sent") items = items.filter((e) => e.direction === "outbound");
    // Apply search (client-side)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (e) =>
          e.customer_name.toLowerCase().includes(q) ||
          e.customer_email.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.preview.toLowerCase().includes(q),
      );
    }
    return items;
  }, [emails, filter, searchQuery]);

  const unreadCount = useMemo(
    () => (emails || []).filter((e: EmailThread) => e.unread).length,
    [emails],
  );

  const selectedEmail = useMemo(
    () => filteredEmails.find((e) => e.id === selectedEmailId) || null,
    [filteredEmails, selectedEmailId],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              Email Inbox
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold bg-purple-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {filteredEmails.length} email
              {filteredEmails.length !== 1 ? "s" : ""}
              {filter !== "all" && ` (${filter})`}
            </p>
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Compose
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs font-medium"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center bg-bg-card border border-border rounded-lg p-0.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  filter === tab.value
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-hover",
                )}
              >
                {tab.label}
                {tab.value === "unread" && unreadCount > 0 && (
                  <span className="ml-1 text-xs">({unreadCount})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Email List + Detail Panel ─────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Email list */}
        <div
          className={cn(
            "flex-1 overflow-y-auto",
            selectedEmail &&
              "hidden md:block md:max-w-[55%] md:border-r md:border-border",
          )}
        >
          {isLoading ? (
            <div className="p-8 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
              <p className="text-sm text-text-muted">Loading emails...</p>
            </div>
          ) : isError ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-7 h-7 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">
                Failed to load emails
              </h3>
              <p className="text-sm text-text-muted">
                Please try refreshing the page
              </p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-1">
                {searchQuery ? "No emails found" : "Your inbox is empty"}
              </h3>
              <p className="text-sm text-text-muted max-w-sm mx-auto">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "Customer emails will appear here as they arrive."}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                >
                  Compose first email
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredEmails.map((email) => {
                const isSelected = selectedEmailId === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() =>
                      setSelectedEmailId(isSelected ? null : email.id)
                    }
                    className={cn(
                      "w-full text-left px-4 sm:px-6 py-3.5 hover:bg-bg-hover transition-colors flex items-start gap-3",
                      isSelected &&
                        "bg-primary/5 border-l-3 border-l-primary",
                      email.unread && "bg-purple-50/50 dark:bg-purple-500/5",
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold",
                        getAvatarColor(email.customer_name),
                      )}
                    >
                      {getInitials(email.customer_name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            "text-sm truncate",
                            email.unread
                              ? "font-bold text-text-primary"
                              : "font-medium text-text-primary/80",
                          )}
                        >
                          {email.customer_name}
                        </span>
                        {email.direction === "outbound" && (
                          <span className="text-[10px] text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-medium">
                            SENT
                          </span>
                        )}
                        {email.unread && (
                          <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                        )}
                        <span className="text-xs text-text-muted ml-auto flex-shrink-0">
                          {relativeTime(email.received_at)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-sm truncate",
                          email.unread
                            ? "font-semibold text-text-primary"
                            : "text-text-secondary",
                        )}
                      >
                        {email.subject}
                      </p>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {email.preview}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Detail panel ─────────────────────────────────────────── */}
        {selectedEmail && (
          <div className="flex-1 flex flex-col bg-bg-card overflow-hidden md:min-w-[45%]">
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold",
                    getAvatarColor(selectedEmail.customer_name),
                  )}
                >
                  {getInitials(selectedEmail.customer_name)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">
                    {selectedEmail.customer_name}
                  </h3>
                  <p className="text-xs text-text-muted truncate">
                    {selectedEmail.customer_email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/communications/email-inbox/${selectedEmail.id}`}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-bg-hover transition-colors"
                >
                  Full Thread
                </Link>
                <button
                  onClick={() => setSelectedEmailId(null)}
                  className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="font-semibold text-text-primary text-lg mb-2">
                {selectedEmail.subject}
              </h4>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                    selectedEmail.direction === "inbound"
                      ? "bg-green-50 dark:bg-green-500/10 text-green-600"
                      : "bg-purple-50 dark:bg-purple-500/10 text-purple-600",
                  )}
                >
                  {selectedEmail.direction === "inbound"
                    ? "Received"
                    : "Sent"}
                </span>
                <span className="text-xs text-text-muted">
                  {selectedEmail.received_at
                    ? new Date(selectedEmail.received_at).toLocaleString()
                    : ""}
                </span>
              </div>
              <div className="prose prose-sm text-text-secondary max-w-none whitespace-pre-wrap">
                {selectedEmail.preview || "No content"}
              </div>
            </div>

            <div className="flex-shrink-0 p-4 border-t border-border">
              <Link
                to={`/communications/email-inbox/${selectedEmail.id}`}
                className="block w-full py-2.5 text-center rounded-lg font-medium text-sm text-white bg-purple-500 hover:bg-purple-600 transition-colors"
              >
                View Full Conversation
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom nav ─────────────────────────────────────────────── */}
      <CommunicationsNav />

      {/* Compose Modal */}
      <EmailComposeModal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  );
}
