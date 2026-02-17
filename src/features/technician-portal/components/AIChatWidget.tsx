import { useState, useRef, useEffect } from "react";
import { useTechnicianDashboard } from "@/api/hooks/useTechPortal.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";

// ── Types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

// ── AI response logic ────────────────────────────────────────────────────

function generateResponse(
  question: string,
  dashboard: ReturnType<typeof useTechnicianDashboard>["data"],
): string {
  const q = question.toLowerCase().trim();

  // Next job
  if (q.includes("next job") || q.includes("next task") || q.includes("what's next")) {
    const jobs = dashboard?.todays_jobs ?? [];
    const pending = jobs.filter(
      (j) => j.status_label !== "Complete" && j.status_label !== "Completed",
    );
    if (pending.length === 0) {
      return "You have no upcoming jobs scheduled. Enjoy the downtime!";
    }
    const next = pending[0];
    const time = next.scheduled_time || "unscheduled";
    const addr = next.address || "no address listed";
    return `Your next job is "${next.title}" at ${time}. Address: ${addr}. ${
      pending.length > 1 ? `You have ${pending.length - 1} more after that.` : ""
    }`;
  }

  // Earnings / pay
  if (
    q.includes("earn") ||
    q.includes("pay") ||
    q.includes("money") ||
    q.includes("commission") ||
    q.includes("how much")
  ) {
    const pay = dashboard?.pay_this_period;
    if (!pay) {
      return "I couldn't load your pay info right now. Try again in a moment.";
    }
    const earned = pay.commissions_earned.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    const threshold = pay.backboard_threshold.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    return `This period you've earned ${earned} in commissions across ${pay.jobs_completed_period} completed jobs. Your backboard threshold is ${threshold}. ${
      pay.on_track ? "You're on track!" : "Keep pushing to hit your target."
    }`;
  }

  // Clock status
  if (q.includes("clock") || q.includes("clocked in") || q.includes("am i on")) {
    const clock = dashboard?.clock_status;
    if (!clock) {
      return "I couldn't check your clock status. Try refreshing the page.";
    }
    if (clock.is_clocked_in) {
      const since = clock.clock_in_time
        ? new Date(clock.clock_in_time).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "earlier";
      return `Yes, you're clocked in since ${since}.`;
    }
    return "No, you're not clocked in right now. Head to the time clock to punch in.";
  }

  // Job count / stats
  if (q.includes("how many jobs") || q.includes("jobs today") || q.includes("stats")) {
    const stats = dashboard?.today_stats;
    if (!stats) {
      return "I couldn't load your stats right now.";
    }
    return `Today you have ${stats.total_jobs} total jobs: ${stats.completed_jobs} completed, ${stats.remaining_jobs} remaining. Hours worked so far: ${stats.hours_worked.toFixed(1)}.`;
  }

  // Fallback help
  return 'I can help with: "What\'s my next job?", "How much have I earned?", "Am I clocked in?", or "How many jobs today?"';
}

// ── Component ────────────────────────────────────────────────────────────

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hey! I'm your assistant. Ask me about your next job, earnings, or clock status.",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: dashboard } = useTechnicianDashboard();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    const aiResponse = generateResponse(trimmed, dashboard);
    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      text: aiResponse,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close chat" : "Open AI assistant"}
        className={[
          "fixed bottom-6 right-6 z-50",
          "flex items-center justify-center",
          "w-12 h-12 rounded-full",
          "bg-white dark:bg-gray-800",
          "shadow-lg border border-gray-200 dark:border-gray-700",
          "text-xl leading-none",
          "transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        ].join(" ")}
        title="AI Assistant"
      >
        <span role="img" aria-hidden="true">
          {isOpen ? "✕" : "🤖"}
        </span>
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className={[
            "fixed z-50",
            "bottom-20 right-4 sm:right-6",
            "w-[calc(100vw-2rem)] sm:w-80",
            "h-[400px]",
            "bg-white dark:bg-gray-900",
            "border border-gray-200 dark:border-gray-700",
            "rounded-xl shadow-2xl",
            "flex flex-col",
            "overflow-hidden",
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-base" role="img" aria-hidden="true">
                🤖
              </span>
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Tech Assistant
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close chat"
            >
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={[
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-white"
                    : "mr-auto bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                ].join(" ")}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 h-9 text-sm"
              />
              <Button
                onClick={handleSend}
                size="sm"
                disabled={!input.trim()}
                className="px-3 h-9"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
