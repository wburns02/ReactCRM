/**
 * Dictation Field Component
 * Text input with voice dictation capability
 */
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useVoiceRecording } from "../useVoiceRecording";
import { isSpeechRecognitionSupported } from "../types";

interface DictationFieldProps {
  /** Current text value */
  value: string;
  /** Called when text changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label for the field */
  label?: string;
  /** Number of rows for textarea */
  rows?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Class name */
  className?: string;
  /** Whether to show the full textarea or just a button */
  showTextArea?: boolean;
  /** Max length for text */
  maxLength?: number;
}

export function DictationField({
  value,
  onChange,
  placeholder = "Speak or type...",
  label,
  rows = 3,
  disabled = false,
  className,
  showTextArea = true,
  maxLength,
}: DictationFieldProps) {
  const [isSupported] = useState(isSpeechRecognitionSupported);
  const [localValue, setLocalValue] = useState(value);

  const {
    transcriptionStatus,
    transcription,
    interimTranscription,
    error,
    startTranscription,
    stopTranscription,
  } = useVoiceRecording({
    settings: { autoTranscribe: false, continuous: true, interimResults: true },
  });

  const isListening = transcriptionStatus === "listening";

  // Sync external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Append transcription when finalized
  useEffect(() => {
    if (transcription) {
      const newValue = localValue
        ? `${localValue} ${transcription}`.trim()
        : transcription;
      setLocalValue(newValue);
      onChange(newValue);
    }
    // Only trigger on transcription change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcription]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (maxLength && newValue.length > maxLength) return;
      setLocalValue(newValue);
      onChange(newValue);
    },
    [onChange, maxLength],
  );

  const toggleDictation = useCallback(() => {
    if (isListening) {
      stopTranscription();
    } else {
      startTranscription();
    }
  }, [isListening, startTranscription, stopTranscription]);

  // Preview with interim results
  const displayValue =
    isListening && interimTranscription
      ? `${localValue} ${interimTranscription}`.trim()
      : localValue;

  if (!showTextArea) {
    // Compact mode - just a button
    return (
      <Button
        variant={isListening ? "danger" : "secondary"}
        size="sm"
        onClick={toggleDictation}
        disabled={disabled || !isSupported}
        className={cn("gap-2", className)}
      >
        {isListening ? (
          <>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Stop Dictation
          </>
        ) : (
          <>🎤 Dictate</>
        )}
      </Button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-text-primary">
            {label}
          </label>
          {maxLength && (
            <span className="text-xs text-text-muted">
              {localValue.length}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* Textarea with mic button */}
      <div className="relative">
        <textarea
          value={displayValue}
          onChange={handleTextChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isListening}
          className={cn(
            "w-full px-3 py-2 pr-12 rounded-md border bg-white text-text-primary",
            "placeholder:text-text-muted resize-none",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            isListening && "bg-bg-muted border-primary",
            disabled && "bg-bg-muted cursor-not-allowed",
            error && "border-danger",
          )}
        />

        {/* Mic button */}
        {isSupported && (
          <button
            type="button"
            onClick={toggleDictation}
            disabled={disabled}
            className={cn(
              "absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center",
              "transition-all",
              isListening
                ? "bg-danger text-white animate-pulse"
                : "bg-bg-muted text-text-secondary hover:bg-primary hover:text-white",
            )}
            title={isListening ? "Stop dictation" : "Start dictation"}
          >
            {isListening ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Status/Error */}
      {isListening && (
        <div className="flex items-center gap-2">
          <Badge variant="danger" className="animate-pulse">
            🎙️ Listening...
          </Badge>
          <span className="text-xs text-text-muted">
            Speak now. Click mic to stop.
          </span>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {!isSupported && (
        <p className="text-xs text-text-muted">
          Speech recognition not supported in this browser
        </p>
      )}
    </div>
  );
}

export default DictationField;
