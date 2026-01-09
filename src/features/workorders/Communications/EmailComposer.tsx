/**
 * EmailComposer Component
 *
 * Email editor with template selection, variable preview, and send capabilities.
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { Textarea } from '@/components/ui/Textarea.tsx';
import { Card } from '@/components/ui/Card.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import { useSendEmail } from './hooks/useCommunications.ts';
import {
  ALL_TEMPLATES,
  getTemplateById,
  renderTemplate,
  extractVariables,
} from './templates/index.ts';

interface EmailComposerProps {
  to: string;
  templateId?: string;
  variables?: Record<string, string>;
  customerId?: string;
  workOrderId?: string;
  onSent?: () => void;
}

export function EmailComposer({
  to,
  templateId: initialTemplateId,
  variables: initialVariables = {},
  customerId,
  workOrderId,
  onSent,
}: EmailComposerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>(initialVariables);
  const [showPreview, setShowPreview] = useState(false);
  const [toEmail, setToEmail] = useState(to);

  const sendEmail = useSendEmail();

  // Load template when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = getTemplateById(selectedTemplateId);
      if (template) {
        setSubject(template.subject);
        setBody(template.emailTemplate);
      }
    }
  }, [selectedTemplateId]);

  // Initialize variables from template
  useEffect(() => {
    const templateVars = extractVariables(body);
    const newVariables = { ...variables };
    templateVars.forEach((v) => {
      if (!(v in newVariables)) {
        newVariables[v] = '';
      }
    });
    setVariables(newVariables);
  }, [body]);

  // Rendered preview
  const previewSubject = useMemo(() => renderTemplate(subject, variables), [subject, variables]);
  const previewBody = useMemo(() => renderTemplate(body, variables), [body, variables]);

  // Check for unfilled variables
  const unfilledVariables = useMemo(() => {
    const vars = extractVariables(body + subject);
    return vars.filter((v) => !variables[v] || variables[v].trim() === '');
  }, [body, subject, variables]);

  const handleSend = async () => {
    if (!toEmail || !subject || !body) return;

    try {
      await sendEmail.mutateAsync({
        to: toEmail,
        subject: previewSubject,
        body: previewBody,
        customerId,
        workOrderId,
        templateId: selectedTemplateId || undefined,
      });
      onSent?.();
      // Reset form
      setSelectedTemplateId('');
      setSubject('');
      setBody('');
      setVariables({});
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  const insertVariable = (variable: string) => {
    const insertion = `{{${variable}}}`;
    setBody((prev) => prev + insertion);
  };

  return (
    <div className="space-y-4">
      {/* To field */}
      <div className="space-y-2">
        <Label htmlFor="email-to">To</Label>
        <Input
          id="email-to"
          type="email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          placeholder="customer@example.com"
        />
      </div>

      {/* Template selection */}
      <div className="space-y-2">
        <Label htmlFor="email-template">Template (Optional)</Label>
        <Select
          id="email-template"
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
        >
          <option value="">Custom Email</option>
          {ALL_TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="email-subject">Subject</Label>
        <Input
          id="email-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject..."
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-body">Body</Label>
          <div className="flex gap-2">
            {/* Variable insertion dropdown */}
            <Select
              className="w-48 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  insertVariable(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="">Insert variable...</option>
              <optgroup label="Customer">
                <option value="customer_name">Customer Name</option>
                <option value="customer_first_name">First Name</option>
              </optgroup>
              <optgroup label="Appointment">
                <option value="appointment_date">Date</option>
                <option value="appointment_window">Time Window</option>
                <option value="service_type">Service Type</option>
                <option value="service_address">Address</option>
              </optgroup>
              <optgroup label="Technician">
                <option value="technician_name">Technician Name</option>
                <option value="eta_time">ETA Time</option>
                <option value="eta_minutes">ETA Minutes</option>
              </optgroup>
              <optgroup label="Invoice">
                <option value="invoice_amount">Amount</option>
                <option value="invoice_link">Payment Link</option>
                <option value="invoice_number">Invoice Number</option>
              </optgroup>
              <optgroup label="Company">
                <option value="company_name">Company Name</option>
                <option value="company_phone">Phone</option>
              </optgroup>
              <optgroup label="Links">
                <option value="tracking_link">Tracking Link</option>
                <option value="review_link">Review Link</option>
              </optgroup>
            </Select>
          </div>
        </div>
        <Textarea
          id="email-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Email content..."
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      {/* Variable editor */}
      {Object.keys(variables).length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Variable Values</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(variables).map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{key.replace(/_/g, ' ')}</Label>
                <Input
                  value={variables[key]}
                  onChange={(e) => handleVariableChange(key, e.target.value)}
                  placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                  className={`text-sm ${!variables[key] ? 'border-warning' : ''}`}
                />
              </div>
            ))}
          </div>
          {unfilledVariables.length > 0 && (
            <p className="text-xs text-warning mt-2">
              {unfilledVariables.length} variable(s) not filled: {unfilledVariables.join(', ')}
            </p>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="secondary"
          onClick={() => setShowPreview(true)}
          disabled={!subject || !body}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Preview
        </Button>
        <Button
          onClick={handleSend}
          disabled={!toEmail || !subject || !body || sendEmail.isPending}
        >
          {sendEmail.isPending ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
              Sending...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Send Email
            </>
          )}
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)}>
        <DialogContent size="lg">
          <DialogHeader onClose={() => setShowPreview(false)}>Email Preview</DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-text-secondary">To: </span>
                <span className="font-medium">{toEmail}</span>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Subject: </span>
                <span className="font-medium">{previewSubject}</span>
              </div>
              <div className="border-t border-border pt-4">
                <div className="bg-surface-secondary p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
                  {previewBody}
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setShowPreview(false);
                handleSend();
              }}
              disabled={sendEmail.isPending}
            >
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmailComposer;
