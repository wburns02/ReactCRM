/**
 * Create Action Modal Component
 *
 * Modal for creating actions from survey responses.
 * Pre-filled with customer context, supports action type selection,
 * notes, assignee, and priority.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils.ts";
import { apiClient } from "@/api/client";
import {
  useCreateSurveyAction,
  type SurveyActionType,
  type ActionPriority,
  type SurveyActionFormData,
} from "@/api/hooks/useSurveyActions.ts";

// ============================================
// Types
// ============================================

interface CreateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  responseId: number;
  surveyId: number;
  initialActionType?: SurveyActionType;
  context?: {
    score?: number;
    feedback?: string;
    sentiment?: string;
  };
}

interface TeamMember {
  id: number;
  name: string;
  role?: string;
}

// ============================================
// Action Type Configuration
// ============================================

const ACTION_TYPE_CONFIG: Record<
  SurveyActionType,
  { label: string; icon: string; description: string; color: string }
> = {
  schedule_callback: {
    label: "Schedule Callback",
    icon: "📞",
    description: "Schedule a phone call with the customer",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  create_ticket: {
    label: "Create Ticket",
    icon: "🎫",
    description: "Create a support ticket for follow-up",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  },
  generate_offer: {
    label: "Generate Offer",
    icon: "💰",
    description: "Generate a retention offer or discount",
    color: "bg-green-500/10 text-green-500 border-green-500/30",
  },
  book_appointment: {
    label: "Book Appointment",
    icon: "📅",
    description: "Schedule a meeting or appointment",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  },
  send_email: {
    label: "Send Email",
    icon: "📧",
    description: "Send a follow-up or apology email",
    color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
  },
  create_task: {
    label: "Create Task",
    icon: "📋",
    description: "Create a CS task for follow-up",
    color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
  },
  trigger_playbook: {
    label: "Trigger Playbook",
    icon: "📖",
    description: "Start a retention or recovery playbook",
    color: "bg-pink-500/10 text-pink-500 border-pink-500/30",
  },
  assign_csm: {
    label: "Assign CSM",
    icon: "👤",
    description: "Assign or reassign a Customer Success Manager",
    color: "bg-teal-500/10 text-teal-500 border-teal-500/30",
  },
  escalate: {
    label: "Escalate",
    icon: "🚨",
    description: "Escalate to management or leadership",
    color: "bg-danger/10 text-danger border-danger/30",
  },
};

const PRIORITY_CONFIG: Record<
  ActionPriority,
  { label: string; color: string }
> = {
  critical: { label: "Critical", color: "bg-danger text-white" },
  high: { label: "High", color: "bg-warning text-white" },
  medium: { label: "Medium", color: "bg-info text-white" },
  low: { label: "Low", color: "bg-gray-500 text-white" },
};

function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async (): Promise<TeamMember[]> => {
      try {
        const response = await apiClient.get("/technicians", {
          params: { page_size: 50 },
        });
        const items = response.data?.items || response.data || [];
        return items.map(
          (t: { id: string | number; first_name?: string; last_name?: string; role?: string }) => ({
            id: typeof t.id === "string" ? parseInt(t.id.slice(0, 8), 16) : t.id,
            name: `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Unknown",
            role: t.role || "Technician",
          }),
        );
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Helper Components
// ============================================

function ActionTypeSelector({
  selectedType,
  onSelect,
}: {
  selectedType: SurveyActionType | null;
  onSelect: (type: SurveyActionType) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.keys(ACTION_TYPE_CONFIG) as SurveyActionType[]).map((type) => {
        const config = ACTION_TYPE_CONFIG[type];
        const isSelected = selectedType === type;

        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              "p-3 rounded-lg border-2 text-left transition-all",
              isSelected
                ? config.color + " border-current"
                : "border-border hover:border-border-hover bg-bg-hover",
            )}
          >
            <span className="text-xl">{config.icon}</span>
            <p
              className={cn(
                "text-xs font-medium mt-1",
                isSelected ? "" : "text-text-primary",
              )}
            >
              {config.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function ContextBanner({
  context,
}: {
  context: CreateActionModalProps["context"];
}) {
  if (!context) return null;

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "very_negative":
      case "negative":
        return "text-danger";
      case "neutral":
        return "text-text-muted";
      case "positive":
      case "very_positive":
        return "text-success";
      default:
        return "text-text-secondary";
    }
  };

  return (
    <div className="bg-bg-hover rounded-lg p-4 mb-4">
      <div className="flex items-center gap-4 mb-2">
        {context.score !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Score:</span>
            <span
              className={cn(
                "px-2 py-0.5 text-sm font-bold rounded",
                context.score <= 6
                  ? "bg-danger/10 text-danger"
                  : "bg-success/10 text-success",
              )}
            >
              {context.score}/10
            </span>
          </div>
        )}
        {context.sentiment && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Sentiment:</span>
            <span
              className={cn(
                "text-sm font-medium",
                getSentimentColor(context.sentiment),
              )}
            >
              {context.sentiment.replace("_", " ")}
            </span>
          </div>
        )}
      </div>
      {context.feedback && (
        <p className="text-sm text-text-secondary italic">
          "{context.feedback}"
        </p>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function CreateActionModal({
  isOpen,
  onClose,
  customerId: _customerId,
  customerName,
  responseId,
  surveyId,
  initialActionType,
  context,
}: CreateActionModalProps) {
  // Note: customerId is available for future use in action creation
  void _customerId;
  const [actionType, setActionType] = useState<SurveyActionType | null>(
    initialActionType || null,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<ActionPriority>("medium");
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const createAction = useCreateSurveyAction();
  const { data: teamMembers = [] } = useTeamMembers();

  // Auto-generate title based on action type
  useEffect(() => {
    if (actionType && !title) {
      const config = ACTION_TYPE_CONFIG[actionType];
      setTitle(`${config.label} for ${customerName}`);
    }
  }, [actionType, customerName, title]);

  // Reset form when modal opens with new action type
  useEffect(() => {
    if (initialActionType) {
      setActionType(initialActionType);
    }
  }, [initialActionType]);

  // Auto-set priority based on context
  useEffect(() => {
    if (context?.score !== undefined) {
      if (context.score <= 3) {
        setPriority("critical");
      } else if (context.score <= 5) {
        setPriority("high");
      } else if (context.score <= 7) {
        setPriority("medium");
      } else {
        setPriority("low");
      }
    }
  }, [context?.score]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!actionType) return;

    const formData: SurveyActionFormData = {
      action_type: actionType,
      title:
        title || `${ACTION_TYPE_CONFIG[actionType].label} for ${customerName}`,
      description: description || undefined,
      notes: notes || undefined,
      priority,
      assigned_to_user_id: assignedTo || undefined,
      reason: reason || undefined,
      metadata: context ? { survey_context: context } : undefined,
    };

    try {
      await createAction.mutateAsync({
        surveyId,
        responseId,
        data: formData,
      });
      onClose();
      // Reset form
      setActionType(null);
      setTitle("");
      setDescription("");
      setNotes("");
      setPriority("medium");
      setAssignedTo(null);
      setReason("");
    } catch (error) {
      console.error("Failed to create action:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-card border-b border-border px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Create Action
              </h2>
              <p className="text-sm text-text-muted">
                For {customerName} (Response #{responseId})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Context Banner */}
          <ContextBanner context={context} />

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Action Type <span className="text-danger">*</span>
            </label>
            <ActionTypeSelector
              selectedType={actionType}
              onSelect={setActionType}
            />
            {actionType && (
              <p className="mt-2 text-sm text-text-muted">
                {ACTION_TYPE_CONFIG[actionType].description}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Action title"
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the action"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Reason for Action
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Low NPS score, mentioned competitor..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Priority and Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Priority
              </label>
              <div className="flex gap-2">
                {(Object.keys(PRIORITY_CONFIG) as ActionPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex-1 py-2 text-xs font-medium rounded-lg border-2 transition-all",
                      priority === p
                        ? PRIORITY_CONFIG[p].color + " border-transparent"
                        : "border-border text-text-secondary hover:border-border-hover",
                    )}
                  >
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Assign To
              </label>
              <select
                value={assignedTo || ""}
                onChange={(e) =>
                  setAssignedTo(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.role && `(${member.role})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Internal Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes visible only to team members"
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!actionType || createAction.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createAction.isPending ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
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
                  Create Action
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Display */}
        {createAction.isError && (
          <div className="mx-6 mb-6 p-3 bg-danger/10 text-danger rounded-lg text-sm">
            Failed to create action. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
