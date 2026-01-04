import { useState, useRef, useCallback, memo, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useVoiceToText, VoiceMicButton } from '@/hooks/useVoiceToText';
import { cn } from '@/lib/utils';

/**
 * Command history entry
 */
interface CommandHistoryEntry {
  id: string;
  prompt: string;
  timestamp: Date;
}

/**
 * Suggested prompt template
 */
interface PromptTemplate {
  label: string;
  prompt: string;
  category: 'scheduling' | 'routing' | 'status' | 'parts';
}

/**
 * Default prompt templates for quick access
 */
const PROMPT_TEMPLATES: PromptTemplate[] = [
  { label: 'Schedule job', prompt: 'Schedule {technician} for the {customer} job tomorrow at {time}', category: 'scheduling' },
  { label: 'Optimize routes', prompt: "Optimize tomorrow's routes for fuel efficiency", category: 'routing' },
  { label: 'Auto-assign', prompt: 'Auto-assign all unscheduled jobs for this week', category: 'scheduling' },
  { label: 'Running late', prompt: 'Which technicians are running late today?', category: 'status' },
  { label: 'Parts needed', prompt: "What parts are likely needed for today's jobs?", category: 'parts' },
  { label: 'Available techs', prompt: 'Who is available this afternoon?', category: 'status' },
  { label: 'Reschedule', prompt: 'Reschedule job {work_order_id} to next available slot', category: 'scheduling' },
  { label: 'Nearest tech', prompt: 'Find the nearest available technician to {address}', category: 'routing' },
];

/**
 * Props for AICommandInput
 */
interface AICommandInputProps {
  onSubmit: (prompt: string) => void;
  isProcessing?: boolean;
  placeholder?: string;
  className?: string;
  showHistory?: boolean;
  showTemplates?: boolean;
  maxHistoryItems?: number;
}

/**
 * AICommandInput - Natural language command interface with voice support
 *
 * Features:
 * - Text input for natural language commands
 * - Voice-to-text integration
 * - Command history with keyboard navigation
 * - Suggested prompt templates
 * - Processing indicator
 */
