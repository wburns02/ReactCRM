import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { SMSComposeModal } from "@/features/sms/SMSComposeModal";

interface Conversation {
  id: number;
  customer_name: string;
  phone_number: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

/**
 * SMS Inbox - List of SMS conversations
 */
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              SMS Inbox
            </h1>
            <p className="text-sm text-text-muted">Manage SMS conversations</p>
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            New Message
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : conversations?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <span className="text-4xl block mb-2">📱</span>
            <p>No SMS conversations</p>
            <p className="text-sm mt-2">
              Start a conversation by sending an SMS
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations?.map((conversation: Conversation) => (
              <Link
                key={conversation.id}
                to={`/communications/sms/${conversation.id}`}
                className="block p-4 hover:bg-bg-hover transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium">
                    {conversation.customer_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-text-primary truncate">
                        {conversation.customer_name ||
                          conversation.phone_number}
                      </h3>
                      <span className="text-xs text-text-muted">
                        {conversation.last_message_time}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary truncate">
                      {conversation.last_message}
                    </p>
                  </div>
                  {conversation.unread_count > 0 && (
                    <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <SMSComposeModal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  );
}
