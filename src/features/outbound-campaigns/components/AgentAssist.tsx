import { useState, useRef, useEffect } from "react";
import type { CampaignContact } from "../types";
import { useAgentAssist } from "../useAgentAssist";
import type { AssistMessage, LiveHint } from "../useAgentAssist";
import {
  Bot,
  Send,
  Trash2,
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Info,
  ChevronDown,
} from "lucide-react";

interface AgentAssistProps {
  contact: CampaignContact | null;
  isOnCall: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AgentAssist({
  contact,
  isOnCall,
  collapsed = false,
  onToggle,
}: AgentAssistProps) {
  const {
    messages,
    isThinking,
    liveHints,
    isTranscribing,
    askQuestion,
    clearMessages,
    startTranscription,
    stopTranscription,
  } = useAgentAssist();

  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "live">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveHints]);

  // Auto-start transcription when on a call (demo mode)
  useEffect(() => {
    if (isOnCall && activeTab === "live" && !isTranscribing) {
      startTranscription();
    }
    if (!isOnCall && isTranscribing) {
      stopTranscription();
    }
  }, [isOnCall, activeTab, isTranscribing, startTranscription, stopTranscription]);

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-bg-card border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition-colors"
      >
        <Bot className="w-4 h-4 text-purple-500" />
        <span className="font-medium">AI Agent Assist</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-purple-500 font-medium">
          <Sparkles className="w-3 h-3" /> Powered by Claude
        </span>
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !contact || isThinking) return;
    const question = input.trim();
    setInput("");
    await askQuestion(question, contact);
    inputRef.current?.focus();
  }

  const quickPrompts = [
    "How much does pumping cost?",
    "They say they're not interested",
    "They want to think about it",
    "They already have a provider",
    "They asked about our experience",
    "Emergency/backup situation",
  ];

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gradient-to-r from-purple-500/5 to-blue-500/5">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-text-primary">
            AI Agent Assist
          </span>
          <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">
            BETA
          </span>
        </div>
        <button
          onClick={onToggle}
          className="text-text-tertiary hover:text-text-secondary"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "chat"
              ? "border-b-2 border-purple-500 text-purple-600"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Send className="w-3 h-3" />
          Ask AI
        </button>
        <button
          onClick={() => setActiveTab("live")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "live"
              ? "border-b-2 border-purple-500 text-purple-600"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Mic className="w-3 h-3" />
          Live Hints
          {isTranscribing && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Chat tab */}
      {activeTab === "chat" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 max-h-[240px] min-h-[120px]">
            {messages.length === 0 && !isThinking && (
              <div className="text-center py-4">
                <Bot className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                <p className="text-xs text-text-tertiary">
                  Type a customer question or objection and get a suggested
                  response
                </p>
                {/* Quick prompts */}
                <div className="flex flex-wrap gap-1 justify-center mt-3">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        if (contact) {
                          setInput("");
                          askQuestion(prompt, contact);
                        }
                      }}
                      disabled={!contact}
                      className="text-[10px] px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors disabled:opacity-40"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-text-tertiary">
                  Thinking...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-2">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  contact
                    ? "Customer says..."
                    : "Select a contact first"
                }
                disabled={!contact || isThinking}
                className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!input.trim() || !contact || isThinking}
                className="p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="flex items-center gap-1 mt-1.5 text-[10px] text-text-tertiary hover:text-text-secondary"
              >
                <Trash2 className="w-3 h-3" /> Clear chat
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live hints tab */}
      {activeTab === "live" && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 max-h-[280px] min-h-[120px]">
            {!isOnCall && (
              <div className="text-center py-6">
                <Mic className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                <p className="text-xs text-text-tertiary">
                  Start a call to receive live AI-powered hints and suggestions
                </p>
                <p className="text-[10px] text-text-tertiary mt-1">
                  Real-time transcription will analyze the conversation and
                  surface relevant tips
                </p>
              </div>
            )}

            {isOnCall && liveHints.length === 0 && (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-text-secondary">
                    Listening...
                  </span>
                </div>
                <p className="text-[10px] text-text-tertiary">
                  AI is analyzing the conversation. Hints will appear as
                  opportunities are detected.
                </p>
              </div>
            )}

            {liveHints.map((hint) => (
              <HintCard key={hint.id} hint={hint} />
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Transcription toggle */}
          <div className="border-t border-border px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              {isTranscribing ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Live transcription active
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  Transcription inactive
                </>
              )}
            </div>
            <button
              onClick={() =>
                isTranscribing ? stopTranscription() : startTranscription()
              }
              disabled={!isOnCall}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40 ${
                isTranscribing
                  ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                  : "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-400"
              }`}
            >
              {isTranscribing ? (
                <>
                  <MicOff className="w-3 h-3" /> Stop
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3" /> Start
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: AssistMessage }) {
  const isAgent = message.role === "agent";
  return (
    <div
      className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
          isAgent
            ? "bg-primary text-white rounded-br-sm"
            : "bg-purple-50 dark:bg-purple-950/30 text-text-primary border border-purple-200 dark:border-purple-800 rounded-bl-sm"
        }`}
      >
        {!isAgent && (
          <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
            <Sparkles className="w-3 h-3" /> AI Suggestion
          </div>
        )}
        {message.content}
      </div>
    </div>
  );
}

function HintCard({ hint }: { hint: LiveHint }) {
  const config = {
    tip: {
      icon: Sparkles,
      color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
      iconColor: "text-blue-500",
    },
    warning: {
      icon: AlertTriangle,
      color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
      iconColor: "text-amber-500",
    },
    upsell: {
      icon: TrendingUp,
      color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
      iconColor: "text-emerald-500",
    },
    info: {
      icon: Info,
      color: "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-text-secondary",
      iconColor: "text-zinc-500",
    },
  }[hint.type];

  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed animate-in slide-in-from-left ${config.color}`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${config.iconColor}`} />
      <span>{hint.text}</span>
    </div>
  );
}
