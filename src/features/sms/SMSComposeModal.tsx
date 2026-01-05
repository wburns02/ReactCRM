import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogBody } from '@/components/ui/Dialog';
import { useSendSMS, useSMSTemplates } from '@/api/hooks/useSMS';
import { toastError } from '@/components/ui/Toast';

interface SMSComposeModalProps {
  open: boolean;
  onClose: () => void;
  defaultPhone?: string;
  customerId?: number;
  workOrderId?: string;
  customerName?: string;
}

/**
 * SMS Compose Modal for sending quick SMS messages
 */
export function SMSComposeModal({
  open,
  onClose,
  defaultPhone = '',
  customerId,
  workOrderId,
  customerName,
}: SMSComposeModalProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const sendSMS = useSendSMS();
  const { data: templates } = useSMSTemplates();

  const handleSelectTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      // Replace basic variables if we have customer info
      let content = template.content;
      if (customerName) {
        content = content.replace(/\{\{customer_name\}\}/g, customerName);
      }
      setMessage(content);
    }
    setSelectedTemplateId(templateId);
  };

  const handleSend = async () => {
    if (!phone || !message) return;

    try {
      await sendSMS.mutateAsync({
        to_phone: phone,
        message,
        customer_id: customerId,
        work_order_id: workOrderId,
      });
      onClose();
      setMessage('');
    } catch (error) {
      toastError('Failed to send SMS');
    }
  };

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="md">
        <DialogHeader onClose={onClose}>
          Send SMS
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Template Selection */}
            {templates && templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Use Template (optional)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                >
                  <option value="">Select a template...</option>
                  {templates.filter((t) => t.is_active).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Message Content */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={320}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary resize-none"
                placeholder="Type your message here..."
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-text-muted">
                  {message.length > 160
                    ? `${Math.ceil(message.length / 160)} messages`
                    : 'Standard SMS'}
                </p>
                <p className={`text-xs ${message.length > 320 ? 'text-danger' : 'text-text-muted'}`}>
                  {message.length}/320
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {customerName && (
              <div className="p-3 bg-bg-muted rounded-lg">
                <p className="text-sm text-text-secondary">
                  Sending to: <span className="font-medium text-text-primary">{customerName}</span>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!phone || !message || sendSMS.isPending}
              >
                {sendSMS.isPending ? 'Sending...' : 'Send SMS'}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
