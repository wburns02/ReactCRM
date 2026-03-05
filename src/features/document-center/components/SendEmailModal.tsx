import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Dialog, DialogContent, DialogHeader, DialogBody } from "@/components/ui/Dialog.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { useSendDocument, useResendDocument } from "@/api/hooks/useDocumentCenter.ts";
import {
  DocumentMeta,
  DOCUMENT_TYPE_INFO,
  sendRequestSchema,
  type SendRequest,
} from "@/api/types/documentCenter.ts";

interface SendEmailModalProps {
  document: DocumentMeta;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData extends SendRequest {}

export function SendEmailModal({ document, isOpen, onClose, onSuccess }: SendEmailModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendMutation = useSendDocument();
  const resendMutation = useResendDocument();

  const isResend = document.status !== "draft";
  const typeInfo = DOCUMENT_TYPE_INFO[document.document_type];

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(sendRequestSchema),
    mode: "onChange",
  });

  // Set default values when modal opens
  useEffect(() => {
    if (isOpen) {
      // Default subject line
      const docTypeMap: Record<string, string> = {
        invoice: "Invoice",
        quote: "Estimate",
        work_order: "Work Order",
        inspection_report: "Inspection Report"
      };
      const docTypeName = docTypeMap[document.document_type] || "Document";
      const defaultSubject = `${docTypeName} ${document.reference_number || ''} from MAC Septic Services`.trim();

      // Default message
      const defaultMessage = `Please find attached your ${document.document_type.replace('_', ' ')} from MAC Septic Services.

If you have any questions or concerns, please don't hesitate to contact us.

Thank you for your business!`;

      // Set form values
      setValue("email", document.sent_to || "");
      setValue("subject", defaultSubject);
      setValue("message", defaultMessage);
    }
  }, [isOpen, document, setValue]);

  const handleFormSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const mutation = isResend ? resendMutation : sendMutation;
      await mutation.mutateAsync({ id: document.id, request: data });
      onSuccess();
      handleClose();
    } catch (error) {
      // Error is handled by the mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogContent size="lg">
        <div className="space-y-6">
        {/* Header */}
        <DialogHeader onClose={handleClose}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {isResend ? "Resend Document" : "Send Document via Email"}
              </div>
              <p className="text-sm text-gray-600">
                {typeInfo?.label} {document.reference_number} - {document.customer_name || "Unknown Customer"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              {...register("email")}
              error={errors.email?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <Input
              id="subject"
              placeholder="Email subject line..."
              {...register("subject")}
              error={errors.subject?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <Textarea
              id="message"
              rows={6}
              placeholder="Enter your message to the customer..."
              {...register("message")}
              error={errors.message?.message}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              The document PDF will be automatically attached to this email.
            </p>
          </div>

          {/* Document Info */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Document to be sent:</h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div style={{ color: typeInfo?.color }}>
                {typeInfo?.icon || "📄"}
              </div>
              <span>{document.file_name}</span>
              <span className="text-gray-400">•</span>
              <span>{document.file_size ? `${Math.round(document.file_size / 1024)}KB` : "Unknown size"}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send size={16} />
              )}
              {isSubmitting ? "Sending..." : isResend ? "Resend Email" : "Send Email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}