import { useState, useCallback, useRef } from "react";
import type { CampaignContact } from "./types";

/**
 * Agent Assist AI hook.
 *
 * Provides two modes:
 * 1. Text Q&A — agent types a customer question, gets a suggested response
 * 2. Live transcription — (future) streams real-time call audio for suggestions
 *
 * Currently uses a local knowledge base for instant responses.
 * Designed to swap in Claude API calls when backend endpoint is available.
 */

export interface AssistMessage {
  id: string;
  role: "agent" | "assistant";
  content: string;
  timestamp: number;
}

export interface LiveHint {
  id: string;
  text: string;
  type: "tip" | "warning" | "upsell" | "info";
  timestamp: number;
}

interface UseAgentAssistReturn {
  messages: AssistMessage[];
  isThinking: boolean;
  liveHints: LiveHint[];
  isTranscribing: boolean;
  askQuestion: (question: string, contact: CampaignContact) => Promise<void>;
  clearMessages: () => void;
  startTranscription: () => void;
  stopTranscription: () => void;
}

// Local knowledge base for instant responses
const KNOWLEDGE_BASE: {
  patterns: RegExp[];
  response: (contact: CampaignContact) => string;
}[] = [
  {
    patterns: [/how much|cost|price|pricing|expensive|cheap|afford/i],
    response: (c) =>
      `For a standard residential pump-out, pricing typically runs $275–$400 depending on system size and accessibility. ${c.system_type ? `Since they have a ${c.system_type}, ` : ""}mention that we're offering new customer deals right now. Always be transparent — no hidden fees. If they push for an exact number, offer the free inspection: "Let me get a tech out there so we can give you an exact quote — no obligation."`,
  },
  {
    patterns: [/how often|frequency|how long|when should|maintenance schedule/i],
    response: () =>
      `Standard residential systems should be pumped every 3–5 years, but it depends on household size and usage. Commercial systems typically need more frequent service. Key point: regular maintenance prevents costly emergency repairs and extends system life by 10–15 years. This is a great opportunity to pitch the annual maintenance plan.`,
  },
  {
    patterns: [/emergency|urgent|backed up|overflow|smell|odor|gurgling/i],
    response: () =>
      `This is urgent — show empathy first: "I'm sorry you're dealing with that, that sounds really stressful." Then pivot to action: we can get a technician out quickly. Offer same-day or next-day emergency service. Mention that after the emergency fix, we can set them up on a maintenance plan to prevent this from happening again.`,
  },
  {
    patterns: [/warranty|guarantee|stand behind/i],
    response: () =>
      `We stand behind our work 100%. All service comes with a satisfaction guarantee. Parts installed carry manufacturer warranties, and our labor is guaranteed for 90 days. For maintenance plan customers, warranty coverage is extended. This differentiates us from the fly-by-night operators.`,
  },
  {
    patterns: [/happy with|already have|current provider|switch|why.*change/i],
    response: (c) =>
      `Don't bad-mouth their current provider. Instead: "That's great you're staying on top of it!" Then probe gently: "When was the last time they came out?" and "How's the communication been?" Many people settle for mediocre service because they don't know there's a better option. ${c.days_since_expiry && c.days_since_expiry > 365 ? `Note: their contract expired over ${Math.floor(c.days_since_expiry / 365)} year(s) ago — they may not actually be getting serviced.` : ""}`,
  },
  {
    patterns: [/not interested|don't need|go away|stop calling|no thank/i],
    response: () =>
      `Respect their wishes but try one soft close: "I completely understand, and I don't want to waste your time. Real quick though — when was the last time your system was serviced? ... If it's been over a year, you could be at risk for a backup. Can I at least send you our number in case you ever need emergency service?" If they say no again, thank them politely and mark as not interested.`,
  },
  {
    patterns: [/think about|talk.*spouse|partner|wife|husband|get back/i],
    response: () =>
      `Great sign — they're not saying no! "Of course, take your time! Would it help if I emailed over some info you could share? I can send our service overview, pricing guide, and customer reviews." Get their email. Then: "When would be a good time for me to follow up? ... Perfect, I'll give you a call on [date]. Thanks, [name]!" Set a callback.`,
  },
  {
    patterns: [/never heard|who.*mac septic|new company|how long|experience/i],
    response: () =>
      `"We're new to the Central Texas area, and that's exactly why we're reaching out! Our team has years of experience in the septic industry — we're bringing that expertise to this market. We're building our reputation one customer at a time, which is why we're offering special introductory rates. We're confident that once you try us, you'll see the difference."`,
  },
  {
    patterns: [/drainfield|leach|drain field|lateral|absorption/i],
    response: () =>
      `Drainfield issues can be serious and expensive if left unchecked. Signs include soggy ground, slow drains, and odor. Reassure them: "Many drainfield issues can be resolved without full replacement if caught early. Our inspection will tell us exactly what's going on." Position the free inspection as time-sensitive: "The sooner we take a look, the more options we'll have."`,
  },
  {
    patterns: [/aerobic|spray|advanced|atu|treatment/i],
    response: () =>
      `Aerobic systems require more frequent maintenance than conventional systems — typically quarterly maintenance checks and annual inspections. Many homeowners don't realize this. Mention that we're certified to service all aerobic system brands. This is a great upsell opportunity for a maintenance contract since aerobic systems need regular attention.`,
  },
  {
    patterns: [/inspection|look at|check|assess/i],
    response: () =>
      `Our inspections are thorough: we check tank levels, inlet/outlet baffles, structural integrity, drainfield performance, and all mechanical components. For new customers, the first inspection is free — no obligation. It takes about 30–45 minutes. The tech will provide a written report with photos and recommendations. This builds trust and almost always leads to a service contract.`,
  },
  {
    patterns: [/pump.*out|pumping|clean.*tank|empty/i],
    response: () =>
      `Standard pumping for a 1000-gallon tank takes about 30 minutes. We use modern vacuum trucks and dispose of waste at licensed facilities. We don't just pump and leave — our techs inspect the tank interior, check baffles, and note any issues. Pricing is straightforward with no surprises. Great time to mention: customers on maintenance plans get priority scheduling and discounted rates.`,
  },
];

function generateId(): string {
  return crypto.randomUUID();
}

function findResponse(question: string, contact: CampaignContact): string {
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.patterns.some((p) => p.test(question))) {
      return entry.response(contact);
    }
  }

  // Fallback for unmatched questions
  return `I don't have a specific script for that question, but here's a general approach: Acknowledge the customer's concern, show empathy, and pivot to Mac Septic's strengths — superior service, transparent pricing, and our new customer deal. If you're unsure, it's always okay to say: "That's a great question. Let me have our service manager give you a call back with the details." Then collect their info and schedule a callback.`;
}

