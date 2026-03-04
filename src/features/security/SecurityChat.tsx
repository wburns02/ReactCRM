import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, Bot, User, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { streamSocChat } from "@/api/socClient";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUERIES = [
  "Summarize our security posture",
  "What are the most critical alerts recently?",
  "Help me draft a customer follow-up email",
  "What's the best way to optimize our technician routes?",
  "Explain our ransomware detection capabilities",
];

export function SecurityChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || isStreaming) return;

      const userMsg: Message = { role: "user", content: query.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        for await (const chunk of streamSocChat(query.trim())) {
          const token = chunk.token || chunk.content || "";
          if (token) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + token,
                };
              }
              return updated;
            });
          }
        }
      } catch (err) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: `Error: ${err instanceof Error ? err.message : "Failed to connect to SOC AI"}`,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">AI Copilot</h1>
            <p className="text-sm text-text-secondary">
              Ask anything — powered by Qwen3 32B + RAG
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 py-12">
            <Bot className="w-16 h-16 text-purple-500/30" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                AI Copilot
              </h2>
              <p className="text-sm text-text-secondary max-w-md">
                Ask me anything — security analysis, business questions, drafting emails,
                technical support, or general knowledge. I have deep security expertise
                with access to your Wazuh data and MITRE ATT&CK knowledge base.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 max-w-xl justify-center">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-purple-500/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-purple-500" />
                </div>
              )}
              <Card
                className={`max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-blue-500/10 border-blue-500/20"
                    : ""
                }`}
              >
                <CardContent className="p-3">
                  <div className="text-sm text-text-primary whitespace-pre-wrap break-words">
                    {msg.content}
                    {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                      <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5" />
                    )}
                  </div>
                </CardContent>
              </Card>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-bg-surface">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — security, business, technical, or general..."
            className="flex-1 resize-none rounded-lg border border-border bg-bg-muted px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="h-[44px] w-[44px] p-0 shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
