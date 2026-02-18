import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { SMSComposeModal } from "@/features/sms/SMSComposeModal";
import { CommunicationsNav } from "../components/CommunicationsNav";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getInitials, getAvatarColor, relativeTime } from "../utils";

// ── Types ────────────────────────────────────────────────────────────────

interface Conversation {
  id: number | string;
  customer_name: string;
  phone_number: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  direction?: "inbound" | "outbound";
}

// ── Component ────────────────────────────────────────────────────────────

export function SMSInbox() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["sms-conversations", searchQuery],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/sms/conversations", {
          params: { search: searchQuery || undefined },
        });
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const filteredConversations = useMemo(() => {
    const items: Conversation[] = conversations || [];
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (c) =>
        c.customer_name?.toLowerCase().includes(q) ||
        c.phone_number?.includes(q) ||
        c.last_message?.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(
    () =>
      (conversations || []).reduce(
        (sum: number, c: Conversation) => sum + (c.unread_count || 0),
        0,
      ),
    [conversations],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              SMS Inbox
              {totalUnread > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                  {totalUnread}
                </span>
              )}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {filteredConversations.length} conversation
              {filteredConversations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Message
          </button>
        </div>

        {/* Search */}
        <div className="relative">
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
            placeholder="Search by name, phone number, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm"
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
      </div>

      {/* ── Conversations List ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <p className="text-sm text-text-muted">
              Loading conversations...
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">
              {searchQuery ? "No conversations found" : "No SMS conversations yet"}
            </h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "Start texting your customers. SMS conversations will appear here as they come in."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsComposeOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                Send first message
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation: Conversation) => {
              const hasUnread = conversation.unread_count > 0;
              return (
                <Link
                  key={conversation.id}
                  to={`/communications/sms/${conversation.id}`}
                  className={cn(
                    "flex items-start gap-3 px-4 sm:px-6 py-4 hover:bg-bg-hover transition-colors",
                    hasUnread && "bg-blue-50/50 dark:bg-blue-500/5",
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold",
                      getAvatarColor(
                        conversation.customer_name || conversation.phone_number,
                      ),
                    )}
                  >
                    {getInitials(
                      conversation.customer_name || conversation.phone_number,
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3
                        className={cn(
                          "text-sm truncate",
                          hasUnread
                            ? "font-bold text-text-primary"
                            : "font-medium text-text-primary",
                        )}
                      >
                        {conversation.customer_name || conversation.phone_number}
                      </h3>
                      <span className="text-xs text-text-muted ml-2 flex-shrink-0">
                        {relativeTime(conversation.last_message_time)}
                      </span>
                    </div>
                    {conversation.customer_name && (
                      <p className="text-xs text-text-muted mb-0.5">
                        {conversation.phone_number}
                      </p>
                    )}
                    <p
                      className={cn(
                        "text-sm truncate",
                        hasUnread
                          ? "text-text-primary font-medium"
                          : "text-text-muted",
                      )}
                    >
                      {conversation.direction === "outbound" && (
                        <span className="text-text-muted font-normal">
                          You:{" "}
                        </span>
                      )}
                      {conversation.last_message || "No messages yet"}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {hasUnread && (
                    <div className="flex-shrink-0 mt-1">
                      <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                        {conversation.unread_count}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom nav ─────────────────────────────────────────────── */}
      <CommunicationsNav />

      {/* Compose Modal */}
      <SMSComposeModal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  );
}
