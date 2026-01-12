import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { TemplateModal } from "../components/TemplateModal";

interface Template {
  id: number;
  name: string;
  type: "sms" | "email";
  category: string;
  content: string;
  created_at: string;
}

/**
 * All Templates - Template Library
 */
export function AllTemplates() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

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

  const smsTemplates =
    templates?.filter((t: Template) => t.type === "sms") || [];
  const emailTemplates =
    templates?.filter((t: Template) => t.type === "email") || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Message Templates
          </h1>
          <p className="text-text-muted">Manage your SMS and email templates</p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
        >
          Create Template
        </button>
      </div>

      {/* Template Type Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/communications/templates/sms"
          className="bg-bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">SMS Templates</h2>
              <p className="text-sm text-text-muted">
                {smsTemplates.length} templates
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/communications/templates/email"
          className="bg-bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <span className="text-2xl">📧</span>
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">
                Email Templates
              </h2>
              <p className="text-sm text-text-muted">
                {emailTemplates.length} templates
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Templates */}
      <div className="bg-bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-text-primary">All Templates</h2>
        </div>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : templates?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <span className="text-4xl block mb-2">📝</span>
            <p>No templates created yet</p>
            <p className="text-sm mt-2">
              Create your first template to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {templates?.map((template: Template) => (
              <div
                key={template.id}
                className="p-4 hover:bg-bg-hover transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        template.type === "sms"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-purple-500/10 text-purple-500"
                      }`}
                    >
                      <span>{template.type === "sms" ? "📱" : "📧"}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">
                        {template.name}
                      </h3>
                      <p className="text-sm text-text-muted">
                        {template.category}
                      </p>
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                        {template.content}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setIsModalOpen(true);
                    }}
                    className="text-text-muted hover:text-text-primary"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
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
