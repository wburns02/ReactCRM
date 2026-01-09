/**
 * TwilioSMSPanel - Real-time SMS communication via Twilio
 *
 * Features:
 * - Connection status indicator
 * - Send SMS messages
 * - Template selection
 * - Character count with segment info
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { apiClient } from '@/api/client';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface TwilioSMSPanelProps {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  workOrderId?: string;
}

interface TwilioStatus {
  connected: boolean;
  configured: boolean;
  account_name?: string;
  phone_number?: string;
  message: string;
}

// SMS Templates
const SMS_TEMPLATES = [
  {
    id: 'custom',
    name: 'Custom Message',
    content: '',
  },
  {
    id: 'reminder',
    name: 'Appointment Reminder',
    content: 'Hi {{customer_name}}, this is MAC Septic. Your appointment is scheduled for {{appointment_date}} at {{appointment_time}}. Reply STOP to opt out.',
  },
  {
    id: 'enroute',
    name: 'Tech En Route',
    content: 'Hi {{customer_name}}, your technician is on the way and should arrive in approximately {{eta_minutes}} minutes. Thank you for choosing MAC Septic!',
  },
  {
    id: 'complete',
    name: 'Service Complete',
    content: 'Hi {{customer_name}}, your service has been completed. Thank you for your business! Your invoice will be emailed shortly. Reply STOP to opt out.',
  },
  {
    id: 'payment',
    name: 'Payment Reminder',
    content: 'Hi {{customer_name}}, this is a friendly reminder that your invoice of {{invoice_amount}} is due. Pay online at: {{invoice_link}}. Reply STOP to opt out.',
  },
];

export function TwilioSMSPanel({
  customerId,
  customerName,
  customerPhone,
  workOrderId,
}: TwilioSMSPanelProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');

  // Fetch Twilio status
  const { data: twilioStatus, isLoading: statusLoading } = useQuery<TwilioStatus>({
    queryKey: ['twilio', 'status'],
    queryFn: async () => {
      const response = await apiClient.get('/twilio/status');
      return response.data;
    },
    staleTime: 60000, // Cache for 1 minute
    retry: 1,
  });

  // Send SMS mutation
  const sendSMS = useMutation({
    mutationFn: async (body: string) => {
      const response = await apiClient.post('/communications/sms/send', {
        to: customerPhone,
        body,
        customer_id: parseInt(customerId),
        source: workOrderId ? `work_order:${workOrderId}` : 'manual',
      });
      return response.data;
    },
    onSuccess: () => {
      toastSuccess('SMS sent successfully');
      setMessage('');
      setSelectedTemplate('custom');
      // Invalidate conversation cache
      queryClient.invalidateQueries({ queryKey: ['communications', 'conversation', customerId] });
    },
    onError: (error: Error) => {
      toastError(error.message || 'Failed to send SMS');
    },
  });

  // Handle template selection
  useEffect(() => {
    const template = SMS_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template && template.content) {
      // Replace merge fields with actual values
      let content = template.content
        .replace('{{customer_name}}', customerName)
        .replace('{{eta_minutes}}', '15'); // Default ETA
      setMessage(content);
    } else if (selectedTemplate === 'custom') {
      setMessage('');
    }
  }, [selectedTemplate, customerName]);

  // Character and segment counting
  const charCount = message.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;
  const isOverLimit = charCount > 1600; // 10 segments max
  const remainingInSegment = 160 - (charCount % 160);

  const handleSend = () => {
    if (!message.trim() || !customerPhone) return;
    sendSMS.mutate(message.trim());
  };

  const isConnected = twilioStatus?.connected ?? false;
  const phoneFormatted = customerPhone || 'No phone number';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42V7z" />
            </svg>
            Twilio SMS
          </CardTitle>
          <div className="flex items-center gap-2">
            {statusLoading ? (
              <Badge variant="default">Checking...</Badge>
            ) : isConnected ? (
              <Badge variant="success" className="flex items-center gap-1">
                <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
                Connected
              </Badge>
            ) : (
              <Badge variant="danger" className="flex items-center gap-1">
                <span className="w-2 h-2 bg-current rounded-full" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected && !statusLoading ? (
          <div className="text-center py-6 text-text-secondary">
            <svg className="w-12 h-12 mx-auto mb-3 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-medium text-text-primary mb-1">Twilio Not Connected</p>
            <p className="text-sm">{twilioStatus?.message || 'Please configure Twilio credentials'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recipient Info */}
            <div className="flex items-center justify-between p-3 bg-bg-muted rounded-lg">
              <div>
                <p className="text-sm text-text-secondary">To</p>
                <p className="font-medium">{customerName}</p>
                <p className="text-sm text-text-secondary">{phoneFormatted}</p>
              </div>
              {twilioStatus?.phone_number && (
                <div className="text-right">
                  <p className="text-sm text-text-secondary">From</p>
                  <p className="text-sm font-mono">{twilioStatus.phone_number}</p>
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Message Template
              </label>
              <Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {SMS_TEMPLATES.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Message
              </label>
              <div className="relative">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                  className={isOverLimit ? 'border-danger' : ''}
                  disabled={!customerPhone || sendSMS.isPending}
                />
                <div className={`
                  absolute bottom-2 right-2 text-xs px-2 py-1 rounded
                  ${isOverLimit ? 'bg-danger/10 text-danger' :
                    charCount > 140 ? 'bg-warning/10 text-warning' :
                    'bg-bg-muted text-text-muted'}
                `}>
                  {charCount}/160 {segmentCount > 1 && `(${segmentCount} segments)`}
                </div>
              </div>
              {charCount > 0 && charCount <= 160 && (
                <p className="text-xs text-text-muted mt-1">
                  {remainingInSegment} characters remaining in this segment
                </p>
              )}
            </div>

            {/* Send Button */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Messages are sent via Twilio. Standard SMS rates apply.
              </p>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || !customerPhone || isOverLimit || sendSMS.isPending}
              >
                {sendSMS.isPending ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send SMS
                  </>
                )}
              </Button>
            </div>

            {/* No Phone Warning */}
            {!customerPhone && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning text-sm">
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Customer phone number required to send SMS
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TwilioSMSPanel;
