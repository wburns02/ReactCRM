import { useRef, useEffect, useMemo } from "react";
import { Mic, MicOff, X, Sparkles, AlertTriangle } from "lucide-react";
import type { CampaignContact } from "../../types";
import {
  useTranscriptionAssist,
  type AutoSuggestCard,
} from "../useTranscriptionAssist";
import { KB_CATEGORIES } from "../macSepticKnowledgeBase";
import type { KBCategory } from "../macSepticKnowledgeBase";

interface LiveTranscriptPanelProps {
  contact: CampaignContact | null;
  isOnCall: boolean;
  onTranscriptCapture?: (transcript: string) => void;
}

export function LiveTranscriptPanel({
  contact,
  isOnCall,
  onTranscriptCapture,
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

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimTranscript]);

  // Report transcript to parent
  useEffect(() => {
    if (transcript && onTranscriptCapture) {
      onTranscriptCapture(transcript);
    }
  }, [transcript, onTranscriptCapture]);

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
            Start a call to activate live AI transcription
          </p>
          <p className="text-[10px] text-text-tertiary mt-1">
            Real-time speech detection will surface answers as the customer asks questions
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
        <div className="border-b border-border bg-gradient-to-r from-emerald-500/5 to-blue-500/5 px-2 py-1.5 space-y-1 max-h-[120px] overflow-y-auto">
          {activeSuggestions.map((card) => (
            <SuggestionCard
              key={card.id}
              card={card}
              onDismiss={() => dismissSuggestion(card.id)}
            />
          ))}
        </div>
      )}

      {/* Transcript area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 max-h-[200px] min-h-[80px]">
        {!transcript && !interimTranscript && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-text-secondary">
                Listening...
              </span>
            </div>
            <p className="text-[10px] text-text-tertiary">
              Speak naturally — questions will be detected and answered automatically
            </p>
          </div>
        )}

        {(transcript || interimTranscript) && (
          <div className="space-y-1">
            {transcript && (
              <p className="text-xs leading-relaxed text-text-primary">
                {transcript}
              </p>
            )}
            {interimTranscript && (
              <p className="text-xs leading-relaxed text-text-tertiary italic">
                {interimTranscript}
              </p>
            )}
          </div>
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
              Live transcription active
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5" />
              Transcription stopped
            </>
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
 */
function SuggestionCard({
  card,
  onDismiss,
}: {
  card: AutoSuggestCard;
  onDismiss: () => void;
}) {
  const catInfo = KB_CATEGORIES[card.category as KBCategory] || KB_CATEGORIES.service;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-white dark:bg-bg-card px-2.5 py-1.5 animate-in slide-in-from-top-2">
      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-500" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[9px] font-bold px-1 py-0 rounded ${catInfo.color}`}>
            {catInfo.label}
          </span>
          <span className="text-[10px] text-text-tertiary truncate">
            {card.question}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-text-primary line-clamp-2">
          {card.answer}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-bg-hover text-text-tertiary"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
