import { useState, useCallback, useRef } from "react";
import type { CampaignContact } from "../types";
import type { AssistMessage, LiveHint } from "../useAgentAssist";
import {
  searchKnowledgeBase,
  getBestAnswer,
  buildSystemPrompt,
} from "./macSepticKnowledgeBase";
import { aiApi } from "@/api/ai";

/**
 * Enhanced Agent Assist hook for Dannia Mode.
 * Replaces the basic useAgentAssist with:
 * - 50+ entry knowledge base search
 * - Claude API fallback with contact-aware system prompt
 * - Context-aware quick prompts
 */

export interface UseEnhancedAgentAssistReturn {
  messages: AssistMessage[];
  isThinking: boolean;
  liveHints: LiveHint[];
  isTranscribing: boolean;
  askQuestion: (question: string, contact: CampaignContact) => Promise<void>;
  clearMessages: () => void;
  startTranscription: () => void;
  stopTranscription: () => void;
  getQuickPrompts: (contact: CampaignContact | null) => string[];
}

function generateId(): string {
  return crypto.randomUUID();
}

export function useEnhancedAgentAssist(): UseEnhancedAgentAssistReturn {
  const [messages, setMessages] = useState<AssistMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [liveHints, setLiveHints] = useState<LiveHint[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const hintIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  const askQuestion = useCallback(
    async (question: string, contact: CampaignContact) => {
      // Add agent message
      const agentMsg: AssistMessage = {
        id: generateId(),
        role: "agent",
        content: question,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsThinking(true);

      // Track conversation for multi-turn context
      conversationRef.current.push({ role: "user", content: question });

      let responseText: string;

      // Step 1: Try local knowledge base
      const kbResult = getBestAnswer(question, contact);

      if (kbResult) {
        // Small delay for natural feel
        await new Promise((r) => setTimeout(r, 100 + Math.random() * 150));
        responseText = kbResult.answer;
      } else {
        // Step 2: Try Claude API with system prompt
        try {
          const systemPrompt = buildSystemPrompt(contact);
          const response = await aiApi.chat({
            message: question,
            context: {
              current_page: "outbound-campaigns",
              selected_customer: {
                id: parseInt(contact.id) || 0,
                name: contact.account_name,
                phone: contact.phone,
              },
            },
            system_prompt: systemPrompt,
          });
          responseText = response.message.content;
        } catch {
          // Step 3: Graceful fallback
          responseText = buildFallbackResponse(question, contact);
        }
      }

      conversationRef.current.push({ role: "assistant", content: responseText });

      const assistMsg: AssistMessage = {
        id: generateId(),
        role: "assistant",
        content: responseText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistMsg]);
      setIsThinking(false);
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationRef.current = [];
  }, []);

  // Demo live hints (upgraded with KB-aware hints)
  const DEMO_HINTS: Omit<LiveHint, "id" | "timestamp">[] = [
    { text: "Customer mentioned pricing — pump-out is $275-$400 for standard residential.", type: "tip" },
    { text: "They have an aerobic system — mention quarterly TCEQ-required maintenance.", type: "upsell" },
    { text: "Customer sounds hesitant — slow down and ask an open-ended question.", type: "tip" },
    { text: "Opportunity: offer the free first inspection to get a foot in the door.", type: "upsell" },
    { text: "They asked about other companies — focus on our strengths, don't compare.", type: "warning" },
    { text: "Great time to mention: maintenance plan customers get priority scheduling.", type: "upsell" },
  ];

  const startTranscription = useCallback(() => {
    setIsTranscribing(true);
    setLiveHints([]);

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

  /**
   * Context-aware quick prompts based on the current contact.
   */
  const getQuickPrompts = useCallback(
    (contact: CampaignContact | null): string[] => {
      if (!contact) {
        return [
          "How much does pumping cost?",
          "What's our service area?",
          "Tell me about maintenance plans",
        ];
      }

      const prompts: string[] = [];

      // Always useful
      prompts.push("How much does pumping cost?");

      // System-specific
      if (contact.system_type?.toLowerCase().includes("aerobic")) {
        prompts.push("Aerobic maintenance requirements?");
      }

      // Contract-specific
      if (contact.days_since_expiry && contact.days_since_expiry > 0) {
        prompts.push("Their contract is expired — how to pitch?");
      } else if (contact.contract_status?.toLowerCase().includes("active")) {
        prompts.push("They have an active contract elsewhere");
      }

      // Common objections
      prompts.push("They say they're not interested");
      prompts.push("They want to think about it");
      prompts.push("They already have a provider");

      // Company questions
      prompts.push("What makes Mac Septic different?");
      prompts.push("Emergency service availability?");

      return prompts.slice(0, 8);
    },
    [],
  );

  return {
    messages,
    isThinking,
    liveHints,
    isTranscribing,
    askQuestion,
    clearMessages,
    startTranscription,
    stopTranscription,
    getQuickPrompts,
  };
}

/**
 * Fallback when both KB and Claude API fail.
 */
function buildFallbackResponse(
  question: string,
  contact: CampaignContact,
): string {
  // Try a broader KB search for partial matches
  const results = searchKnowledgeBase(question, 3);
  if (results.length > 0) {
    const best = results[0].entry;
    return (
      best.dynamicAnswer?.(contact) ||
      best.answer
    );
  }

  return `I don't have a specific answer for that question, but here's a general approach: Acknowledge ${contact.account_name?.split(" ")[0] || "the customer"}'s concern, show empathy, and pivot to Mac Septic's strengths — superior service, transparent pricing ($275-$400 for standard pump-out), and our new customer deal with a free first inspection. If you're unsure, say: "That's a great question — let me have our service manager follow up with the details."`;
}
