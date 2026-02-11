import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toastInfo, toastError } from "@/components/ui/Toast.tsx";

// ── SpeechRecognition type declarations ──────────────────────────────────

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ── Props ────────────────────────────────────────────────────────────────

interface VoiceCommandButtonProps {
  onClockIn?: () => void;
  onClockOut?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────

export function VoiceCommandButton({ onClockIn, onClockOut }: VoiceCommandButtonProps) {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechAPI);
  }, []);

  const processCommand = useCallback(
    (transcript: string) => {
      const text = transcript.toLowerCase().trim();
      toastInfo("Heard", `"${transcript}"`);

      if (text.includes("clock in")) {
        onClockIn?.();
        return;
      }
      if (text.includes("clock out")) {
        onClockOut?.();
        return;
      }
      if (text.includes("next job")) {
        navigate("/portal/jobs");
        return;
      }
      if (text.includes("my pay") || text.includes("earnings")) {
        navigate("/portal/pay");
        return;
      }
      if (text.includes("go home") || text.includes("dashboard")) {
        navigate("/portal");
        return;
      }

      toastInfo(
        "Unknown command",
        'Try: "clock in", "clock out", "next job", "my pay", or "go home"',
      );
    },
    [navigate, onClockIn, onClockOut],
  );

  const startListening = useCallback(() => {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return;

    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0];
      if (result && result[0]) {
        processCommand(result[0].transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        toastError("Voice error", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      toastError("Voice error", "Could not start speech recognition");
    }
  }, [processCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Hide button if browser does not support Speech API
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isListening ? "Stop listening" : "Voice command"}
      className={[
        "fixed bottom-6 left-6 z-50",
        "flex items-center justify-center",
        "w-12 h-12 rounded-full",
        "bg-white dark:bg-gray-800",
        "shadow-lg border border-gray-200 dark:border-gray-700",
        "text-xl leading-none",
        "transition-all duration-200",
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        isListening ? "ring-2 ring-red-500 animate-pulse" : "",
      ].join(" ")}
      title={isListening ? "Listening... tap to stop" : "Voice command"}
    >
      {isListening ? (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      ) : (
        <span role="img" aria-hidden="true">
          🎤
        </span>
      )}
    </button>
  );
}
