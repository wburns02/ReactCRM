/**
 * Customer Support Chat Component
 * RAG-powered AI chat for customer support using R730 knowledge base
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useLocalAIHealth } from "@/hooks/useLocalAI";
import { apiClient } from "@/api/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
  confidence?: number;
}

interface CustomerSupportChatProps {
  customerId?: string;
  customerName?: string;
  context?: string;
  className?: string;
  onActionSuggested?: (action: SuggestedAction) => void;
}

interface SuggestedAction {
  type: "schedule" | "create_ticket" | "create_quote" | "call_back";
  label: string;
  data: Record<string, unknown>;
}

interface RAGResponse {
  answer: string;
  sources?: string[];
  confidence?: number;
  suggested_actions?: SuggestedAction[];
}

/**
 * RAG-powered customer support chat
 */
export function CustomerSupportChat({
  customerId,
  customerName,
  context,
  className = "",
  onActionSuggested,
}: CustomerSupportChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your AI assistant powered by our septic knowledge base. I can help answer questions about:

• **Septic system maintenance** - pumping schedules, care tips
• **Service information** - pricing, scheduling, what to expect
• **Troubleshooting** - common issues and solutions
• **Regulations** - permits, inspections, compliance

How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: aiHealth } = useLocalAIHealth();
  const isAIAvailable = aiHealth?.status === "healthy" || aiHealth?.status === "degraded";

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to RAG system
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Build context for RAG query
      const queryContext = [
        context,
        customerId && `Customer ID: ${customerId}`,
        customerName && `Customer: ${customerName}`,
      ].filter(Boolean).join(". ");

      // Try R730 RAG endpoint first
      let response: RAGResponse;
      try {
        const { data } = await apiClient.post("/local-ai/rag/ask", {
          question: userMessage.content,
          context: queryContext,
          collection: "septic_knowledge",
        });
        response = data;
      } catch {
        // Fallback to basic chat if RAG not available
        const { data } = await apiClient.post("/local-ai/chat", {
          message: userMessage.content,
          context: queryContext,
        });
        response = { answer: data.response || data.content || "I apologize, but I couldn't process your request." };
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        confidence: response.confidence,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle suggested actions
      if (response.suggested_actions && onActionSuggested) {
        response.suggested_actions.forEach(action => {
          onActionSuggested(action);
        });
      }

    } catch (err) {
      console.error("Chat error:", err);
      setError("Failed to get response. Please try again.");

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting to my knowledge base. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, context, customerId, customerName, onActionSuggested]);

  // Handle enter key
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([{
      id: "welcome-new",
      role: "assistant",
      content: "Chat cleared. How can I help you?",
      timestamp: new Date(),
    }]);
    setError(null);
  }, []);

  // Quick action buttons
  const quickActions = [
    { label: "Pumping schedule", query: "How often should I pump my septic tank?" },
    { label: "Warning signs", query: "What are signs my septic system needs attention?" },
    { label: "Maintenance tips", query: "What are the best practices for septic system care?" },
    { label: "Pricing info", query: "What does septic pumping typically cost?" },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Support Chat
            {customerName && (
              <span className="text-text-muted font-normal">- {customerName}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {aiHealth && (
              <Badge variant={isAIAvailable ? "success" : "secondary"}>
                {isAIAvailable ? "RAG Ready" : "AI Offline"}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-7 w-7 p-0"
              title="Clear chat"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Messages Area */}
        <div className="h-80 overflow-y-auto p-4 space-y-4 border-t border-b border-border">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-bg-muted text-text-primary"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-text-muted mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.map((source, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence */}
                {message.confidence !== undefined && (
                  <div className="mt-1 text-xs text-text-muted">
                    Confidence: {Math.round(message.confidence * 100)}%
                  </div>
                )}

                {/* Timestamp */}
                <div className={`text-xs mt-1 ${message.role === "user" ? "text-white/70" : "text-text-muted"}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching knowledge base...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-danger/10 border-b border-danger/30">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-4 py-2 border-b border-border">
          <div className="flex flex-wrap gap-1">
            {quickActions.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs h-6"
                onClick={() => {
                  setInput(action.query);
                  inputRef.current?.focus();
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about septic systems..."
              disabled={isLoading || !isAIAvailable}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || !isAIAvailable}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Powered by RAG with septic domain knowledge
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerSupportChat;
