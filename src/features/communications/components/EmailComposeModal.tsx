import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
} from "@/components/ui/Dialog";
import { useSendEmail } from "@/api/hooks/useCommunications";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { useAIGenerate } from "@/hooks/useAI";

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
  defaultEmail = "",
  customerId,
  customerName,
}: EmailComposeModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);

  const sendEmail = useSendEmail();
  const generateAI = useAIGenerate();

  const handleSend = async () => {
    if (!email || !subject || !body) return;

    try {
      await sendEmail.mutateAsync({
        customer_id: customerId || "",
        email,
        subject,
        message: body,
      });
      toastSuccess("Email sent successfully");
      onClose();
      // Reset form
      setSubject("");
      setBody("");
    } catch (error) {
      toastError("Failed to send email");
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    try {
      const result = await generateAI.mutateAsync({
        type: "email",
        context: {
          prompt: aiPrompt,
          customer_name: customerName,
          customer_id: customerId,
        },
        tone: "professional",
      });

      // Parse AI response - extract subject and body if possible
      const content = result.content;
      const subjectMatch = content.match(/Subject:\s*(.+?)(?:\n|$)/i);
      const bodyMatch = content.match(/(?:Body:|Message:)\s*([\s\S]+)/i);

      if (subjectMatch) {
        setSubject(subjectMatch[1].trim());
      }
      if (bodyMatch) {
        setBody(bodyMatch[1].trim());
      } else if (!subjectMatch) {
        // If no structured format, just use as body
        setBody(content);
      }

      setShowAiPanel(false);
      setAiPrompt("");
      toastSuccess("AI-generated email content ready!");
    } catch (error) {
      // Demo fallback for when AI backend isn't available
      const demoContent = generateDemoEmail(aiPrompt, customerName);
      setSubject(demoContent.subject);
      setBody(demoContent.body);
      setShowAiPanel(false);
      setAiPrompt("");
      toastSuccess("AI draft generated (demo mode)");
    }
  };

  // Demo email generator for when backend unavailable
  function generateDemoEmail(prompt: string, name?: string): { subject: string; body: string } {
    const lowerPrompt = prompt.toLowerCase();
    const greeting = name ? `Dear ${name}` : "Dear Valued Customer";

    if (lowerPrompt.includes("follow") || lowerPrompt.includes("check")) {
      return {
        subject: "Following Up on Your Recent Service",
        body: `${greeting},

I wanted to follow up on your recent service with us. We hope everything is working perfectly!

If you have any questions or need any additional assistance, please don't hesitate to reach out. We're always here to help.

Thank you for choosing us for your service needs.

Best regards,
The Service Team`,
      };
    }

    if (lowerPrompt.includes("thank") || lowerPrompt.includes("appreciation")) {
      return {
        subject: "Thank You for Your Business",
        body: `${greeting},

Thank you so much for choosing our services! We truly appreciate your business and trust in us.

It was a pleasure serving you, and we look forward to assisting you again in the future. If you have any feedback or suggestions, we'd love to hear from you.

Warm regards,
The Service Team`,
      };
    }

    if (lowerPrompt.includes("appointment") || lowerPrompt.includes("schedule")) {
      return {
        subject: "Your Upcoming Appointment Confirmation",
        body: `${greeting},

This is a friendly reminder about your upcoming service appointment.

Our technician will arrive at the scheduled time. Please ensure someone is available to provide access to the service area.

If you need to reschedule or have any questions, please contact us at your earliest convenience.

Best regards,
The Service Team`,
      };
    }

    if (lowerPrompt.includes("invoice") || lowerPrompt.includes("payment")) {
      return {
        subject: "Invoice & Payment Information",
        body: `${greeting},

Please find attached your invoice for the recent service. You can make payment through our secure online portal or contact us for alternative payment options.

If you have any questions about the charges or need to discuss payment arrangements, please don't hesitate to reach out.

Thank you for your prompt attention to this matter.

Best regards,
The Service Team`,
      };
    }

    // Default professional email
    return {
      subject: "Message from Our Service Team",
      body: `${greeting},

Thank you for your continued trust in our services.

${prompt}

Please let us know if you have any questions or if there's anything else we can assist you with.

Best regards,
The Service Team`,
    };
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent size="lg">
        <DialogHeader onClose={handleClose}>Compose Email</DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* AI Assistant Panel */}
            {showAiPanel && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✨</span>
                  <h3 className="font-medium text-text-primary">AI Email Assistant</h3>
                </div>
                <p className="text-sm text-text-secondary mb-3">
                  Describe what you want to say and AI will draft a professional email for you.
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                  placeholder="e.g., Write a follow-up email thanking them for their business..."
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAIGenerate}
                    disabled={!aiPrompt.trim() || generateAI.isPending}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {generateAI.isPending ? "Generating..." : "Generate Draft"}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowAiPanel(false)}>
                    Cancel
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-text-muted">Quick prompts:</span>
                  <button
                    onClick={() => setAiPrompt("Write a follow-up email checking on their satisfaction")}
                    className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
                  >
                    Follow-up
                  </button>
                  <button
                    onClick={() => setAiPrompt("Write a thank you email for their recent service")}
                    className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
                  >
                    Thank You
                  </button>
                  <button
                    onClick={() => setAiPrompt("Write an appointment reminder email")}
                    className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
                  >
                    Appointment
                  </button>
                  <button
                    onClick={() => setAiPrompt("Write an invoice/payment reminder email")}
                    className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
                  >
                    Payment
                  </button>
                </div>
              </div>
            )}

            {/* AI Generate Button (when panel hidden) */}
            {!showAiPanel && (
              <button
                onClick={() => setShowAiPanel(true)}
                className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
              >
                <span>✨</span>
                <span>Use AI to draft email</span>
              </button>
            )}

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
                {sendEmail.isPending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
