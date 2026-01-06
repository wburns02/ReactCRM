/**
 * AI Chat Widget Component
 * Floating chat interface for AI assistant
 */
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAIChat } from '@/hooks/useAI';
import type { AIMessage, AIContext } from '@/api/ai';

interface AIChatWidgetProps {
  context?: AIContext;
  defaultOpen?: boolean;
  position?: 'bottom-right' | 'bottom-left';
}

/**
 * Floating AI chat widget
 */
export function AIChatWidget({
  context,
  defaultOpen = false,
  position = 'bottom-right',
}: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, clearChat, isTyping, isLoading } = useAIChat(context);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const positionClasses = position === 'bottom-right' ? 'right-4' : 'left-4';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 ${positionClasses} z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark transition-all hover:scale-105 flex items-center justify-center`}
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 ${positionClasses} z-50 ${
        isMinimized ? 'w-72' : 'w-96'
      } bg-bg-card rounded-lg shadow-2xl border border-border overflow-hidden transition-all`}
    >
      {/* Header */}
      <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-medium">AI Assistant</span>
          {isTyping && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Thinking...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded"
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={clearChat}
            className="p-1 hover:bg-white/20 rounded"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/20 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-bg-body">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-text-muted">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <span
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-bg-card">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-bg-body"
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </>
      )}
    </div>
  );
}

/**
 * Individual chat message component
 */
function ChatMessage({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-white'
            : 'bg-bg-card border border-border text-text-primary'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div
          className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-text-muted'}`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

export default AIChatWidget;
