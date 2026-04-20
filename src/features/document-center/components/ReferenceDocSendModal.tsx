import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Mail } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog.tsx";
import { useSendReferenceDoc } from "@/api/hooks/useReferenceDocs.ts";
import type { ReferenceDoc } from "@/api/hooks/useReferenceDocs.ts";

const sendSchema = z.object({
  to_email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().optional(),
});

type SendFormData = z.infer<typeof sendSchema>;

interface ReferenceDocSendModalProps {
  doc: ReferenceDoc;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReferenceDocSendModal({ doc, isOpen, onClose, onSuccess }: ReferenceDocSendModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sendMutation = useSendReferenceDoc();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    setValue,
  } = useForm<SendFormData>({
    resolver: zodResolver(sendSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (isOpen) {
      setValue("to_email", "");
      setValue("subject", `${doc.title} — MAC Septic Services`);
      setValue("message", "Please find attached information from MAC Septic Services.\n\nIf you have any questions, please don't hesitate to contact us.");
    }
  }, [isOpen, doc, setValue]);

  const handleFormSubmit = async (data: SendFormData) => {
    setIsSubmitting(true);
    try {
      await sendMutation.mutateAsync({ slug: doc.slug, request: data });
      onSuccess();
      handleClose();
    } catch {
      // Error handled by mutation's onError
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
                  Send Document via Email
                </div>
                <p className="text-sm text-gray-600">
                  {doc.title} - {doc.category}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Email Address */}
            <div>
              <label htmlFor="to_email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <Input
                id="to_email"
                type="email"
                placeholder="customer@example.com"
                {...register("to_email")}
                error={errors.to_email?.message}
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
                {isSubmitting ? "Sending..." : "Send Email"}
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