export const AICommandInput = memo(function AICommandInput({
  onSubmit,
  isProcessing = false,
  placeholder = 'Ask AI to schedule, optimize routes, or manage jobs...',
  className,
  showHistory = true,
  showTemplates = true,
  maxHistoryItems = 10,
}: AICommandInputProps) {
  const [prompt, setPrompt] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount - use state initializer pattern
  const [history, setHistory] = useState<CommandHistoryEntry[]>(() => {
    const storedHistory = localStorage.getItem('ai_dispatch_history');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as CommandHistoryEntry[];
        return parsed.slice(0, maxHistoryItems);
      } catch {
        // Ignore parse errors
      }
    }
    return [];
  });

  // Voice-to-text hook - handles transcript appending via onResult callback
  const handleVoiceResult = useCallback((result: { transcript: string; isFinal: boolean }) => {
    if (result.isFinal && result.transcript) {
      setPrompt((prev) => (prev ? `${prev} ${result.transcript}` : result.transcript).trim());
    }
  }, []);

  const {
    isSupported: voiceSupported,
    isListening,
    interimTranscript,
    error: voiceError,
    toggleListening,
  } = useVoiceToText({
    continuous: false,
    interimResults: true,
    onResult: handleVoiceResult,
  });

  // Save history to localStorage when it changes
  const saveHistory = useCallback((newHistory: CommandHistoryEntry[]) => {
    localStorage.setItem('ai_dispatch_history', JSON.stringify(newHistory));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isProcessing) return;

    // Add to history
    const newEntry: CommandHistoryEntry = {
      id: crypto.randomUUID(),
      prompt: trimmedPrompt,
      timestamp: new Date(),
    };
    const newHistory = [newEntry, ...history.filter(h => h.prompt !== trimmedPrompt)].slice(0, maxHistoryItems);
    setHistory(newHistory);
    saveHistory(newHistory);

    // Submit and reset
    onSubmit(trimmedPrompt);
    setPrompt('');
    setHistoryIndex(-1);
    setShowHistoryDropdown(false);
    setShowTemplatesDropdown(false);
  }, [prompt, isProcessing, history, maxHistoryItems, onSubmit, saveHistory]);

  // Handle keyboard navigation for history
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (!showHistory || history.length === 0) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setPrompt(history[newIndex].prompt);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      if (newIndex < 0) {
        setHistoryIndex(-1);
        setPrompt('');
      } else {
        setHistoryIndex(newIndex);
        setPrompt(history[newIndex].prompt);
      }
    } else if (e.key === 'Escape') {
      setShowHistoryDropdown(false);
      setShowTemplatesDropdown(false);
    }
  }, [showHistory, history, historyIndex]);

  // Select a template
  const selectTemplate = useCallback((template: PromptTemplate) => {
    setPrompt(template.prompt);
    setShowTemplatesDropdown(false);
    inputRef.current?.focus();
  }, []);

  // Select from history
  const selectHistoryItem = useCallback((entry: CommandHistoryEntry) => {
    setPrompt(entry.prompt);
    setShowHistoryDropdown(false);
    inputRef.current?.focus();
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('ai_dispatch_history');
  }, []);

  // Display value includes interim transcript
  const displayValue = prompt + (interimTranscript ? ` ${interimTranscript}` : '');

  return (
    <div className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          {/* Main Input */}
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="text"
              value={displayValue}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (showHistory && history.length > 0) {
                  setShowHistoryDropdown(true);
                }
              }}
              placeholder={placeholder}
              disabled={isProcessing || isListening}
              className={cn(
                'pr-24',
                isListening && 'bg-danger/5 border-danger/50',
              )}
            />

            {/* Voice & Template Buttons inside input */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Templates Button */}
              {showTemplates && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplatesDropdown(!showTemplatesDropdown);
                    setShowHistoryDropdown(false);
                  }}
                  className={cn(
                    'p-1.5 rounded-full transition-colors',
                    'text-text-muted hover:text-text-primary hover:bg-bg-muted',
                    showTemplatesDropdown && 'bg-bg-muted text-text-primary'
                  )}
                  title="Show prompt templates"
                  disabled={isProcessing}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </button>
              )}

              {/* Voice Button */}
              <VoiceMicButton
                isListening={isListening}
                isSupported={voiceSupported}
                onClick={toggleListening}
                disabled={isProcessing}
                className="!p-1.5"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!prompt.trim() || isProcessing}
            className="min-w-[80px]"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                ...
              </span>
            ) : (
              'Ask AI'
            )}
          </Button>
        </div>

        {/* Voice Status */}
        {isListening && (
          <div className="mt-2 text-xs text-danger flex items-center gap-1">
            <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
            Listening... Speak your command
          </div>
        )}

        {voiceError && (
          <div className="mt-2 text-xs text-danger">
            {voiceError}
          </div>
        )}
      </form>

      {/* History Dropdown */}
      {showHistoryDropdown && showHistory && history.length > 0 && !showTemplatesDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-bg-muted border-b border-border">
            <span className="text-xs text-text-muted font-medium">Recent Commands</span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-text-muted hover:text-danger transition-colors"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {history.map((entry, index) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => selectHistoryItem(entry)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-bg-hover transition-colors',
                    index === historyIndex && 'bg-bg-hover'
                  )}
                >
                  <span className="block text-text-primary truncate">{entry.prompt}</span>
                  <span className="text-xs text-text-muted">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 bg-bg-muted border-t border-border text-xs text-text-muted">
            Use arrow keys to navigate
          </div>
        </div>
      )}

      {/* Templates Dropdown */}
      {showTemplatesDropdown && showTemplates && (
        <div className="absolute z-50 mt-1 w-full bg-bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 bg-bg-muted border-b border-border">
            <span className="text-xs text-text-muted font-medium">Prompt Templates</span>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {/* Group by category */}
            {(['scheduling', 'routing', 'status', 'parts'] as const).map((category) => {
              const categoryTemplates = PROMPT_TEMPLATES.filter((t) => t.category === category);
              if (categoryTemplates.length === 0) return null;

              return (
                <div key={category} className="mb-3 last:mb-0">
                  <div className="text-xs text-text-muted uppercase font-medium px-2 py-1">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {categoryTemplates.map((template) => (
                      <button
                        key={template.label}
                        type="button"
                        onClick={() => selectTemplate(template)}
                        className="w-full px-2 py-1.5 text-left text-sm rounded hover:bg-bg-hover transition-colors"
                      >
                        <span className="block text-text-primary">{template.label}</span>
                        <span className="block text-xs text-text-muted truncate">{template.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-3 py-2 bg-bg-muted border-t border-border text-xs text-text-muted flex items-center gap-2">
            <span>Click template to use</span>
            <span className="text-text-secondary">|</span>
            <span>Use placeholders like {'{technician}'}</span>
          </div>
        </div>
      )}

      {/* Click outside handler */}
      {(showHistoryDropdown || showTemplatesDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowHistoryDropdown(false);
            setShowTemplatesDropdown(false);
          }}
        />
      )}
    </div>
  );
});
