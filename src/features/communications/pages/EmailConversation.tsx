import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { getInitials, getAvatarColor, formatDate } from "../utils";

// ── Types ────────────────────────────────────────────────────────────────

interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  direction: "inbound" | "outbound";
  sent_at: string;
  from_email: string;
  to_email: string;
}

interface ConversationData {
  subject?: string;
  customer_name?: string;
  customer_email?: string;
  messages?: EmailMessage[];
}

// ── Component ────────────────────────────────────────────────────────────

export function EmailConversation() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isReplying, setIsReplying] = useState(false);
  const [reply, setReply] = useState("");

  const {
    data: conversation,
    isLoading,
    isError,
  } = useQuery<ConversationData>({
    queryKey: ["email-conversation", id],
    queryFn: async () => {
      const response = await apiClient.get(`/email/conversations/${id}`);
      return response.data;
    },
    enabled: !!id,
    retry: 1,
  });

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      await apiClient.post("/email/reply", {
        conversation_id: id,
        body,
      });
    },
    onSuccess: () => {
      setReply("");
      setIsReplying(false);
      queryClient.invalidateQueries({ queryKey: ["email-conversation", id] });
      toastSuccess("Reply sent");
    },
    onError: () => {
      toastError("Failed to send reply");
    },
  });

  const customerName = conversation?.customer_name || "Unknown";
  const customerEmail = conversation?.customer_email || "";
  const messageCount = conversation?.messages?.length || 0;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        <p className="text-sm text-text-muted">Loading email thread...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
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
        <h3 className="font-semibold text-text-primary">
          Failed to load email
        </h3>
        <p className="text-sm text-text-muted">
          This conversation may have been deleted or moved
        </p>
        <Link
          to="/communications/email-inbox"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Back to Inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-border bg-bg-card">
        <div className="flex items-center gap-3">
          <Link
            to="/communications/email-inbox"
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
              {conversation?.subject || "No Subject"}
            </h1>
            <p className="text-xs text-text-muted truncate">
              {customerName} &lt;{customerEmail}&gt; &middot; {messageCount}{" "}
              message{messageCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setIsReplying(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
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
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            Reply
          </button>
        </div>
      </div>

      {/* ── Messages Thread ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {conversation?.messages?.map((email, index) => {
          const isOutbound = email.direction === "outbound";
          const isLast = index === (conversation.messages?.length || 0) - 1;
          const senderName = isOutbound ? "You" : email.from_email;
          const senderEmail = isOutbound ? email.from_email : email.from_email;
          return (
            <div
              key={email.id}
              className={cn(
                "bg-bg-card border rounded-xl overflow-hidden transition-shadow",
                isLast
                  ? "border-primary/30 shadow-sm"
                  : "border-border",
              )}
            >
              {/* Email header */}
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold",
                    isOutbound
                      ? "bg-purple-500"
                      : getAvatarColor(senderEmail),
                  )}
                >
                  {isOutbound ? "You" : getInitials(senderEmail)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-text-primary">
                      {senderName}
                    </span>
                    {isOutbound && (
                      <span className="text-[10px] text-text-muted bg-bg-hover px-1.5 py-0.5 rounded font-medium">
                        SENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted truncate">
                    to {email.to_email}
                  </p>
                </div>
                <span className="text-xs text-text-muted flex-shrink-0">
                  {formatDate(email.sent_at)}
                </span>
              </div>

              {/* Email body */}
              <div className="px-5 py-4">
                <div className="prose prose-sm text-text-secondary max-w-none whitespace-pre-wrap leading-relaxed">
                  {email.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Reply Form ────────────────────────────────────────────── */}
      {isReplying && (
        <div className="flex-shrink-0 border-t border-border bg-bg-card p-4 sm:p-6">
          <div className="bg-bg-body border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-xs text-text-muted">
                Reply to{" "}
                <span className="font-medium text-text-secondary">
                  {customerName}
                </span>{" "}
                &lt;{customerEmail}&gt;
              </p>
            </div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your reply..."
              rows={5}
              autoFocus
              className="w-full px-4 py-3 bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none text-sm resize-none"
            />
            <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {reply.length} characters
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsReplying(false);
                    setReply("");
                  }}
                  className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => replyMutation.mutate(reply)}
                  disabled={!reply.trim() || replyMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
                >
                  {replyMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
