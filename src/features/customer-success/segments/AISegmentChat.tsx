/**
 * AISegmentChat Component
 *
 * Natural language interface for creating segments.
 * Features:
 * - Chat-style input for natural language queries
 * - Quick suggestion buttons
 * - Real-time parsing results
 * - Ability to refine and save segments
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils.ts';
import type { SegmentRuleSet } from '@/api/types/customerSuccess.ts';
import { useParseNaturalLanguage, type ParsedSegmentQuery } from '@/hooks/useSegments.ts';
import { RuleSummary } from './components/RuleGroup.tsx';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  parsedResult?: ParsedSegmentQuery;
}

interface AISegmentChatProps {
  onApplySegment?: (data: { name: string; rules: SegmentRuleSet }) => void;
  onEditInBuilder?: (rules: SegmentRuleSet) => void;
  className?: string;
}

const QUICK_SUGGESTIONS = [
  { label: 'High-value customers', query: 'Show me high-value enterprise customers' },
  { label: 'At-risk accounts', query: 'Find customers at risk of churning' },
  { label: 'Renewal soon', query: 'Customers with renewals in the next 60 days' },
  { label: 'Low engagement', query: 'Customers with low engagement scores' },
  { label: 'New signups', query: 'New customers from the last 30 days' },
  { label: 'Expansion ready', query: 'Healthy customers ready for expansion' },
];

export function AISegmentChat({
  onApplySegment,
  onEditInBuilder,
  className,
}: AISegmentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I can help you create customer segments using natural language. Try describing the customers you want to find, like "high-value enterprise customers at risk of churning" or "new customers who haven\'t completed onboarding".',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const parseMutation = useParseNaturalLanguage();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (query: string = input) => {
    if (!query.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const result = await parseMutation.mutateAsync(query.trim());

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `I understand you're looking for ${result.suggested_name}. Here's what I found:`,
        timestamp: new Date(),
        parsedResult: result,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble understanding that request. Could you try rephrasing it? For example: "Show me customers with health score below 50" or "Find enterprise accounts that haven\'t had a QBR in 90 days".',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleApply = (result: ParsedSegmentQuery) => {
    onApplySegment?.({
      name: result.suggested_name,
      rules: result.rules,
    });
  };

  const handleEditInBuilder = (rules: SegmentRuleSet) => {
    onEditInBuilder?.(rules);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        content: 'Chat cleared. How can I help you create a new segment?',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">AI Segment Builder</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Describe your segment in natural language</p>
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Clear chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
              )}
            >
              <p className="text-sm">{message.content}</p>

              {/* Parsed Result */}
              {message.parsedResult && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                  {/* Confidence indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          message.parsedResult.confidence >= 0.8 ? 'bg-green-500' :
                          message.parsedResult.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${message.parsedResult.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(message.parsedResult.confidence * 100)}% confidence
                    </span>
                  </div>

                  {/* Segment name */}
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {message.parsedResult.suggested_name}
                  </h4>

                  {/* Explanation */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {message.parsedResult.explanation}
                  </p>

                  {/* Rules preview */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                    <RuleSummary ruleSet={message.parsedResult.rules} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {onApplySegment && (
                      <button
                        onClick={() => handleApply(message.parsedResult!)}
                        className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        Create Segment
                      </button>
                    )}
                    {onEditInBuilder && (
                      <button
                        onClick={() => handleEditInBuilder(message.parsedResult!.rules)}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Refine in Builder
                      </button>
                    )}
                  </div>
                </div>
              )}

              <span className="text-xs opacity-60 mt-2 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Try:</span>
          {QUICK_SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleQuickSuggestion(suggestion.query)}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe the customers you want to find..."
              rows={1}
              className="w-full px-4 py-3 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white placeholder-gray-400"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isProcessing}
            className={cn(
              'p-3 rounded-xl transition-colors',
              input.trim() && !isProcessing
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

/**
 * Compact version for sidebar/modal
 */
export function AISegmentChatCompact({
  onApplySegment,
  className,
}: {
  onApplySegment?: (data: { name: string; rules: SegmentRuleSet }) => void;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ParsedSegmentQuery | null>(null);
  const parseMutation = useParseNaturalLanguage();

  const handleSubmit = async () => {
    if (!query.trim()) return;

    try {
      const parsed = await parseMutation.mutateAsync(query.trim());
      setResult(parsed);
    } catch {
      // Error handling
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <span className="font-medium text-gray-900 dark:text-white">AI Segment Builder</span>
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Describe your segment..."
          className="w-full pl-4 pr-12 py-3 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white placeholder-gray-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || parseMutation.isPending}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-primary-hover disabled:opacity-50"
        >
          {parseMutation.isPending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-white">{result.suggested_name}</h4>
            <span className={cn(
              'px-2 py-0.5 text-xs rounded-full',
              result.confidence >= 0.8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              result.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {Math.round(result.confidence * 100)}% match
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{result.explanation}</p>
          {onApplySegment && (
            <button
              onClick={() => onApplySegment({ name: result.suggested_name, rules: result.rules })}
              className="w-full px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
            >
              Create Segment
            </button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_SUGGESTIONS.slice(0, 3).map((suggestion, index) => (
          <button
            key={index}
            onClick={() => {
              setQuery(suggestion.query);
              handleSubmit();
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
