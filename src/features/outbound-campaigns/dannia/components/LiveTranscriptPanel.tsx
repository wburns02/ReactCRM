import { useState, useRef, useEffect, useMemo } from "react";
import { Mic, MicOff, X, Sparkles, AlertTriangle, ClipboardCopy, PhoneIncoming, User, ChevronDown, ChevronUp } from "lucide-react";
import type { CampaignContact } from "../../types";
import {
  useTranscriptionAssist,
  type AutoSuggestCard,
} from "../useTranscriptionAssist";
import { KB_CATEGORIES } from "../macSepticKnowledgeBase";
import type { KBCategory } from "../macSepticKnowledgeBase";
import { isAgentSpeech, splitIntoSentences } from "../questionDetection";
import { useCustomerTranscript, type TranscriptEntry } from "@/hooks/useCustomerTranscript";

interface LiveTranscriptPanelProps {
  contact: CampaignContact | null;
  isOnCall: boolean;
  callSid?: string;
  onTranscriptCapture?: (transcript: string) => void;
  onUseAsNotes?: (text: string) => void;
}

export function LiveTranscriptPanel({
  contact,
  isOnCall,
  callSid,
  onTranscriptCapture,
  onUseAsNotes,
}: LiveTranscriptPanelProps) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    suggestions,
    dismissSuggestion,
  } = useTranscriptionAssist(contact);

  // Customer-side transcription via Google STT WebSocket
  const { transcripts: customerTranscripts, isConnected: sttConnected } =
    useCustomerTranscript(isOnCall ? callSid : undefined);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledUp = useRef(false);

  // Track when user scrolls up manually
  useEffect(() => {
    const container = transcriptContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // User is "near bottom" if within 60px of the bottom
      userHasScrolledUp.current = scrollHeight - scrollTop - clientHeight > 60;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll transcript only if user hasn't scrolled up
  useEffect(() => {
    if (!userHasScrolledUp.current) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, interimTranscript, customerTranscripts]);

  // Report transcript to parent (include both sides)
  useEffect(() => {
    if (transcript && onTranscriptCapture) {
      const customerText = customerTranscripts
        .filter((t) => t.isFinal)
        .map((t) => t.text)
        .join(" ");
      const combined = customerText
        ? `[Agent] ${transcript}\n[Customer] ${customerText}`
        : transcript;
      onTranscriptCapture(combined);
    }
  }, [transcript, customerTranscripts, onTranscriptCapture]);

  // Also feed customer transcripts into the suggestion engine via a pseudo-question check
  const lastCustomerFinal = useMemo(() => {
    const finals = customerTranscripts.filter((t) => t.isFinal);
    return finals.length > 0 ? finals[finals.length - 1].text : "";
  }, [customerTranscripts]);

  // Auto-start when on call
  useEffect(() => {
    if (isOnCall && isSupported && !isListening) {
      startListening();
    }
    if (!isOnCall && isListening) {
      stopListening();
    }
  }, [isOnCall, isSupported, isListening, startListening, stopListening]);

  const activeSuggestions = useMemo(
    () => suggestions.filter((s) => !s.dismissed),
    [suggestions],
  );

  // Filter transcript to only show caller speech (hide agent's own voice)
  const callerTranscript = useMemo(() => {
    if (!transcript) return "";
    const sentences = splitIntoSentences(transcript);
    return sentences.filter((s) => s.trim().length >= 3 && !isAgentSpeech(s)).join(" ");
  }, [transcript]);

  const callerInterim = useMemo(() => {
    if (!interimTranscript) return "";
    return interimTranscript;
  }, [interimTranscript]);

  // Build interleaved two-sided transcript entries
  const hasCustomerTranscripts = customerTranscripts.length > 0;

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
        <p className="text-xs text-text-tertiary">
          Speech recognition is not supported in this browser.
          Use Chrome or Edge for live transcription.
        </p>
      </div>
    );
  }

  if (!isOnCall && !isListening) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <Mic className="w-8 h-8 text-text-tertiary mb-2" />
          <p className="text-xs text-text-tertiary">
            Start a call — AI will detect caller questions and show you answers
          </p>
          <p className="text-[10px] text-text-tertiary mt-1">
            {callSid ? "Two-sided transcription enabled" : "Use speakerphone for best caller detection"}
          </p>
        </div>

        {/* Manual start button for testing */}
        <div className="border-t border-border px-3 py-2 flex justify-center">
          <button
            onClick={startListening}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-400 transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            Start Transcription (Test)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Auto-suggest cards strip */}
      {activeSuggestions.length > 0 && (
        <div className="border-b border-border bg-gradient-to-r from-emerald-500/5 to-blue-500/5 px-2 py-2 space-y-1.5 max-h-[200px] overflow-y-auto">
          {activeSuggestions.map((card) => (
            <SuggestionCard
              key={card.id}
              card={card}
              onDismiss={() => dismissSuggestion(card.id)}
              onUseAsNotes={onUseAsNotes ? () => onUseAsNotes(card.answer) : undefined}
            />
          ))}
        </div>
      )}

      {/* Transcript area — two-sided when STT is connected */}
      <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto px-3 py-2 max-h-[200px] min-h-[80px]">
        {!callerTranscript && !callerInterim && !hasCustomerTranscripts && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-text-secondary">
                {isListening ? "Listening for caller questions..." : "Paused"}
              </span>
            </div>
            <p className="text-[10px] text-text-tertiary">
              {sttConnected
                ? "Two-sided transcription active — customer audio via Google STT"
                : "Caller questions will be detected and answered automatically"}
            </p>
            {!sttConnected && (
              <p className="text-[10px] text-text-tertiary mt-0.5">
                Your voice is filtered out — only caller speech appears here
              </p>
            )}
          </div>
        )}

        {/* Two-sided transcript view when Google STT is connected */}
        {hasCustomerTranscripts ? (
          <div className="space-y-1.5">
            {/* Show agent speech (from Web Speech API) */}
            {callerTranscript && (
              <div className="flex items-start gap-1.5">
                <User className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">[You]</span>
                  <p className="text-xs leading-relaxed text-text-primary">{callerTranscript}</p>
                </div>
              </div>
            )}

            {/* Show customer transcripts from Google STT */}
            {customerTranscripts.map((entry, i) => (
              <div key={`${entry.timestamp}-${i}`} className="flex items-start gap-1.5">
                <PhoneIncoming className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">[Customer]</span>
                  <p className={`text-xs leading-relaxed ${entry.isFinal ? "text-text-primary" : "text-text-tertiary italic"}`}>
                    {entry.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Agent interim */}
            {callerInterim && (
              <div className="flex items-start gap-1.5">
                <User className="w-3 h-3 mt-0.5 text-blue-400 shrink-0" />
                <p className="text-xs leading-relaxed text-text-tertiary italic">{callerInterim}</p>
              </div>
            )}
          </div>
        ) : (
          /* Fallback: single-sided transcript (no Google STT) */
          (callerTranscript || callerInterim) && (
            <div className="space-y-1">
              {callerTranscript && (
                <p className="text-xs leading-relaxed text-text-primary">
                  {callerTranscript}
                </p>
              )}
              {callerInterim && (
                <p className="text-xs leading-relaxed text-text-tertiary italic">
                  {callerInterim}
                </p>
              )}
            </div>
          )
        )}

        {error && (
          <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Controls footer */}
      <div className="border-t border-border px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {isListening ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live transcription
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5" />
              Stopped
            </>
          )}
          {sttConnected && (
            <span className="text-[10px] text-emerald-500 font-medium">
              STT
            </span>
          )}
          {activeSuggestions.length > 0 && (
            <span className="text-[10px] text-purple-500 font-medium">
              {activeSuggestions.length} suggestion{activeSuggestions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => (isListening ? stopListening() : startListening())}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
            isListening
              ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
              : "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-400"
          }`}
        >
          {isListening ? (
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
  );
}

/**
 * Individual auto-suggest card shown in the strip above the transcript.
 * Collapsed by default — shows question header. Click to expand and see full answer.
 */
function SuggestionCard({
  card,
  onDismiss,
  onUseAsNotes,
}: {
  card: AutoSuggestCard;
  onDismiss: () => void;
  onUseAsNotes?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const catInfo = KB_CATEGORIES[card.category as KBCategory] || KB_CATEGORIES.service;

  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-800/50 bg-white dark:bg-bg-card animate-in slide-in-from-top-2 overflow-hidden">
      {/* Header — always visible, click to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-500" />
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${catInfo.color}`}>
          {catInfo.label}
        </span>
        <span className="text-[11px] font-medium text-text-primary truncate flex-1">
          {card.question}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="shrink-0 p-0.5 rounded hover:bg-bg-hover text-text-tertiary"
        >
          <X className="w-3 h-3" />
        </button>
        {expanded ? (
          <ChevronUp className="w-3 h-3 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-3 h-3 shrink-0 text-text-tertiary" />
        )}
      </button>

      {/* Expandable answer body */}
      {expanded && (
        <div className="px-3 pb-2.5 border-t border-purple-100 dark:border-purple-900/30">
          <p className="text-xs leading-relaxed text-text-primary mt-2">
            {card.answer}
          </p>
          {onUseAsNotes && (
            <button
              onClick={onUseAsNotes}
              className="flex items-center gap-1 mt-2 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              <ClipboardCopy className="w-3 h-3" />
              Use as Notes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
