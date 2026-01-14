/**
 * NotificationTemplates Component
 *
 * Manage notification templates with editing, variable insertion, and preview.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Select } from "@/components/ui/Select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  ALL_TEMPLATES,
  renderTemplate,
  extractVariables,
  type NotificationTemplate,
} from "./templates/index.ts";
import { SMS_MERGE_FIELDS } from "@/api/types/sms.ts";

interface NotificationTemplatesProps {
  onSaveTemplate?: (template: NotificationTemplate) => void;
}

const SAMPLE_VARIABLES: Record<string, string> = {
  customer_name: "John Smith",
  customer_first_name: "John",
  appointment_date: "January 15, 2026",
  appointment_window: "2:00 PM - 4:00 PM",
  appointment_time: "2:00 PM",
  service_type: "Septic Pumping",
  service_address: "123 Main St, Tampa, FL 33601",
  technician_name: "Mike Johnson",
  eta_time: "2:15 PM",
  eta_minutes: "15",
  tracking_link: "https://track.macseptic.com/abc123",
  invoice_amount: "$350.00",
  invoice_link: "https://pay.macseptic.com/inv-123",
  invoice_number: "INV-2026-001",
  company_name: "MAC Septic",
  company_phone: "(555) 123-4567",
  work_order_number: "WO-2026-001234",
  review_link: "https://review.macseptic.com/r/abc123",
  completion_date: "January 15, 2026",
  due_date: "January 30, 2026",
  days_overdue: "0",
  service_date: "January 15, 2026",
};

export function NotificationTemplates({
  onSaveTemplate,
}: NotificationTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Editable form state
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSmsTemplate, setEditSmsTemplate] = useState("");
  const [editEmailTemplate, setEditEmailTemplate] = useState("");

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return ALL_TEMPLATES;
    const query = searchQuery.toLowerCase();
    return ALL_TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.smsTemplate.toLowerCase().includes(query) ||
        t.emailTemplate.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const handleSelectTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setEditName(template.name);
    setEditSubject(template.subject);
    setEditSmsTemplate(template.smsTemplate);
    setEditEmailTemplate(template.emailTemplate);
    setEditMode(false);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;

    const updatedTemplate: NotificationTemplate = {
      ...selectedTemplate,
      name: editName,
      subject: editSubject,
      smsTemplate: editSmsTemplate,
      emailTemplate: editEmailTemplate,
      variables: [
        ...new Set([
          ...extractVariables(editSmsTemplate),
          ...extractVariables(editEmailTemplate),
        ]),
      ],
    };

    onSaveTemplate?.(updatedTemplate);
    setSelectedTemplate(updatedTemplate);
    setEditMode(false);
  };

  const handleInsertVariable = (variable: string, target: "sms" | "email") => {
    const insertion = `{{${variable}}}`;
    if (target === "sms") {
      setEditSmsTemplate((prev) => prev + insertion);
    } else {
      setEditEmailTemplate((prev) => prev + insertion);
    }
  };

  const smsCharCount = editSmsTemplate.length;
  const smsSegments = Math.ceil(smsCharCount / 160) || 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Notification Templates</h3>
          <p className="text-sm text-text-secondary">
            Manage SMS and email templates for customer communications
          </p>
        </div>
      </div>

      {/* Search */}
      <Input
        type="search"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className={`
              p-4 cursor-pointer transition-all hover:border-primary/50
              ${selectedTemplate?.id === template.id ? "border-primary ring-2 ring-primary/20" : ""}
            `}
            onClick={() => handleSelectTemplate(template)}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium">{template.name}</h4>
              <div className="flex gap-1">
                <Badge variant="default">SMS</Badge>
                <Badge variant="default">Email</Badge>
              </div>
            </div>
            <p className="text-sm text-text-secondary line-clamp-2 mb-2">
              {template.smsTemplate}
            </p>
            <div className="flex flex-wrap gap-1">
              {template.variables.slice(0, 4).map((v) => (
                <span
                  key={v}
                  className="text-xs bg-surface-secondary px-1.5 py-0.5 rounded"
                >
                  {v}
                </span>
              ))}
              {template.variables.length > 4 && (
                <span className="text-xs text-text-secondary">
                  +{template.variables.length - 4} more
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Template editor dialog */}
      <Dialog
        open={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      >
        <DialogContent size="xl">
          <DialogHeader onClose={() => setSelectedTemplate(null)}>
            {editMode ? "Edit Template" : "Template Details"} -{" "}
            {selectedTemplate?.name}
          </DialogHeader>
          <DialogBody className="max-h-[70vh] overflow-y-auto">
            {selectedTemplate && (
              <div className="space-y-6">
                {/* Template name */}
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  {editMode ? (
                    <Input
                      id="template-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    <p className="font-medium">{selectedTemplate.name}</p>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="template-subject">Email Subject</Label>
                  {editMode ? (
                    <Input
                      id="template-subject"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                    />
                  ) : (
                    <p className="text-text-secondary">
                      {selectedTemplate.subject}
                    </p>
                  )}
                </div>

                {/* SMS Template */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sms-template">SMS Template</Label>
                    {editMode && (
                      <Select
                        className="w-48 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleInsertVariable(e.target.value, "sms");
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Insert variable...</option>
                        {SMS_MERGE_FIELDS.map((field) => (
                          <option
                            key={field.key}
                            value={field.key.replace(/\{\{|\}\}/g, "")}
                          >
                            {field.description}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                  {editMode ? (
                    <>
                      <Textarea
                        id="sms-template"
                        value={editSmsTemplate}
                        onChange={(e) => setEditSmsTemplate(e.target.value)}
                        rows={4}
                        className="font-mono text-sm"
                      />
                      <div className="flex justify-between text-xs text-text-secondary">
                        <span>
                          {smsCharCount} characters ({smsSegments} segment
                          {smsSegments !== 1 ? "s" : ""})
                        </span>
                        {smsCharCount > 160 && (
                          <span className="text-warning">
                            Long messages may be split
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-surface-secondary p-3 rounded-lg text-sm font-mono">
                      {selectedTemplate.smsTemplate}
                    </div>
                  )}
                </div>

                {/* Email Template */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-template">Email Template</Label>
                    {editMode && (
                      <Select
                        className="w-48 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleInsertVariable(e.target.value, "email");
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Insert variable...</option>
                        {SMS_MERGE_FIELDS.map((field) => (
                          <option
                            key={field.key}
                            value={field.key.replace(/\{\{|\}\}/g, "")}
                          >
                            {field.description}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                  {editMode ? (
                    <Textarea
                      id="email-template"
                      value={editEmailTemplate}
                      onChange={(e) => setEditEmailTemplate(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-surface-secondary p-3 rounded-lg text-sm font-mono whitespace-pre-wrap">
                      {selectedTemplate.emailTemplate}
                    </div>
                  )}
                </div>

                {/* Variables */}
                <div className="space-y-2">
                  <Label>Variables Used</Label>
                  <div className="flex flex-wrap gap-2">
                    {(editMode
                      ? [
                          ...new Set([
                            ...extractVariables(editSmsTemplate),
                            ...extractVariables(editEmailTemplate),
                          ]),
                        ]
                      : selectedTemplate.variables
                    ).map((v) => (
                      <div
                        key={v}
                        className="flex items-center gap-1 bg-surface-secondary px-2 py-1 rounded text-sm"
                      >
                        <code className="text-primary">{"{{" + v + "}}"}</code>
                        {SAMPLE_VARIABLES[v] && (
                          <span className="text-text-secondary text-xs">
                            ({SAMPLE_VARIABLES[v]})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button variant="secondary" onClick={() => setShowPreview(true)}>
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
                Preview with Sample Data
              </Button>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditMode(false);
                        if (selectedTemplate) {
                          setEditName(selectedTemplate.name);
                          setEditSubject(selectedTemplate.subject);
                          setEditSmsTemplate(selectedTemplate.smsTemplate);
                          setEditEmailTemplate(selectedTemplate.emailTemplate);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Template</Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      Close
                    </Button>
                    <Button onClick={() => setEditMode(true)}>
                      Edit Template
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)}>
        <DialogContent size="lg">
          <DialogHeader onClose={() => setShowPreview(false)}>
            Template Preview - {selectedTemplate?.name}
          </DialogHeader>
          <DialogBody>
            {selectedTemplate && (
              <div className="space-y-6">
                {/* SMS Preview */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    SMS Preview
                  </h4>
                  <div className="bg-blue-500 text-white p-4 rounded-2xl rounded-bl-md max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">
                      {renderTemplate(
                        editMode
                          ? editSmsTemplate
                          : selectedTemplate.smsTemplate,
                        SAMPLE_VARIABLES,
                      )}
                    </p>
                  </div>
                </div>

                {/* Email Preview */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-purple-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email Preview
                  </h4>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-surface-secondary px-4 py-2 border-b border-border">
                      <p className="text-sm">
                        <span className="text-text-secondary">Subject: </span>
                        <span className="font-medium">
                          {renderTemplate(
                            editMode ? editSubject : selectedTemplate.subject,
                            SAMPLE_VARIABLES,
                          )}
                        </span>
                      </p>
                    </div>
                    <div className="p-4 whitespace-pre-wrap text-sm">
                      {renderTemplate(
                        editMode
                          ? editEmailTemplate
                          : selectedTemplate.emailTemplate,
                        SAMPLE_VARIABLES,
                      )}
                    </div>
                  </div>
                </div>

                {/* Sample data notice */}
                <Card className="p-3 bg-blue-500/5 border-blue-500/20">
                  <p className="text-sm text-text-secondary">
                    <svg
                      className="w-4 h-4 inline mr-1 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    This preview uses sample data. Actual messages will use real
                    customer information.
                  </p>
                </Card>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NotificationTemplates;
