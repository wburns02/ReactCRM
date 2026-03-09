import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { CampaignContact } from "../types";
import { useEnhancedAgentAssist } from "../dannia/useEnhancedAgentAssist";
import { useOutboundStore } from "../store";
import type { AssistMessage } from "../useAgentAssist";
import { QuickAnswerPanel } from "../dannia/components/QuickAnswerPanel";
import { LiveTranscriptPanel } from "../dannia/components/LiveTranscriptPanel";
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  ChevronDown,
  ClipboardList,
  Headphones,
} from "lucide-react";

interface AgentAssistProps {
  contact: CampaignContact | null;
  isOnCall: boolean;
  callSid?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onTranscriptCapture?: (transcript: string) => void;
  onUseAsNotes?: (text: string) => void;
  onAssistMessagesChange?: (messages: { role: string; content: string }[]) => void;
}

type TabId = "quick" | "chat" | "live";

export function AgentAssist({
  contact,
  isOnCall,
  callSid,
  collapsed = false,
  onToggle,
  onTranscriptCapture,
  onUseAsNotes,
  onAssistMessagesChange,
}: AgentAssistProps) {
  const danniaMode = useOutboundStore((s) => s.danniaMode);
  const enhancedAssist = useEnhancedAgentAssist();

  // Always use the enhanced assist (50+ KB entries, Claude API fallback)
  const assist = enhancedAssist;
  const {
    messages,
    isThinking,
    liveHints,
    isTranscribing,
    askQuestion,
    clearMessages,
    startTranscription,
    stopTranscription,
  } = assist;

  const getQuickPromptsFn = "getQuickPrompts" in enhancedAssist ? enhancedAssist.getQuickPrompts : null;
  const quickPrompts = useMemo(() => {
    if (getQuickPromptsFn) {
      return getQuickPromptsFn(contact);
    }
    return [
      "How much does pumping cost?",
      "They say they're not interested",
      "They want to think about it",
      "They already have a provider",
      "They asked about our experience",
      "Emergency/backup situation",
    ];
  }, [getQuickPromptsFn, contact]);

  const [input, setInput] = useState("");
  // Default to "live" tab so caller questions are front-and-center
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-switch to Live tab when a call starts
  useEffect(() => {
    if (isOnCall) {
      setActiveTab("live");
    }
  }, [isOnCall]);

  // Report assist messages to parent for post-call report
  useEffect(() => {
    if (onAssistMessagesChange) {
      onAssistMessagesChange(messages.map((m) => ({ role: m.role, content: m.content })));
    }
  }, [messages, onAssistMessagesChange]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveHints]);

  // LiveTranscriptPanel handles its own transcription start/stop

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

  // Tab config — always 3 tabs with full Live Assist
  const tabs: { id: TabId; label: string; icon: typeof Send }[] = [
    { id: "quick", label: "Quick Answers", icon: ClipboardList },
    { id: "chat", label: "Ask AI", icon: Send },
    { id: "live", label: "Live Assist", icon: Headphones },
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
            {danniaMode ? "DANNIA" : "BETA"}
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
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-purple-500 text-purple-600"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span className="truncate">{tab.label}</span>
              {tab.id === "live" && isTranscribing && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Answers tab */}
      {activeTab === "quick" && (
        <QuickAnswerPanel contact={contact} />
      )}

      {/* Chat tab */}
      {activeTab === "chat" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 max-h-[240px] min-h-[120px]">
            {messages.length === 0 && !isThinking && (
              <div className="text-center py-4">
                <Bot className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                <p className="text-xs text-text-tertiary">
                  {danniaMode
                    ? "Ask any question about septic systems, pricing, or how to handle customer objections"
                    : "Type a customer question or objection and get a suggested response"}
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
                  {danniaMode ? "Searching knowledge base..." : "Thinking..."}
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
                    ? danniaMode
                      ? "Ask about pricing, systems, objections..."
                      : "Customer says..."
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

      {/* Live Assist tab — full transcription + auto-suggest in all modes */}
      {activeTab === "live" && (
        <LiveTranscriptPanel contact={contact} isOnCall={isOnCall} callSid={callSid} onTranscriptCapture={onTranscriptCapture} onUseAsNotes={onUseAsNotes} />
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

