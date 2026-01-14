import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

interface EmailMessage {
  id: number;
  subject: string;
  body: string;
  direction: "inbound" | "outbound";
  sent_at: string;
  from_email: string;
  to_email: string;
}

/**
 * Email Conversation Thread
 */
export function EmailConversation() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isReplying, setIsReplying] = useState(false);
  const [reply, setReply] = useState("");

  const { data: conversation, isLoading } = useQuery({
    queryKey: ["email-conversation", id],
    queryFn: async () => {
      const response = await apiClient.get(`/email/conversations/${id}`);
      return response.data;
    },
    enabled: !!id,
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
    },
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-bg-card">
        <div className="flex items-center gap-3">
          <Link
            to="/communications/email-inbox"
            className="text-text-muted hover:text-text-primary"
          >
            &larr;
          </Link>
          <div className="flex-1">
            <h1 className="font-medium text-text-primary">
              {conversation?.subject || "No Subject"}
            </h1>
            <p className="text-sm text-text-muted">
              {conversation?.customer_name} &lt;{conversation?.customer_email}
              &gt;
            </p>
          </div>
          <button
            onClick={() => setIsReplying(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            Reply
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {conversation?.messages?.map((email: EmailMessage) => (
          <div
            key={email.id}
            className="bg-bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                    email.direction === "outbound"
                      ? "bg-primary/20 text-primary"
                      : "bg-purple-500/20 text-purple-500"
                  }`}
                >
                  {email.direction === "outbound"
                    ? "Me"
                    : email.from_email?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-text-primary text-sm">
                    {email.direction === "outbound" ? "You" : email.from_email}
                  </p>
                  <p className="text-xs text-text-muted">to {email.to_email}</p>
                </div>
              </div>
              <span className="text-xs text-text-muted">{email.sent_at}</span>
            </div>
            <div className="text-text-secondary whitespace-pre-wrap">
              {email.body}
            </div>
          </div>
        ))}
      </div>

      {/* Reply Form */}
      {isReplying && (
        <div className="p-4 border-t border-border bg-bg-card">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..."
            rows={4}
            className="w-full px-4 py-3 border border-border rounded-lg bg-bg-body text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary mb-3"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsReplying(false);
                setReply("");
              }}
              className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={() => replyMutation.mutate(reply)}
              disabled={!reply.trim() || replyMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {replyMutation.isPending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
