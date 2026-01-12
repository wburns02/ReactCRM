import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { EmailComposeModal } from "../components/EmailComposeModal";

interface EmailConversation {
  id: number;
  customer_name: string;
  customer_email: string;
  subject: string;
  preview: string;
  received_at: string;
  unread: boolean;
}

/**
 * Email Inbox - List of email conversations
 */
export function EmailInbox() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const { data: emails, isLoading } = useQuery({
    queryKey: ["email-conversations", searchQuery, filter],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/email/conversations", {
          params: {
            search: searchQuery || undefined,
            unread_only: filter === "unread" || undefined,
          },
        });
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Email Inbox
            </h1>
            <p className="text-sm text-text-muted">
              Customer email conversations
            </p>
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            Compose
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "unread")}
            className="px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : emails?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <span className="text-4xl block mb-2">📧</span>
            <p>No emails</p>
            <p className="text-sm mt-2">Customer emails will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {emails?.map((email: EmailConversation) => (
              <Link
                key={email.id}
                to={`/communications/email-inbox/${email.id}`}
                className={`block p-4 hover:bg-bg-hover transition-colors ${
                  email.unread ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center font-medium">
                    {email.customer_name?.charAt(0) || "@"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`truncate ${email.unread ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`}
                      >
                        {email.customer_name || email.customer_email}
                      </h3>
                      <span className="text-xs text-text-muted ml-2">
                        {email.received_at}
                      </span>
                    </div>
                    <p
                      className={`text-sm truncate ${email.unread ? "text-text-primary" : "text-text-secondary"}`}
                    >
                      {email.subject}
                    </p>
                    <p className="text-sm text-text-muted truncate">
                      {email.preview}
                    </p>
                  </div>
                  {email.unread && (
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <EmailComposeModal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  );
}
