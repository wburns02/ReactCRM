import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

interface ChatConversationSummary {
  id: string;
  unread_count: number;
  status: string;
}

/**
 * Lightweight hook that polls for unread live chat count.
 * Used by the sidebar to show a dynamic badge.
 */
export function useLiveChatUnread() {
  const { data } = useQuery({
    queryKey: ["chat-conversations", "active"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/chat/conversations", {
          params: { status: "active" },
        });
        return (response.data.items || response.data || []) as ChatConversationSummary[];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const conversations = data ?? [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const activeCount = conversations.length;

  return { totalUnread, activeCount };
}
