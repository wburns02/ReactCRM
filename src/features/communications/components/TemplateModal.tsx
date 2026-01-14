import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
} from "@/components/ui/Dialog";
import { apiClient } from "@/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";

interface Template {
  id?: number;
  name: string;
  type: "sms" | "email";
  category: string;
  content: string;
}

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  template?: Template | null;
}

const CATEGORIES = [
  "appointment",
  "reminder",
  "invoice",
  "follow-up",
  "marketing",
  "general",
];

const VARIABLE_HELPERS = [
  { label: "Customer Name", value: "{{customer_name}}" },
  { label: "Appointment Date", value: "{{appointment_date}}" },
  { label: "Appointment Time", value: "{{appointment_time}}" },
  { label: "Service Type", value: "{{service_type}}" },
  { label: "Invoice Amount", value: "{{invoice_amount}}" },
  { label: "Company Name", value: "{{company_name}}" },
];

/**
 * Template Create/Edit Modal
 */
export function TemplateModal({ open, onClose, template }: TemplateModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"sms" | "email">("sms");
  const [category, setCategory] = useState("general");
  const [content, setContent] = useState("");

  const queryClient = useQueryClient();
  const isEditing = !!template?.id;

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setCategory(template.category);
      setContent(template.content);
    } else {
      setName("");
      setType("sms");
      setCategory("general");
      setContent("");
    }
  }, [template, open]);

  const createTemplate = useMutation({
    mutationFn: async (data: Omit<Template, "id">) => {
      const response = await apiClient.post("/templates", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      queryClient.invalidateQueries({ queryKey: ["sms", "templates"] });
      toastSuccess("Template created successfully");
      onClose();
    },
    onError: () => {
      toastError("Failed to create template");
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (data: Template) => {
      const response = await apiClient.put(`/templates/${data.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      queryClient.invalidateQueries({ queryKey: ["sms", "templates"] });
      toastSuccess("Template updated successfully");
      onClose();
    },
    onError: () => {
      toastError("Failed to update template");
    },
  });

  const handleSave = async () => {
    if (!name || !content) return;

    const data = { name, type, category, content };

    if (isEditing && template?.id) {
      await updateTemplate.mutateAsync({ ...data, id: template.id });
    } else {
      await createTemplate.mutateAsync(data);
    }
  };

  const insertVariable = (variable: string) => {
    setContent((prev) => prev + variable);
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="lg">
        <DialogHeader onClose={onClose}>
          {isEditing ? "Edit Template" : "Create Template"}
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Template Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Appointment Reminder"
              />
            </div>

            {/* Type and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "sms" | "email")}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Variable Helpers */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Insert Variable
              </label>
              <div className="flex flex-wrap gap-2">
                {VARIABLE_HELPERS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => insertVariable(v.value)}
                    className="px-2 py-1 text-xs bg-bg-muted hover:bg-bg-hover rounded text-text-secondary transition-colors"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={type === "sms" ? 4 : 8}
                maxLength={type === "sms" ? 320 : undefined}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={
                  type === "sms"
                    ? "Type your SMS template..."
                    : "Type your email template..."
                }
              />
              {type === "sms" && (
                <p className="text-xs text-text-muted mt-1">
                  {content.length}/320 characters
                  {content.length > 160 &&
                    ` (${Math.ceil(content.length / 160)} SMS segments)`}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name || !content || isPending}
              >
                {isPending
                  ? "Saving..."
                  : isEditing
                    ? "Update Template"
                    : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
