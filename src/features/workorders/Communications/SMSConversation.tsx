/**
 * SMSConversation Component
 *
 * Two-way SMS thread display with chat-style message interface.
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Textarea } from '@/components/ui/Textarea.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { useConversation, useSendSMS } from './hooks/useCommunications.ts';
import type { SMSDeliveryStatus } from '@/api/types/sms.ts';

interface SMSConversationProps {
  customerId: string;
  workOrderId?: string;
  customerName?: string;
  customerPhone?: string;
}

const STATUS_ICONS: Record<SMSDeliveryStatus, React.ReactNode> = {
  queued: (
    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" />
    </svg>
  ),
  sending: (
    <svg className="w-3 h-3 text-gray-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" />
    </svg>
  ),
  sent: (
    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  delivered: (
    <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
    </svg>
  ),
  undelivered: (
    <svg className="w-3 h-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  failed: (
    <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  read: (
    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

export function SMSConversation({
  customerId,
  workOrderId,
  customerName,
  customerPhone,
}: SMSConversationProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation, isLoading, error } = useConversation(customerId);
  const sendSMS = useSendSMS();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Character count
  const charCount = newMessage.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;
  const isOverLimit = charCount > 1600; // 10 segments max

  const handleSend = async () => {
    if (!newMessage.trim() || isOverLimit || !customerPhone) return;

    try {
      await sendSMS.mutateAsync({
        to: customerPhone,
        message: newMessage.trim(),
        customerId,
        workOrderId,
      });
      setNewMessage('');
      textareaRef.current?.focus();
    } catch (err) {
      console.error('Failed to send SMS:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  // Group messages by date
  const messagesByDate = conversation?.messages?.reduce(
    (groups, message) => {
      const date = formatDate(message.queued_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, typeof conversation.messages>
  );

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-danger">
          <p>Failed to load conversation</p>
          <p className="text-sm text-text-secondary mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-surface rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-medium">{customerName || 'Customer'}</p>
          <p className="text-sm text-text-secondary">{customerPhone || 'No phone number'}</p>
        </div>
        {conversation?.unread_count ? (
          <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
            {conversation.unread_count} new
          </span>
        ) : null}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          // Loading state
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-lg`} />
              </div>
            ))}
          </div>
        ) : !conversation?.messages?.length ? (
          // Empty state
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          // Messages grouped by date
          Object.entries(messagesByDate || {}).map(([date, messages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text-secondary font-medium">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {messages.map((message) => {
                  const isOutbound = message.direction === 'outbound';
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[75%] px-4 py-2 rounded-2xl
                          ${
                            isOutbound
                              ? 'bg-primary text-white rounded-br-md'
                              : 'bg-surface-secondary text-text-primary rounded-bl-md'
                          }
                        `}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div
                          className={`
                            flex items-center gap-1.5 mt-1
                            ${isOutbound ? 'justify-end' : 'justify-start'}
                          `}
                        >
                          <span
                            className={`text-xs ${isOutbound ? 'text-white/70' : 'text-text-secondary'}`}
                          >
                            {formatTime(message.queued_at)}
                          </span>
                          {isOutbound && STATUS_ICONS[message.status]}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={2}
              className="resize-none pr-16"
              disabled={!customerPhone || sendSMS.isPending}
            />
            <div
              className={`
                absolute bottom-2 right-2 text-xs
                ${isOverLimit ? 'text-danger' : charCount > 140 ? 'text-warning' : 'text-text-secondary'}
              `}
            >
              {charCount}/160
              {segmentCount > 1 && ` (${segmentCount} segments)`}
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isOverLimit || !customerPhone || sendSMS.isPending}
            className="self-end"
          >
            {sendSMS.isPending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </Button>
        </div>

        {/* Quick tip */}
        <p className="text-xs text-text-secondary mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

export default SMSConversation;
