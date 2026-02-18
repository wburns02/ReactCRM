import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { ConfirmDeleteButton } from "../components/ConfirmDeleteButton";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { relativeTime, getCategoryColor, EMAIL_CATEGORIES, EMAIL_VARIABLES } from "../utils";

// ── Types ────────────────────────────────────────────────────────────────

interface Template {
  id: number;
  name: string;
  category: string;
  subject: string;
  content: string;
  created_at: string;
}

// ── Component ────────────────────────────────────────────────────────────

export function EmailTemplates() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "",
    subject: "",
    content: "",
  });

  const {
    data: templates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const response = await apiClient.get("/templates", {
        params: { type: "email" },
      });
      return response.data.items || response.data || [];
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      await apiClient.post("/templates", {
        ...template,
        type: "email",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      setIsCreating(false);
      setNewTemplate({ name: "", category: "", subject: "", content: "" });
      toastSuccess("Email template created");
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
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
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
        t.subject?.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q),
    );
  }, [templates, searchQuery]);

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
              Email Templates
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-600 rounded-full">
                {(templates || []).length}
              </span>
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Professional email templates with rich formatting
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-sm"
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

      {/* ── Create Form ───────────────────────────────────────────── */}
      {isCreating && (
        <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
          <div className="bg-bg-body border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary">
                New Email Template
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTemplate({
                    name: "",
                    category: "",
                    subject: "",
                    content: "",
                  });
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
                    placeholder="e.g., Service Follow-Up"
                    className="w-full px-3.5 py-2 border border-border rounded-lg bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-3.5 py-2 border border-border rounded-lg bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select category</option>
                    {EMAIL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={newTemplate.subject}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, subject: e.target.value })
                  }
                  placeholder="Email subject line"
                  className="w-full px-3.5 py-2 border border-border rounded-lg bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Email Body
                </label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, content: e.target.value })
                  }
                  placeholder="Write your email template..."
                  rows={6}
                  className="w-full px-3.5 py-2 border border-border rounded-lg bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {EMAIL_VARIABLES.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() =>
                        setNewTemplate({
                          ...newTemplate,
                          content: newTemplate.content + v.name,
                        })
                      }
                      className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 hover:bg-purple-100 transition-colors font-mono"
                      title={v.desc}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewTemplate({
                      name: "",
                      category: "",
                      subject: "",
                      content: "",
                    });
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
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending
                    ? "Creating..."
                    : "Create Template"}
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
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
            <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">
              No email templates yet
            </h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              Create professional email templates to ensure consistent,
              on-brand communication with your customers.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
            >
              Create first template
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTemplates.map((template: Template) => {
              const isExpanded = expandedId === template.id;
              const catColors = getCategoryColor(template.category);
              return (
                <div key={template.id}>
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : template.id)
                    }
                    className={cn(
                      "w-full text-left px-4 sm:px-6 py-4 hover:bg-bg-hover transition-colors flex items-start gap-3",
                      isExpanded && "bg-bg-hover",
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-purple-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm text-text-primary truncate">
                          {template.name}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full",
                            catColors.bg,
                            catColors.text,
                          )}
                        >
                          {template.category}
                        </span>
                      </div>
                      {template.subject && (
                        <p className="text-sm text-text-secondary truncate mb-0.5">
                          {template.subject}
                        </p>
                      )}
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
                        {template.subject && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-text-muted mb-1">
                              Subject:
                            </p>
                            <p className="text-sm font-medium text-text-primary">
                              {template.subject}
                            </p>
                          </div>
                        )}
                        <div className="mb-3">
                          <p className="text-xs font-medium text-text-muted mb-1">
                            Body:
                          </p>
                          <div className="text-sm text-text-primary whitespace-pre-wrap bg-bg-body rounded-lg p-3 border border-border max-h-48 overflow-y-auto">
                            {template.content}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <ConfirmDeleteButton
                            itemName="template"
                            disabled={deleteMutation.isPending}
                            onConfirm={() => {
                              deleteMutation.mutate(template.id);
                              setExpandedId(null);
                            }}
                          />
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
