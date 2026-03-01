import { useState, useCallback, useRef, useEffect } from "react";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { detectQuestions, type DetectedQuestion } from "./questionDetection";
import { getBestAnswer } from "./macSepticKnowledgeBase";
import type { CampaignContact } from "../types";

/**
 * Live transcription + auto-suggest pipeline for Dannia Mode.
 * Wraps useVoiceToText + questionDetection + auto-dismiss timers.
 */

export interface AutoSuggestCard {
  id: string;
  question: string;
  answer: string;
  category: string;
  confidence: number;
  timestamp: number;
  dismissed: boolean;
}

interface UseTranscriptionAssistReturn {
  // Transcription state
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;

  // Controls
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;

  // Auto-suggest
  suggestions: AutoSuggestCard[];
  detectedQuestions: DetectedQuestion[];
  dismissSuggestion: (id: string) => void;
  clearSuggestions: () => void;
}

const AUTO_DISMISS_MS = 30_000; // 30 seconds

export function useTranscriptionAssist(
  contact: CampaignContact | null,
): UseTranscriptionAssistReturn {
  const [suggestions, setSuggestions] = useState<AutoSuggestCard[]>([]);
  const [detectedQuestions, setDetectedQuestions] = useState<DetectedQuestion[]>([]);
  const seenQuestionIds = useRef(new Set<string>());
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lastProcessedLength = useRef(0);

  // Process new transcript text and detect questions
  const handleTranscriptResult = useCallback(
    (result: { transcript: string; isFinal: boolean }) => {
      if (!result.isFinal) return;

      const text = result.transcript;
      if (!text.trim()) return;

      // Detect questions in the new text
      const questions = detectQuestions(text, seenQuestionIds.current);

      if (questions.length === 0) return;

      // Add to detected questions list
      setDetectedQuestions((prev) => [...prev, ...questions]);

      // For each detected question, try to generate a suggestion
      for (const q of questions) {
        seenQuestionIds.current.add(q.id);

        // Use KB to find an answer
        const kbResult = getBestAnswer(q.text, contact);
        const answer = kbResult?.answer || q.answer;

        if (answer) {
          const card: AutoSuggestCard = {
            id: q.id,
            question: q.text,
            answer,
            category: q.category,
            confidence: q.confidence,
            timestamp: Date.now(),
            dismissed: false,
          };

          setSuggestions((prev) => [...prev, card]);

          // Auto-dismiss timer
          const timer = setTimeout(() => {
            setSuggestions((prev) =>
              prev.map((s) => (s.id === card.id ? { ...s, dismissed: true } : s)),
            );
          }, AUTO_DISMISS_MS);
          dismissTimers.current.set(card.id, timer);
        }
      }
    },
    [contact],
  );

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening: startVoice,
    stopListening: stopVoice,
    clearTranscript: clearVoice,
  } = useVoiceToText({
    continuous: true,
    interimResults: true,
    onResult: handleTranscriptResult,
  });

  // Also process the accumulated transcript periodically for missed detections
  useEffect(() => {
    if (!transcript || transcript.length <= lastProcessedLength.current) return;

    const newText = transcript.slice(lastProcessedLength.current);
    lastProcessedLength.current = transcript.length;

    if (newText.trim().length < 10) return;

    const questions = detectQuestions(newText, seenQuestionIds.current);
    for (const q of questions) {
      seenQuestionIds.current.add(q.id);

      const kbResult = getBestAnswer(q.text, contact);
      const answer = kbResult?.answer || q.answer;

      if (answer) {
        const card: AutoSuggestCard = {
          id: q.id,
          question: q.text,
          answer,
          category: q.category,
          confidence: q.confidence,
          timestamp: Date.now(),
          dismissed: false,
        };

        setSuggestions((prev) => {
          if (prev.some((s) => s.id === card.id)) return prev;
          return [...prev, card];
        });

        const timer = setTimeout(() => {
          setSuggestions((prev) =>
            prev.map((s) => (s.id === card.id ? { ...s, dismissed: true } : s)),
          );
        }, AUTO_DISMISS_MS);
        dismissTimers.current.set(card.id, timer);
      }
    }
  }, [transcript, contact]);

  const startListening = useCallback(() => {
    seenQuestionIds.current.clear();
    lastProcessedLength.current = 0;
    setSuggestions([]);
    setDetectedQuestions([]);
    startVoice();
  }, [startVoice]);

  const stopListening = useCallback(() => {
    stopVoice();
  }, [stopVoice]);

  const clearTranscript = useCallback(() => {
    clearVoice();
    lastProcessedLength.current = 0;
  }, [clearVoice]);

  const dismissSuggestion = useCallback((id: string) => {
    const timer = dismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.current.delete(id);
    }
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s)),
    );
  }, []);

  const clearSuggestions = useCallback(() => {
    for (const timer of dismissTimers.current.values()) {
      clearTimeout(timer);
    }
    dismissTimers.current.clear();
    setSuggestions([]);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of dismissTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    suggestions,
    detectedQuestions,
    dismissSuggestion,
    clearSuggestions,
  };
}
