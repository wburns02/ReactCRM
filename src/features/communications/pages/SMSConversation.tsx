import { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface Message {
  id: number;
  content: string;
  direction: 'inbound' | 'outbound';
  sent_at: string;
  status: string;
}

/**
 * SMS Conversation Thread
 */
export function SMSConversation() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['sms-conversation', id],
    queryFn: async () => {
      const response = await apiClient.get(`/sms/conversations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiClient.post('/sms/send', {
        conversation_id: id,
        content,
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['sms-conversation', id] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-bg-card flex items-center gap-3">
        <Link to="/communications/sms" className="text-text-muted hover:text-text-primary">
          &larr;
        </Link>
        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium">
          {conversation?.customer_name?.charAt(0) || '?'}
        </div>
        <div>
          <h1 className="font-medium text-text-primary">
            {conversation?.customer_name || 'Unknown'}
          </h1>
          <p className="text-sm text-text-muted">{conversation?.phone_number}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {conversation?.messages?.length === 0 ? (
          <div className="text-center text-text-muted py-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation by sending a message</p>
          </div>
        ) : (
          conversation?.messages?.map((msg: Message) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.direction === 'outbound'
                    ? 'bg-primary text-white'
                    : 'bg-bg-card border border-border text-text-primary'
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${
                  msg.direction === 'outbound' ? 'text-white/70' : 'text-text-muted'
                }`}>
                  {msg.sent_at}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-bg-card">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
          >
            {sendMutation.isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
