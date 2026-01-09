import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogBody } from '@/components/ui/Dialog';
import { useSendEmail } from '@/api/hooks/useCommunications';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface EmailComposeModalProps {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
  customerId?: string;
  customerName?: string;
}

/**
 * Email Compose Modal for sending emails
 */
export function EmailComposeModal({
  open,
  onClose,
  defaultEmail = '',
  customerId,
  customerName,
}: EmailComposeModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const sendEmail = useSendEmail();

  const handleSend = async () => {
    if (!email || !subject || !body) return;

    try {
      await sendEmail.mutateAsync({
        customer_id: customerId || '',
        email,
        subject,
        message: body,
      });
      toastSuccess('Email sent successfully');
      onClose();
      // Reset form
      setSubject('');
      setBody('');
    } catch (error) {
      toastError('Failed to send email');
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent size="lg">
        <DialogHeader onClose={handleClose}>
          Compose Email
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* To */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                To
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
              {customerName && (
                <p className="text-xs text-text-muted mt-1">
                  Sending to: {customerName}
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject line"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Type your message here..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!email || !subject || !body || sendEmail.isPending}
              >
                {sendEmail.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
