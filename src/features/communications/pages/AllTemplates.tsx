import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { TemplateModal } from "../components/TemplateModal";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────

interface Template {
  id: number;
  name: string;
  type: "sms" | "email";
  category: string;
  content: string;
  subject?: string;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "";
  const diff = now - then;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getCategoryColor(category: string): {
  bg: string;
  text: string;
} {
  const map: Record<string, { bg: string; text: string }> = {
    "Appointment Reminder": {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      text: "text-blue-600",
    },
    "Service Complete": {
      bg: "bg-green-50 dark:bg-green-500/10",
      text: "text-green-600",
    },
    "Follow-up": {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      text: "text-amber-600",
    },
    Payment: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-600",
    },
    General: {
      bg: "bg-gray-50 dark:bg-gray-500/10",
      text: "text-gray-600",
    },
    Welcome: {
      bg: "bg-purple-50 dark:bg-purple-500/10",
      text: "text-purple-600",
    },
    Appointment: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      text: "text-blue-600",
    },
    Invoice: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-600",
    },
    "Service Report": {
      bg: "bg-cyan-50 dark:bg-cyan-500/10",
      text: "text-cyan-600",
    },
    Marketing: {
      bg: "bg-rose-50 dark:bg-rose-500/10",
      text: "text-rose-600",
    },
  };
  return (
    map[category] || {
      bg: "bg-gray-50 dark:bg-gray-500/10",
      text: "text-gray-600",
    }
  );
}

// ── Filter type ──────────────────────────────────────────────────────────

type TypeFilter = "all" | "sms" | "email";

// ── Component ────────────────────────────────────────────────────────────

export function AllTemplates() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/templates");
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const smsCount = useMemo(
    () => (templates || []).filter((t: Template) => t.type === "sms").length,
    [templates],
  );
  const emailCount = useMemo(
    () => (templates || []).filter((t: Template) => t.type === "email").length,
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    let items: Template[] = templates || [];
    if (typeFilter !== "all") items = items.filter((t) => t.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q),
      );
    }
    return items;
  }, [templates, typeFilter, searchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Message Templates
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Create reusable templates for faster communication
            </p>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
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

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-bg-body border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
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
            <div>
              <p className="text-lg font-bold text-text-primary">{smsCount}</p>
              <p className="text-xs text-text-muted">SMS Templates</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
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
            <div>
              <p className="text-lg font-bold text-text-primary">
                {emailCount}
              </p>
              <p className="text-xs text-text-muted">Email Templates</p>
            </div>
          </div>
          <div className="bg-bg-body border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {(templates || []).length}
              </p>
              <p className="text-xs text-text-muted">Total</p>
            </div>
          </div>
        </div>

        {/* Search + Type Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
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
          <div className="flex items-center bg-bg-card border border-border rounded-lg p-0.5">
            {(
              [
                { value: "all", label: "All" },
                { value: "sms", label: "SMS" },
                { value: "email", label: "Email" },
              ] as { value: TypeFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  typeFilter === tab.value
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-hover",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Access Links ─────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-border bg-bg-body">
        <div className="flex items-center gap-3">
          <Link
            to="/communications/templates/sms"
            className="flex-1 flex items-center gap-3 px-4 py-3 bg-bg-card border border-border rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
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
            <div>
              <p className="font-semibold text-sm text-text-primary">
                SMS Templates
              </p>
              <p className="text-xs text-text-muted">
                {smsCount} template{smsCount !== 1 ? "s" : ""}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-text-muted ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
          <Link
            to="/communications/templates/email"
            className="flex-1 flex items-center gap-3 px-4 py-3 bg-bg-card border border-border rounded-xl hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
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
            <div>
              <p className="font-semibold text-sm text-text-primary">
                Email Templates
              </p>
              <p className="text-xs text-text-muted">
                {emailCount} template{emailCount !== 1 ? "s" : ""}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-text-muted ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Template List ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-text-muted">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">
              {searchQuery ? "No templates found" : "No templates yet"}
            </h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "Create your first template to speed up customer communication."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setIsModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Create first template
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTemplates.map((template: Template) => {
              const catColors = getCategoryColor(template.category);
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsModalOpen(true);
                  }}
                  className="w-full text-left px-4 sm:px-6 py-4 hover:bg-bg-hover transition-colors flex items-start gap-3"
                >
                  {/* Type icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      template.type === "sms"
                        ? "bg-blue-50 dark:bg-blue-500/10"
                        : "bg-purple-50 dark:bg-purple-500/10",
                    )}
                  >
                    <svg
                      className={cn(
                        "w-5 h-5",
                        template.type === "sms"
                          ? "text-blue-500"
                          : "text-purple-500",
                      )}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {template.type === "sms" ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      )}
                    </svg>
                  </div>

                  {/* Content */}
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
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded",
                          template.type === "sms"
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
                            : "bg-purple-50 dark:bg-purple-500/10 text-purple-600",
                        )}
                      >
                        {template.type.toUpperCase()}
                      </span>
                    </div>
                    {template.subject && (
                      <p className="text-sm text-text-secondary truncate mb-0.5">
                        Subject: {template.subject}
                      </p>
                    )}
                    <p className="text-sm text-text-muted truncate">
                      {template.content}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs text-text-muted">
                      {relativeTime(template.created_at)}
                    </span>
                    <p className="text-xs text-primary mt-1">Edit</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Modal */}
      <TemplateModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
      />
    </div>
  );
}
