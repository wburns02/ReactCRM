import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { toastError } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  getInitials,
  getAvatarColor,
  formatMessageTime,
  getDateLabel,
  getStatusIcon,
} from "../utils";

// ── Types ────────────────────────────────────────────────────────────────

interface Message {
  id: number | string;
  content: string;
  direction: "inbound" | "outbound";
  sent_at: string;
  status: string;
}

interface ConversationData {
  customer_name?: string;
  phone_number?: string;
  messages?: Message[];
}

// ── Component ────────────────────────────────────────────────────────────

export function SMSConversation() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation, isLoading } = useQuery<ConversationData>({
    queryKey: ["sms-conversation", id],
    queryFn: async () => {
      const response = await apiClient.get(`/sms/conversations/${id}`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiClient.post("/communications/sms/send", {
        conversation_id: id,
        content,
      });
    },
    onSuccess: () => {
      setMessage("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      queryClient.invalidateQueries({ queryKey: ["sms-conversation", id] });
    },
    onError: () => {
      toastError("Failed to send", "Your message could not be delivered. Please try again.");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const messages = conversation?.messages || [];
    const groups: { label: string; messages: Message[] }[] = [];
    let currentLabel = "";
    for (const msg of messages) {
      const label = getDateLabel(msg.sent_at);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, [conversation?.messages]);

  const customerName = conversation?.customer_name || "Unknown";
  const phoneNumber = conversation?.phone_number || "";
  const charCount = message.length;
  const smsCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <p className="text-sm text-text-muted">Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-border bg-bg-card flex items-center gap-3">
        <Link
          to="/communications/sms"
          className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold",
            getAvatarColor(customerName),
          )}
        >
          {getInitials(customerName)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-text-primary text-sm truncate">
            {customerName}
          </h1>
          <p className="text-xs text-text-muted truncate">{phoneNumber}</p>
        </div>
        <Link
          to={`/communications`}
          className="p-2 rounded-md hover:bg-bg-hover text-text-muted transition-colors"
          title="View in Unified Inbox"
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </Link>
      </div>

      {/* ── Messages ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-bg-body">
        {(conversation?.messages?.length || 0) === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-7 h-7 text-blue-500"
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
            <p className="text-text-muted text-sm">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.label}>
              {/* Date separator */}
              {group.label && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-muted font-medium px-2">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              <div className="space-y-2">
                {group.messages.map((msg) => {
                  const isOutbound = msg.direction === "outbound";
                  const statusText = getStatusIcon(msg.status);
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        isOutbound ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm",
                          isOutbound
                            ? "bg-blue-500 text-white rounded-br-md"
                            : "bg-bg-card border border-border text-text-primary rounded-bl-md",
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 mt-1",
                            isOutbound ? "justify-end" : "justify-start",
                          )}
                        >
                          <span
                            className={cn(
                              "text-[11px]",
                              isOutbound
                                ? "text-white/60"
                                : "text-text-muted",
                            )}
                          >
                            {formatMessageTime(msg.sent_at)}
                          </span>
                          {isOutbound && statusText && (
                            <span
                              className={cn(
                                "text-[10px]",
                                msg.status === "failed"
                                  ? "text-red-200"
                                  : "text-white/50",
                              )}
                            >
                              {statusText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Input ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border bg-bg-card px-4 sm:px-6 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 border border-border rounded-2xl bg-bg-body text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none overflow-hidden"
              style={{ minHeight: "42px" }}
            />
            {charCount > 0 && (
              <span className="absolute right-3 bottom-1.5 text-[10px] text-text-muted">
                {charCount}
                {smsCount > 1 && ` (${smsCount} SMS)`}
              </span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
              message.trim()
                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                : "bg-bg-hover text-text-muted",
            )}
          >
            {sendMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-1 ml-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
