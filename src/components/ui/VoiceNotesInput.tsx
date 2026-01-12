import { useEffect, useRef } from "react";
import { useVoiceToText, VoiceMicButton } from "@/hooks/useVoiceToText";

interface VoiceNotesInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  label?: string;
  helpText?: string;
}

/**
 * Textarea input with voice-to-text support
 */
export function VoiceNotesInput({
  value,
  onChange,
  placeholder = "Type or speak your notes...",
  rows = 4,
  disabled,
  maxLength,
  className = "",
  label,
  helpText,
}: VoiceNotesInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    toggleListening,
    clearTranscript,
  } = useVoiceToText({
    continuous: true,
    interimResults: true,
  });

  // Append transcript to value when it changes
  useEffect(() => {
    if (transcript) {
      const newValue = value ? `${value} ${transcript}` : transcript;
      onChange(newValue.trim());
      clearTranscript();
    }
  }, [transcript, value, onChange, clearTranscript]);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value + (interimTranscript ? ` ${interimTranscript}` : "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isListening}
          maxLength={maxLength}
          className={`w-full px-3 py-2 pr-12 border border-border rounded-lg bg-bg-card text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            isListening ? "bg-danger/5 border-danger/50" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        <div className="absolute right-2 top-2">
          <VoiceMicButton
            isListening={isListening}
            isSupported={isSupported}
            onClick={toggleListening}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          {isListening && (
            <span className="text-xs text-danger flex items-center gap-1">
              <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
              Listening...
            </span>
          )}
          {error && <span className="text-xs text-danger">{error}</span>}
          {helpText && !error && !isListening && (
            <span className="text-xs text-text-muted">{helpText}</span>
          )}
        </div>
        {maxLength && (
          <span
            className={`text-xs ${
              value.length > maxLength * 0.9 ? "text-danger" : "text-text-muted"
            }`}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {/* Voice tips */}
      {isSupported && !isListening && (
        <p className="text-xs text-text-muted mt-2">
          💡 Tip: Click the microphone to dictate notes hands-free
        </p>
      )}
    </div>
  );
}

/**
 * Compact voice input for single-line inputs
 */
export function VoiceInput({
  value,
  onChange,
  placeholder = "Type or speak...",
  disabled,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    clearTranscript,
  } = useVoiceToText({
    continuous: false,
    interimResults: true,
  });

  // Append transcript to value when it changes
  useEffect(() => {
    if (transcript) {
      const newValue = value ? `${value} ${transcript}` : transcript;
      onChange(newValue.trim());
      clearTranscript();
    }
  }, [transcript, value, onChange, clearTranscript]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value + (interimTranscript ? ` ${interimTranscript}` : "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isListening}
        className={`w-full px-3 py-2 pr-10 border border-border rounded-lg bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          isListening ? "bg-danger/5 border-danger/50" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        <VoiceMicButton
          isListening={isListening}
          isSupported={isSupported}
          onClick={toggleListening}
          disabled={disabled}
          className="!p-1.5"
        />
      </div>
    </div>
  );
}
