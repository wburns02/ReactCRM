import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  MessageCircle,
  Send,
  X,
  Circle,
  Clock,
  User,
  Search,
  CheckCheck,
  Trash2,
  XCircle,
  Eye,
  Phone,
  PhoneCall,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: "visitor" | "agent";
  sender_name?: string;
  created_at: string;
}

interface ChatConversation {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  status: "active" | "closed";
  unread_count: number;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  messages?: ChatMessage[];
  callback_requested?: boolean;
}

interface ChatStatus {
  online: boolean;
  hours: string;
  days: string;
  message: string;
  current_time_cst: string;
}

type FilterStatus = "active" | "closed" | "all";

interface ContextMenuState {
  x: number;
  y: number;
  conversationId: string;
  status: "active" | "closed";
  unreadCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

// ── Component ────────────────────────────────────────────────────────────

export function LiveChatPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active");
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch business hours status ─────────────────────────────────────

  const { data: chatStatus } = useQuery({
    queryKey: ["chat-status"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/chat/status");
        return response.data as ChatStatus;
      } catch {
        return null;
      }
    },
    refetchInterval: 60000, // check every minute
    staleTime: 30000,
  });

  // ── Fetch conversations list ─────────────────────────────────────────

  const { data: conversations = [], isLoading: loadingConversations } =
    useQuery({
      queryKey: ["chat-conversations", filterStatus],
      queryFn: async () => {
        try {
          const response = await apiClient.get("/chat/conversations", {
            params: { status: filterStatus },
          });
          return (response.data.items || response.data || []) as ChatConversation[];
        } catch {
          return [];
        }
      },
      refetchInterval: 5000,
    });

  // ── Fetch selected conversation messages ─────────────────────────────

  const { data: selectedConversation, isLoading: loadingMessages } = useQuery({
    queryKey: ["chat-conversation", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      try {
        const response = await apiClient.get(
          `/chat/conversations/${selectedId}`,
        );
        return response.data as ChatConversation;
      } catch {
        return null;
      }
    },
    enabled: !!selectedId,
    refetchInterval: 3000,
  });

  const messages = selectedConversation?.messages || [];

  // ── Send reply mutation ──────────────────────────────────────────────

  const sendReplyMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const response = await apiClient.post(
        `/chat/conversations/${id}/reply`,
        { content },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setMessageText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
  });

  // ── Context menu state ───────────────────────────────────────────────

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Close conversation mutation ──────────────────────────────────────

  const closeConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/chat/conversations/${id}`, {
        status: "closed",
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversation", selectedId] });
    },
  });

  // ── Mark as read mutation ──────────────────────────────────────────

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/chat/conversations/${id}/mark-read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  // ── Delete conversation mutation ───────────────────────────────────

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/chat/conversations/${id}`);
      return response.data;
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      if (selectedId === deletedId) setSelectedId(null);
    },
  });

  // ── Context menu handlers ──────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, conv: ChatConversation) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        conversationId: conv.id,
        status: conv.status,
        unreadCount: conv.unread_count,
      });
    },
    [],
  );

  // Close context menu on click anywhere (delayed to avoid catching the opening event)
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      // Don't close if clicking inside the context menu itself
      const target = e.target as HTMLElement;
      if (target.closest("[data-context-menu]")) return;
      setContextMenu(null);
    };
    // Delay attachment so the opening right-click doesn't immediately dismiss
    const raf = requestAnimationFrame(() => {
      window.addEventListener("click", handler);
      window.addEventListener("contextmenu", handler);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("click", handler);
      window.removeEventListener("contextmenu", handler);
    };
  }, [contextMenu]);

  // ── Auto-scroll to bottom on new messages ────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Handle send ──────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = messageText.trim();
    if (!trimmed || !selectedId) return;
    sendReplyMutation.mutate({ id: selectedId, content: trimmed });
  }, [messageText, selectedId, sendReplyMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Auto-resize textarea ─────────────────────────────────────────────

  const handleTextareaInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, []);

  // ── Filter conversations by search ───────────────────────────────────

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.visitor_name || "Anonymous Visitor").toLowerCase().includes(q) ||
        c.visitor_email?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  const activeCount = useMemo(
    () => conversations.filter((c) => c.status === "active").length,
    [conversations],
  );

  const selectedConvSummary = conversations.find((c) => c.id === selectedId);
  const visitorName =
    selectedConvSummary?.visitor_name ||
    selectedConversation?.visitor_name ||
    "Anonymous Visitor";
  const visitorEmail =
    selectedConvSummary?.visitor_email || selectedConversation?.visitor_email;
  const visitorPhone = selectedConvSummary?.visitor_phone;
  const convStatus =
    selectedConvSummary?.status || selectedConversation?.status || "active";
  const isCallback = selectedConvSummary?.callback_requested;

  // ── Filter tabs ──────────────────────────────────────────────────────

  const filterTabs: { value: FilterStatus; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "closed", label: "Closed" },
    { value: "all", label: "All" },
  ];

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Status banner ────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-4 py-2.5 text-white rounded-t-xl flex-shrink-0 ${
        activeCount > 0
          ? "bg-gradient-to-r from-green-600 to-emerald-600"
          : chatStatus?.online
            ? "bg-gradient-to-r from-blue-600 to-blue-500"
            : "bg-gradient-to-r from-gray-600 to-gray-500"
      }`}>
        <span className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            chatStatus?.online ? "bg-white" : "bg-amber-300"
          }`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${
            chatStatus?.online ? "bg-white" : "bg-amber-300"
          }`} />
        </span>
        <span className="text-sm font-semibold">
          {activeCount > 0 ? (
            <>
              {activeCount} active conversation{activeCount !== 1 ? "s" : ""}
              {totalUnread > 0 && ` — ${totalUnread} unread message${totalUnread !== 1 ? "s" : ""}`}
            </>
          ) : chatStatus?.online ? (
            "Online — Ready for chats"
          ) : (
            "Offline — Customers can leave messages"
          )}
        </span>
        <span className="text-xs opacity-80 ml-auto flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {chatStatus?.hours || "8:00 AM – 5:00 PM CST"} · {chatStatus?.days || "Mon–Fri"}
        </span>
      </div>

      <div className="flex flex-1 bg-white dark:bg-gray-900 rounded-b-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* ── Left Panel: Conversation List ─────────────────────────────── */}
      <div className="w-[350px] flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Live Chat
              </h1>
            </div>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full animate-pulse">
                {activeCount} active
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/40 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterStatus === tab.value
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations && filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-green-500 rounded-full" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No conversations
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {filterStatus === "active"
                  ? "No active chats right now"
                  : "No conversations found"}
              </p>
            </div>
          ) : (
            <ul>
              {filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const isActive = conv.status === "active";
                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => setSelectedId(conv.id)}
                      onContextMenu={(e) => handleContextMenu(e, conv)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors ${
                        isSelected
                          ? "bg-green-50 dark:bg-green-900/20 border-l-2 border-l-green-500"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <Circle
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                              isActive
                                ? "text-green-500 fill-green-500"
                                : "text-gray-400 fill-gray-400"
                            }`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                              {conv.visitor_name || "Anonymous Visitor"}
                              {conv.callback_requested && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  <PhoneCall className="w-2.5 h-2.5" />
                                  CALLBACK
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                              {conv.last_message_at
                                ? relativeTime(conv.last_message_at)
                                : relativeTime(conv.created_at)}
                            </span>
                          </div>
                          {conv.callback_requested && conv.visitor_phone && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {conv.visitor_phone}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {truncate(conv.last_message || "No messages yet", 60)}
                          </p>
                        </div>

                        {/* Unread badge */}
                        {conv.unread_count > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-green-600 text-white text-[10px] font-bold rounded-full">
                            {conv.unread_count > 9 ? "9+" : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right Panel: Chat View ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Select a conversation
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Choose a conversation from the list to view messages and respond to
              website visitors.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <Circle
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${
                      convStatus === "active"
                        ? "text-green-500 fill-green-500"
                        : "text-gray-400 fill-gray-400"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                    {visitorName}
                    {isCallback && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <PhoneCall className="w-3 h-3" />
                        CALLBACK REQUESTED
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {isCallback && visitorPhone && (
                      <a href={`tel:${visitorPhone}`} className="text-amber-600 dark:text-amber-400 font-medium hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {visitorPhone}
                      </a>
                    )}
                    {visitorEmail && (
                      <span className="truncate">{visitorEmail}</span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        convStatus === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      <Circle
                        className={`w-1.5 h-1.5 ${
                          convStatus === "active"
                            ? "fill-green-600 text-green-600"
                            : "fill-gray-500 text-gray-500"
                        }`}
                      />
                      {convStatus === "active" ? "Active" : "Closed"}
                    </span>
                  </div>
                </div>
              </div>

              {convStatus === "active" && (
                <button
                  onClick={() => closeConversationMutation.mutate(selectedId)}
                  disabled={closeConversationMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Close Chat
                </button>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-green-500 rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No messages yet
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isAgent = msg.sender_type === "agent";
                    const showTimestamp =
                      idx === 0 ||
                      new Date(msg.created_at).getTime() -
                        new Date(messages[idx - 1].created_at).getTime() >
                        5 * 60 * 1000;

                    return (
                      <div key={msg.id}>
                        {showTimestamp && (
                          <div className="flex justify-center my-3">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                              {new Date(msg.created_at).toLocaleString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isAgent
                                ? "bg-green-600 text-white rounded-br-md"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md"
                            }`}
                          >
                            {!isAgent && msg.sender_name && (
                              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">
                                {msg.sender_name}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isAgent
                                  ? "text-green-200"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString(
                                undefined,
                                { hour: "numeric", minute: "2-digit" },
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            {convStatus === "active" ? (
              <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      handleTextareaInput();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={
                      !messageText.trim() || sendReplyMutation.isPending
                    }
                    className="flex items-center justify-center w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {sendReplyMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {sendReplyMutation.isError && (
                  <p className="text-xs text-red-500 mt-1.5">
                    Failed to send message. Please try again.
                  </p>
                )}
              </div>
            ) : (
              <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  This conversation has been closed.
                </p>
              </div>
            )}
          </>
        )}
      </div>
      </div>
      {/* ── Right-click Context Menu ──────────────────────────────────── */}
      {contextMenu && (
        <div
          data-context-menu
          className="fixed z-50 min-w-[180px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 py-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 220),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSelectedId(contextMenu.conversationId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Eye className="w-4 h-4 text-gray-500" />
            Open Conversation
          </button>
          {contextMenu.unreadCount > 0 && (
            <button
              onClick={() => {
                markAsReadMutation.mutate(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-blue-500" />
              Mark as Read
            </button>
          )}
          {contextMenu.status === "active" && (
            <button
              onClick={() => {
                closeConversationMutation.mutate(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XCircle className="w-4 h-4 text-amber-500" />
              Close Conversation
            </button>
          )}
          <div className="my-1 border-t border-gray-200 dark:border-gray-600" />
          <button
            onClick={() => {
              if (confirm("Delete this conversation? This cannot be undone.")) {
                deleteConversationMutation.mutate(contextMenu.conversationId);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Conversation
          </button>
        </div>
      )}
    </div>
  );
}
