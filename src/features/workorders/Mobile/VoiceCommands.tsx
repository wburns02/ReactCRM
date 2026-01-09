/**
 * VoiceCommands - Voice control for field technicians
 *
 * Features:
 * - Start/stop listening button
 * - Speech-to-text for notes
 * - Voice commands (status update, add note)
 * - Visual feedback
 * - Works at 375px width minimum
 * - Large touch targets (44px min)
 */

// Web Speech API type declarations
interface SpeechRecognitionType extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionType;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { WorkOrderStatus } from '@/api/types/workOrder';
import { WORK_ORDER_STATUS_LABELS } from '@/api/types/workOrder';

// ============================================
// Types
// ============================================

interface VoiceCommandsProps {
  onAddNote?: (note: string) => Promise<void>;
  onStatusChange?: (status: WorkOrderStatus) => Promise<void>;
  onNavigate?: () => void;
  onCall?: () => void;
  disabled?: boolean;
}

interface VoiceCommandResult {
  command: string;
  action: 'note' | 'status' | 'navigate' | 'call' | 'unknown';
  data?: string;
  status?: WorkOrderStatus;
}

type ListeningState = 'idle' | 'listening' | 'processing' | 'error';

// ============================================
// Speech Recognition Hook
// ============================================

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error?: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

// Browser Speech Recognition API
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  // Check support on mount
  useEffect(() => {
    setIsSupported(!!SpeechRecognitionAPI);
  }, []);

  // Initialize recognition
  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition not supported');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: Event & { error?: string }) => {
      console.error('Speech recognition error:', event.error);
      setError(event.error || 'Recognition error');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

// ============================================
// Command Parser
// ============================================

