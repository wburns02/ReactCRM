import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { ConfirmDeleteButton } from "../components/ConfirmDeleteButton";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { relativeTime, SMS_CATEGORIES, SMS_VARIABLES } from "../utils";

// ── Types ────────────────────────────────────────────────────────────────

interface Template {
  id: number;
  name: string;
  category: string;
  content: string;
  variables: string[];
  created_at: string;
}

// ── Component ────────────────────────────────────────────────────────────

export function SMSTemplates() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "",
    content: "",
  });

  const {
    data: templates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: async () => {
      const response = await apiClient.get("/templates", {
        params: { type: "sms" },
      });
      return response.data.items || response.data || [];
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      await apiClient.post("/templates", {
        ...template,
        type: "sms",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      setIsCreating(false);
      setNewTemplate({ name: "", category: "", content: "" });
      toastSuccess("SMS template created");
    },
    onError: () => {
      toastError("Failed to create template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toastSuccess("Template deleted");
    },
    onError: () => {
      toastError("Failed to delete template");
    },
  });

  const filteredTemplates = useMemo(() => {
    const items: Template[] = templates || [];
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q),
    );
  }, [templates, searchQuery]);

  const charCount = newTemplate.content.length;
  const smsCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link
            to="/communications/templates"
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              SMS Templates
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-full">
                {(templates || []).length}
              </span>
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Reusable text message templates
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Template
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Create Form (Slide down) ──────────────────────────────── */}
      {isCreating && (
        <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
          <div className="bg-bg-body border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary">
                New SMS Template
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTemplate({ name: "", category: "", content: "" });
                }}
                className="p-1 rounded-md hover:bg-bg-hover text-text-muted"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                    placeholder="e.g., Appointment Confirmation"
                    className="w-full px-3.5 py-2 border border-border rounded-lg bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Category
                  </label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 border border-border rounded-lg bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {SMS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Message Content
                </label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, content: e.target.value })
                  }
                  placeholder="Type your template message..."
                  rows={4}
                  className="w-full px-3.5 py-2 border border-border rounded-lg bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {VARIABLES.map((v) => (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() =>
                          setNewTemplate({
                            ...newTemplate,
                            content: newTemplate.content + v.name,
                          })
                        }
                        className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 hover:bg-blue-100 transition-colors font-mono"
                        title={v.desc}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-text-muted">
                    {charCount} chars
                    {smsCount > 1 && ` (${smsCount} SMS)`}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewTemplate({ name: "", category: "", content: "" });
                  }}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate(newTemplate)}
                  disabled={
                    !newTemplate.name ||
                    !newTemplate.content ||
                    createMutation.isPending
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Templates List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <p className="text-sm text-text-muted">Loading templates...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-7 h-7 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">
              Unable to load templates
            </h3>
            <p className="text-sm text-text-muted">Please try again later</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">
              No SMS templates yet
            </h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              Create templates to send consistent, professional messages to your
              customers quickly.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Create first template
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTemplates.map((template: Template) => {
              const isExpanded = editingId === template.id;
              return (
                <div key={template.id}>
                  <button
                    onClick={() =>
                      setEditingId(isExpanded ? null : template.id)
                    }
                    className={cn(
                      "w-full text-left px-4 sm:px-6 py-4 hover:bg-bg-hover transition-colors flex items-start gap-3",
                      isExpanded && "bg-bg-hover",
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm text-text-primary truncate">
                          {template.name}
                        </h3>
                        <span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-bg-hover text-text-muted">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted truncate">
                        {template.content}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {relativeTime(template.created_at)}
                      </span>
                      <svg
                        className={cn(
                          "w-4 h-4 text-text-muted transition-transform",
                          isExpanded && "rotate-180",
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-4 bg-bg-hover">
                      <div className="bg-bg-card border border-border rounded-xl p-4 ml-13">
                        <div className="mb-3">
                          <p className="text-xs font-medium text-text-muted mb-1">
                            Full Message:
                          </p>
                          <p className="text-sm text-text-primary whitespace-pre-wrap bg-bg-body rounded-lg p-3 border border-border">
                            {template.content}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-text-muted">
                            {template.content.length} chars &middot;{" "}
                            {template.content.length <= 160
                              ? "1 SMS"
                              : `${Math.ceil(template.content.length / 153)} SMS`}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    "Are you sure you want to delete this template?",
                                  )
                                ) {
                                  deleteMutation.mutate(template.id);
                                  setEditingId(null);
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
