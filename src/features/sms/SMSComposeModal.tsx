import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
} from "@/components/ui/Dialog";
import { useSendSMS, useSMSTemplates } from "@/api/hooks/useSMS";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { useAIGenerate } from "@/hooks/useAI";

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
  defaultPhone = "",
  customerId,
  workOrderId,
  customerName,
}: SMSComposeModalProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);

  const sendSMS = useSendSMS();
  const { data: templates } = useSMSTemplates();
  const generateAI = useAIGenerate();

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
      setMessage("");
    } catch (error) {
      toastError("Failed to send SMS");
    }
  };

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    try {
      const result = await generateAI.mutateAsync({
        type: "sms",
        context: {
          prompt: aiPrompt,
          customer_name: customerName,
          customer_id: customerId,
          max_length: 160,
        },
        tone: "friendly",
      });

      // SMS should be concise - truncate if needed
      const content = result.content.slice(0, 160);
      setMessage(content);
      setShowAiPanel(false);
      setAiPrompt("");
      toastSuccess("AI-generated SMS ready!");
    } catch {
      // Demo fallback
      const demoSMS = generateDemoSMS(aiPrompt, customerName);
      setMessage(demoSMS);
      setShowAiPanel(false);
      setAiPrompt("");
      toastSuccess("AI draft generated (demo mode)");
    }
  };

  // Demo SMS generator
  function generateDemoSMS(prompt: string, name?: string): string {
    const lowerPrompt = prompt.toLowerCase();
    const greeting = name ? `Hi ${name}` : "Hi";

    if (
      lowerPrompt.includes("reminder") ||
      lowerPrompt.includes("appointment")
    ) {
      return `${greeting}! Just a friendly reminder about your upcoming service appointment. Reply CONFIRM to confirm or call us to reschedule.`;
    }
    if (lowerPrompt.includes("complete") || lowerPrompt.includes("done")) {
      return `${greeting}! Your service has been completed. Thank you for choosing us! Please reply with any feedback.`;
    }
    if (
      lowerPrompt.includes("way") ||
      lowerPrompt.includes("route") ||
      lowerPrompt.includes("arriving")
    ) {
      return `${greeting}! Our technician is on the way and will arrive in approximately 15-20 minutes. See you soon!`;
    }
    if (lowerPrompt.includes("thank")) {
      return `${greeting}! Thank you for your business today. We appreciate you choosing us! Have a great day!`;
    }
    if (lowerPrompt.includes("invoice") || lowerPrompt.includes("payment")) {
      return `${greeting}! Your invoice is ready. Pay online at our portal or call us for payment options. Thank you!`;
    }
    return `${greeting}! Thank you for choosing our services. Let us know if you have any questions!`;
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="md">
        <DialogHeader onClose={onClose}>Send SMS</DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* AI Assistant Panel */}
            {showAiPanel && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <h3 className="font-medium text-text-primary text-sm">
                    AI SMS Assistant
                  </h3>
                </div>
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Send appointment reminder..."
                  className="mb-2"
                />
                <div className="flex gap-2 mb-2">
                  <Button
                    size="sm"
                    onClick={handleAIGenerate}
                    disabled={!aiPrompt.trim() || generateAI.isPending}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {generateAI.isPending ? "..." : "Generate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAiPanel(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setAiPrompt("Send appointment reminder")}
                    className="text-xs px-2 py-0.5 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
                  >
                    Reminder
                  </button>
                  <button
                    onClick={() => setAiPrompt("Technician on the way")}
                    className="text-xs px-2 py-0.5 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
                  >
                    On Way
                  </button>
                  <button
                    onClick={() => setAiPrompt("Service completed thank you")}
                    className="text-xs px-2 py-0.5 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary"
                  >
                    Complete
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
                <span>Use AI to draft SMS</span>
              </button>
            )}

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
                  {templates
                    .filter((t) => t.is_active)
                    .map((template) => (
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
                    : "Standard SMS"}
                </p>
                <p
                  className={`text-xs ${message.length > 320 ? "text-danger" : "text-text-muted"}`}
                >
                  {message.length}/320
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {customerName && (
              <div className="p-3 bg-bg-muted rounded-lg">
                <p className="text-sm text-text-secondary">
                  Sending to:{" "}
                  <span className="font-medium text-text-primary">
                    {customerName}
                  </span>
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
                {sendSMS.isPending ? "Sending..." : "Send SMS"}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