function parseVoiceCommand(text: string): VoiceCommandResult {
  const lowerText = text.toLowerCase().trim();

  // Status change commands
  const statusPatterns: { pattern: RegExp; status: WorkOrderStatus }[] = [
    { pattern: /\b(en route|enroute|on my way|heading there)\b/i, status: 'enroute' },
    { pattern: /\b(arrived|on site|i'm here|at location)\b/i, status: 'on_site' },
    { pattern: /\b(start work|starting work|begin work|beginning)\b/i, status: 'in_progress' },
    { pattern: /\b(complete|completed|done|finished|job done)\b/i, status: 'completed' },
    { pattern: /\b(follow up|followup|needs follow up)\b/i, status: 'requires_followup' },
  ];

  for (const { pattern, status } of statusPatterns) {
    if (pattern.test(lowerText)) {
      return {
        command: text,
        action: 'status',
        status,
      };
    }
  }

  // Navigation command
  if (/\b(navigate|directions|take me there|go to location)\b/i.test(lowerText)) {
    return {
      command: text,
      action: 'navigate',
    };
  }

  // Call command
  if (/\b(call|phone|dial|call customer)\b/i.test(lowerText)) {
    return {
      command: text,
      action: 'call',
    };
  }

  // Note command
  const notePatterns = [
    /^(?:add note|note|take note|write down)[:\s]*(.+)/i,
    /^(?:memo|remember)[:\s]*(.+)/i,
  ];

  for (const pattern of notePatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      return {
        command: text,
        action: 'note',
        data: match[1].trim(),
      };
    }
  }

  // Default: treat as note if it's substantial text
  if (text.length > 5) {
    return {
      command: text,
      action: 'note',
      data: text,
    };
  }

  return {
    command: text,
    action: 'unknown',
  };
}

// ============================================
// Listening Indicator Component
// ============================================

interface ListeningIndicatorProps {
  isListening: boolean;
}

function ListeningIndicator({ isListening }: ListeningIndicatorProps) {
  if (!isListening) return null;

  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full animate-pulse"
          style={{
            height: `${12 + Math.random() * 12}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// Command Help Component
// ============================================

function CommandHelp() {
  const commands = [
    { command: '"En route" / "On my way"', action: 'Update status to En Route' },
    { command: '"Arrived" / "On site"', action: 'Update status to On Site' },
    { command: '"Start work"', action: 'Update status to In Progress' },
    { command: '"Complete" / "Done"', action: 'Update status to Completed' },
    { command: '"Navigate" / "Directions"', action: 'Open navigation' },
    { command: '"Call customer"', action: 'Call the customer' },
    { command: '"Add note [text]"', action: 'Add note to work order' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-secondary">Voice Commands:</p>
      <div className="space-y-1">
        {commands.map(({ command, action }) => (
          <div key={command} className="flex items-start gap-2 text-sm">
            <span className="text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">
              {command}
            </span>
            <span className="text-text-secondary">{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function VoiceCommands({
  onAddNote,
  onStatusChange,
  onNavigate,
  onCall,
  disabled = false,
}: VoiceCommandsProps) {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [state, setState] = useState<ListeningState>('idle');
  const [_lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Process transcript when it changes
  useEffect(() => {
    if (transcript && !isListening) {
      processCommand(transcript);
    }
  }, [transcript, isListening]);

  // Update state based on listening
  useEffect(() => {
    if (isListening) {
      setState('listening');
    } else if (transcript) {
      setState('processing');
    } else {
      setState('idle');
    }
  }, [isListening, transcript]);

  // Handle error state
  useEffect(() => {
    if (error) {
      setState('error');
      setFeedback({ type: 'error', message: error });
    }
  }, [error]);

  // Process voice command
  const processCommand = useCallback(
    async (text: string) => {
      const result = parseVoiceCommand(text);
      setLastCommand(result);

      try {
        switch (result.action) {
          case 'status':
            if (result.status && onStatusChange) {
              await onStatusChange(result.status);
              setFeedback({
                type: 'success',
                message: `Status updated to ${WORK_ORDER_STATUS_LABELS[result.status]}`,
              });
            }
            break;

          case 'note':
            if (result.data && onAddNote) {
              await onAddNote(result.data);
              setFeedback({ type: 'success', message: 'Note added successfully' });
            }
            break;

          case 'navigate':
            if (onNavigate) {
              onNavigate();
              setFeedback({ type: 'success', message: 'Opening navigation' });
            }
            break;

          case 'call':
            if (onCall) {
              onCall();
              setFeedback({ type: 'success', message: 'Calling customer' });
            }
            break;

          case 'unknown':
            setFeedback({
              type: 'error',
              message: 'Command not recognized. Try "add note [text]" or status commands.',
            });
            break;
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to process command',
        });
      }

      setState('idle');
      resetTranscript();

      // Clear feedback after delay
      setTimeout(() => setFeedback(null), 3000);
    },
    [onAddNote, onStatusChange, onNavigate, onCall, resetTranscript]
  );

  // Toggle listening
  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setFeedback(null);
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Not supported message
  if (!isSupported) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <svg
            className="w-12 h-12 mx-auto text-text-secondary mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <p className="text-text-secondary">
            Voice commands are not supported in this browser.
          </p>
          <p className="text-sm text-text-muted mt-1">
            Try using Chrome or Safari for voice support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Voice Commands</CardTitle>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 text-text-secondary hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label={showHelp ? 'Hide help' : 'Show help'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Help Section */}
        {showHelp && (
          <div className="p-3 bg-bg-muted rounded-lg">
            <CommandHelp />
          </div>
        )}

        {/* Transcript Display */}
        {(transcript || interimTranscript) && (
          <div className="p-3 bg-bg-muted rounded-lg min-h-[60px]">
            <p className="text-sm text-text-secondary mb-1">Heard:</p>
            <p className="text-text-primary">
              {transcript}
              <span className="text-text-secondary opacity-70">{interimTranscript}</span>
            </p>
          </div>
        )}

        {/* Feedback Message */}
        {feedback && (
          <div
            className={cn(
              'p-3 rounded-lg flex items-center gap-2',
              feedback.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            )}
          >
            {feedback.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Listening Indicator */}
        <div className="h-8 flex items-center justify-center">
          <ListeningIndicator isListening={isListening} />
          {!isListening && state === 'idle' && (
            <span className="text-sm text-text-secondary">
              Tap the microphone to start
            </span>
          )}
        </div>

        {/* Main Button */}
        <Button
          variant={isListening ? 'danger' : 'primary'}
          size="lg"
          onClick={handleToggleListening}
          disabled={disabled || state === 'processing'}
          className={cn(
            'w-full min-h-[64px] touch-manipulation text-lg font-semibold',
            isListening && 'animate-pulse'
          )}
        >
          <svg
            className={cn('w-8 h-8', isListening && 'text-white')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <span>{isListening ? 'Stop Listening' : 'Start Voice Command'}</span>
        </Button>

        {/* State Indicator */}
        <div className="flex justify-center">
          <Badge
            variant={
              state === 'listening'
                ? 'success'
                : state === 'processing'
                ? 'warning'
                : state === 'error'
                ? 'danger'
                : 'default'
            }
          >
            {state === 'listening'
              ? 'Listening...'
              : state === 'processing'
              ? 'Processing...'
              : state === 'error'
              ? 'Error'
              : 'Ready'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default VoiceCommands;
