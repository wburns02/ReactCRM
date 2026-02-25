import { useState, useCallback, useRef, useEffect } from "react";

// Web Speech API types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeechRecognition {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

/**
 * Speech recognition result
 */
interface SpeechResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

/**
 * Voice to text hook options
 */
interface UseVoiceToTextOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (result: SpeechResult) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  const win = window as unknown as WindowWithSpeechRecognition;
  return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * Hook for voice-to-text functionality using Web Speech API
 */
export function useVoiceToText(options: UseVoiceToTextOptions = {}) {
  const {
    language = "en-US",
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check support on mount
  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setError("Speech recognition is not supported in this browser");
      return null;
    }

    const win = window as unknown as WindowWithSpeechRecognition;
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError("Speech recognition is not available");
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += text;
          onResult?.({
            transcript: text,
            isFinal: true,
            confidence: result[0].confidence,
          });
        } else {
          interim += text;
          onResult?.({
            transcript: text,
            isFinal: false,
            confidence: result[0].confidence,
          });
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + " " + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      onError?.(errorMessage);

      if (event.error === "not-allowed") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      onEnd?.();
    };

    return recognition;
  }, [language, continuous, interimResults, onResult, onError, onEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setError("Failed to start voice recognition");
      }
    }
  }, [initRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript: transcript.trim(),
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    setTranscript,
  };
}

/**
 * Get human-readable error message
 */
function getErrorMessage(error: string): string {
  switch (error) {
    case "aborted":
      return "Speech recognition was aborted";
    case "audio-capture":
      return "No microphone was found or microphone is not working";
    case "bad-grammar":
      return "Speech grammar error";
    case "language-not-supported":
      return "Language is not supported";
    case "network":
      return "Network error occurred";
    case "no-speech":
      return "No speech was detected";
    case "not-allowed":
      return "Microphone permission was denied";
    case "service-not-allowed":
      return "Speech recognition service is not allowed";
    default:
      return "An error occurred during speech recognition";
  }
}

/**
 * Component for voice input button with visual feedback
 */
export function VoiceMicButton({
  isListening,
  isSupported,
  onClick,
  disabled,
  className = "",
}: {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className={`p-2 text-gray-400 cursor-not-allowed ${className}`}
        title="Voice input not supported in this browser"
      >
        🎤
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-full transition-colors ${
        isListening
          ? "bg-danger text-white animate-pulse"
          : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      title={isListening ? "Stop listening" : "Start voice input"}
    >
      {isListening ? "⏹️" : "🎤"}
    </button>
  );
}