export function useAgentAssist(): UseAgentAssistReturn {
  const [messages, setMessages] = useState<AssistMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [liveHints, setLiveHints] = useState<LiveHint[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const hintIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const askQuestion = useCallback(
    async (question: string, contact: CampaignContact) => {
      const agentMsg: AssistMessage = {
        id: generateId(),
        role: "agent",
        content: question,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsThinking(true);

      // Simulate a brief thinking delay (50-300ms) for natural feel
      // In production, this would be an API call to Claude
      await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));

      const response = findResponse(question, contact);
      const assistMsg: AssistMessage = {
        id: generateId(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistMsg]);
      setIsThinking(false);
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Simulated live transcription hints (placeholder for real STT integration)
  const DEMO_HINTS: Omit<LiveHint, "id" | "timestamp">[] = [
    { text: "Customer mentioned they're unhappy with response times — highlight our guaranteed scheduling", type: "tip" },
    { text: "Opportunity: they have an aerobic system — mention quarterly maintenance requirement", type: "upsell" },
    { text: "Customer tone sounds hesitant — slow down and ask an open-ended question", type: "tip" },
    { text: "They mentioned a backup last year — offer preventive maintenance plan", type: "upsell" },
    { text: "Customer asked about other providers — don't compare directly, focus on our strengths", type: "warning" },
  ];

  const startTranscription = useCallback(() => {
    setIsTranscribing(true);
    setLiveHints([]);

    // Demo: generate sample hints at intervals
    let hintIndex = 0;
    hintIntervalRef.current = setInterval(() => {
      if (hintIndex >= DEMO_HINTS.length) {
        if (hintIntervalRef.current) clearInterval(hintIntervalRef.current);
        return;
      }
      const hint = DEMO_HINTS[hintIndex];
      setLiveHints((prev) => [
        ...prev,
        { ...hint, id: generateId(), timestamp: Date.now() },
      ]);
      hintIndex++;
    }, 8000);
  }, []);

  const stopTranscription = useCallback(() => {
    setIsTranscribing(false);
    if (hintIntervalRef.current) {
      clearInterval(hintIntervalRef.current);
      hintIntervalRef.current = null;
    }
  }, []);

  return {
    messages,
    isThinking,
    liveHints,
    isTranscribing,
    askQuestion,
    clearMessages,
    startTranscription,
    stopTranscription,
  };
}
