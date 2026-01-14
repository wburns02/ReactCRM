/**
 * AI Assistant Page
 * Full-page AI chat interface with enhanced features
 * Includes: Chat, Voice Memo, Support Chat, Batch OCR
 */
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Trash2,
  History,
  Lightbulb,
  MessageSquare,
  BarChart3,
  Users,
  Calendar,
  FileText,
  Sparkles,
  Mic,
  HelpCircle,
  FileStack,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAIChat, useAIChatHistory } from "@/hooks/useAI";
import { useLocalAIHealth } from "@/hooks/useLocalAI";
import type { AIMessage } from "@/api/ai";

// Lazy load heavy AI components
import { VoiceMemoRecorder } from "@/components/ai/VoiceMemoRecorder";
import { CustomerSupportChat } from "@/components/ai/CustomerSupportChat";
import { BatchOCRProcessor } from "@/components/ai/BatchOCRProcessor";

type AITab = "chat" | "voice" | "support" | "ocr";

const AI_TABS: { id: AITab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "chat", label: "AI Chat", icon: Bot, description: "General AI assistant" },
  { id: "voice", label: "Voice Memo", icon: Mic, description: "Record & transcribe" },
  { id: "support", label: "Support Chat", icon: HelpCircle, description: "RAG-powered Q&A" },
  { id: "ocr", label: "Batch OCR", icon: FileStack, description: "Document processing" },
];

/**
 * Quick action suggestions for the AI
 */
const QUICK_ACTIONS = [
  {
    icon: Users,
    label: "Customer lookup",
    prompt: "Help me find a customer",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Calendar,
    label: "Schedule optimization",
    prompt: "What's the best time slot for the next available job?",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: BarChart3,
    label: "Revenue report",
    prompt: "Show me revenue trends for this month",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: FileText,
    label: "Create work order",
    prompt: "Help me create a new work order",
    color: "bg-orange-100 text-orange-600",
  },
];

/**
 * AI Assistant full page component
 */
export function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<AITab>("chat");
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, clearChat, isTyping, isLoading } = useAIChat({
    current_page: "/ai-assistant",
  });

  const { data: chatHistory } = useAIChatHistory();
  const { data: aiHealth } = useLocalAIHealth();
  const isR730Available = aiHealth?.status === "healthy" || aiHealth?.status === "degraded";

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="h-full flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-bg-card px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-text-primary">
                  AI Assistant
                </h1>
                <p className="text-sm text-text-muted">
                  Your intelligent CRM companion
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isR730Available ? "success" : "secondary"}>
                {isR730Available ? "R730 Online" : "R730 Offline"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="md:hidden"
              >
                <History className="w-4 h-4" />
              </Button>
              {activeTab === "chat" && (
                <Button variant="ghost" size="sm" onClick={clearChat}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
          {/* Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto">
            {AI_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-bg-body">
          {/* Voice Memo Tab */}
          {activeTab === "voice" && (
            <div className="p-6 max-w-2xl mx-auto">
              <VoiceMemoRecorder
                onTranscriptionComplete={(result) => {
                  console.log("Transcription complete:", result);
                }}
              />
            </div>
          )}

          {/* Support Chat Tab */}
          {activeTab === "support" && (
            <div className="p-6 max-w-3xl mx-auto">
              <CustomerSupportChat />
            </div>
          )}

          {/* Batch OCR Tab */}
          {activeTab === "ocr" && (
            <div className="p-6 max-w-3xl mx-auto">
              <BatchOCRProcessor
                onComplete={(results) => {
                  console.log("Batch OCR complete:", results);
                }}
              />
            </div>
          )}

          {/* Chat Tab (default) */}
          {activeTab === "chat" && (
            <div className="p-6 space-y-6">
          {messages.length === 1 && (
            <div className="max-w-2xl mx-auto">
              {/* Welcome Section */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  How can I help you today?
                </h2>
                <p className="text-text-muted">
                  I can assist with customers, scheduling, analytics, and more.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="flex items-center gap-3 p-4 bg-bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all text-left"
                  >
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.slice(1).map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 text-text-muted bg-bg-card rounded-lg px-4 py-3 border border-border">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <span
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
            </div>
          )}
        </div>

        {/* Input Area - Only show for chat tab */}
        {activeTab === "chat" && (
        <div className="border-t border-border bg-bg-card p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your CRM..."
                  className="w-full px-4 py-3 pr-12 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-bg-body resize-none min-h-[48px] max-h-[150px]"
                  disabled={isLoading}
                  rows={1}
                />
                <div className="absolute right-2 bottom-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!input.trim() || isLoading}
                    className="rounded-lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
        )}
      </div>

      {/* Sidebar - History & Suggestions */}
      <aside
        className={`w-80 border-l border-border bg-bg-card flex-col ${
          showHistory ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-text-primary flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Conversations
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {chatHistory && chatHistory.length > 0 ? (
              chatHistory.slice(0, 10).map((session) => (
                <button
                  key={session.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-bg-hover transition-colors"
                >
                  <p className="text-sm font-medium text-text-primary truncate">
                    {session.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            ) : (
              <p className="text-sm text-text-muted text-center py-4">
                No conversation history yet
              </p>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="p-4 border-t border-border">
          <h3 className="font-medium text-text-primary flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-warning" />
            Tips
          </h3>
          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Ask about customer history and preferences
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Get scheduling recommendations
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Generate reports and analytics
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

/**
 * Individual chat message component
 */
function ChatMessage({ message }: { message: AIMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-primary text-white" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <MessageSquare className="w-4 h-4" />
        ) : (
          <Sparkles className="w-4 h-4 text-primary" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-primary text-white"
            : "bg-bg-card border border-border text-text-primary"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div
          className={`text-xs mt-2 ${isUser ? "text-white/70" : "text-text-muted"}`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

export default AIAssistantPage;
