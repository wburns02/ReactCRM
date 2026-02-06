/**
 * TaskDetailView Component
 *
 * Full task detail view with playbook, customer context, and interaction history.
 */

import { useState } from "react";
import type {
  CSMQueueTask,
  CSMPlaybook,
  CSMTaskType,
  Touchpoint,
} from "../../../../api/types/customerSuccess";
import { PlaybookPanel } from "./PlaybookPanel";
import { OutcomeForm } from "./OutcomeForm";
import { useEmailCompose } from "@/context/EmailComposeContext";

interface TaskDetailViewProps {
  task: CSMQueueTask;
  taskType?: CSMTaskType;
  playbook?: CSMPlaybook | null;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    arr: number | null;
    health_score: number | null;
    health_status: string | null;
    tier: string | null;
    renewal_date: string | null;
    churn_probability: number | null;
    days_since_last_contact: number | null;
    contacts: Array<{
      name: string;
      email: string;
      role: string;
      is_champion: boolean;
    }>;
  };
  interactionHistory?: Touchpoint[];
  onClose: () => void;
  onComplete: (taskId: number, outcomeData: unknown) => void;
  onReschedule: (taskId: number) => void;
  onEscalate: (taskId: number) => void;
  isCompletePending?: boolean;
}

export function TaskDetailView({
  task,
  taskType,
  playbook,
  customer,
  interactionHistory,
  onClose,
  onComplete,
  onReschedule,
  onEscalate,
  isCompletePending,
}: TaskDetailViewProps) {
  const { openEmailCompose } = useEmailCompose();
  const [activeTab, setActiveTab] = useState<
    "playbook" | "context" | "history" | "outcome"
  >("playbook");

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const healthStatusColors = {
    healthy: "text-green-400 bg-green-500/20",
    at_risk: "text-yellow-400 bg-yellow-500/20",
    critical: "text-red-400 bg-red-500/20",
    churned: "text-gray-400 bg-gray-500/20",
  };

  const handleCompleteClick = () => {
    setActiveTab("outcome");
  };

  return (
    <div className="h-full flex flex-col bg-bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {task.task_type_name}
          </h2>
          <p className="text-sm text-text-muted">
            {customer?.name || task.customer_name} -{" "}
            {formatCurrency(customer?.arr || task.customer_arr)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
        >
          <svg
            className="w-5 h-5 text-text-muted"
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

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["playbook", "context", "history", "outcome"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors
              ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary bg-bg-secondary/50"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-secondary/30"
              }
            `}
          >
            {tab === "playbook" && "Playbook"}
            {tab === "context" && "Customer"}
            {tab === "history" && "History"}
            {tab === "outcome" && "Complete"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Playbook Tab */}
        {activeTab === "playbook" && playbook && (
          <PlaybookPanel
            playbook={playbook}
            customerName={customer?.name || task.customer_name || "Customer"}
          />
        )}
        {activeTab === "playbook" && !playbook && (
          <div className="text-center py-8 text-text-muted">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p>No playbook available for this task type.</p>
          </div>
        )}

        {/* Customer Context Tab */}
        {activeTab === "context" && (
          <div className="space-y-6">
            {/* Customer Overview */}
            <div className="bg-bg-secondary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-4">
                Customer Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-text-muted block mb-1">
                    Health Score
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-bold ${
                        (customer?.health_score ||
                          task.customer_health_score ||
                          0) >= 70
                          ? "text-green-400"
                          : (customer?.health_score ||
                                task.customer_health_score ||
                                0) >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {customer?.health_score ||
                        task.customer_health_score ||
                        "-"}
                    </span>
                    {customer?.health_status && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${healthStatusColors[customer.health_status as keyof typeof healthStatusColors] || ""}`}
                      >
                        {customer.health_status.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-text-muted block mb-1">
                    ARR
                  </span>
                  <span className="text-lg font-bold text-text-primary">
                    {formatCurrency(customer?.arr || task.customer_arr)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block mb-1">
                    Tier
                  </span>
                  <span className="text-sm text-text-primary capitalize">
                    {(customer?.tier || task.customer_tier || "-").replace(
                      "_",
                      " ",
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block mb-1">
                    Churn Probability
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      (customer?.churn_probability || 0) > 0.5
                        ? "text-red-400"
                        : (customer?.churn_probability || 0) > 0.3
                          ? "text-yellow-400"
                          : "text-green-400"
                    }`}
                  >
                    {customer?.churn_probability
                      ? `${(customer.churn_probability * 100).toFixed(0)}%`
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block mb-1">
                    Renewal Date
                  </span>
                  <span className="text-sm text-text-primary">
                    {customer?.renewal_date || task.customer_renewal_date
                      ? new Date(
                          customer?.renewal_date ||
                            task.customer_renewal_date ||
                            "",
                        ).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block mb-1">
                    Last Contact
                  </span>
                  <span className="text-sm text-text-primary">
                    {customer?.days_since_last_contact !== null &&
                    customer?.days_since_last_contact !== undefined
                      ? `${customer.days_since_last_contact} days ago`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-bg-secondary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-4">
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-4 h-4 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <button
                    onClick={() => openEmailCompose({ to: customer?.email || task.customer_email || "", customerName: customer?.name || task.customer_name || undefined })}
                    className="text-primary hover:underline"
                  >
                    {customer?.email || task.customer_email}
                  </button>
                </div>
                {customer?.phone && (
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-4 h-4 text-text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-primary hover:underline"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Key Contacts */}
            {customer?.contacts && customer.contacts.length > 0 && (
              <div className="bg-bg-secondary rounded-lg p-4">
                <h3 className="font-semibold text-text-primary mb-4">
                  Key Contacts
                </h3>
                <div className="space-y-3">
                  {customer.contacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-bg-primary rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">
                            {contact.name}
                          </span>
                          {contact.is_champion && (
                            <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                              Champion
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-text-muted">
                          {contact.role}
                        </span>
                      </div>
                      <button
                        onClick={() => openEmailCompose({ to: contact.email, customerName: contact.name })}
                        className="text-primary hover:underline text-sm"
                      >
                        {contact.email}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interaction History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {interactionHistory && interactionHistory.length > 0 ? (
              interactionHistory.map((touchpoint) => (
                <div
                  key={touchpoint.id}
                  className="bg-bg-secondary rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${touchpoint.direction === "outbound" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}
                      `}
                      >
                        {touchpoint.touchpoint_type.replace(/_/g, " ")}
                      </span>
                      {touchpoint.sentiment_label && (
                        <span
                          className={`
                          px-2 py-0.5 rounded text-xs
                          ${touchpoint.sentiment_label === "positive" || touchpoint.sentiment_label === "very_positive" ? "bg-green-500/20 text-green-400" : ""}
                          ${touchpoint.sentiment_label === "negative" || touchpoint.sentiment_label === "very_negative" ? "bg-red-500/20 text-red-400" : ""}
                          ${touchpoint.sentiment_label === "neutral" ? "bg-gray-500/20 text-gray-400" : ""}
                        `}
                        >
                          {touchpoint.sentiment_label}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted">
                      {touchpoint.occurred_at
                        ? new Date(touchpoint.occurred_at).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                  {touchpoint.subject && (
                    <h4 className="font-medium text-text-primary mb-1">
                      {touchpoint.subject}
                    </h4>
                  )}
                  {touchpoint.summary && (
                    <p className="text-sm text-text-muted">
                      {touchpoint.summary}
                    </p>
                  )}
                  {touchpoint.contact_name && (
                    <p className="text-xs text-text-muted mt-2">
                      Contact: {touchpoint.contact_name} (
                      {touchpoint.contact_role})
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-text-muted">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
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
                <p>No interaction history available.</p>
              </div>
            )}
          </div>
        )}

        {/* Outcome Tab */}
        {activeTab === "outcome" && (
          <OutcomeForm
            task={task}
            taskType={taskType}
            onSubmit={(outcomeData) => onComplete(task.id, outcomeData)}
            onCancel={() => setActiveTab("playbook")}
            isPending={isCompletePending}
          />
        )}
      </div>

      {/* Footer Actions */}
      {activeTab !== "outcome" && (
        <div className="flex items-center gap-3 p-4 border-t border-border bg-bg-secondary">
          <button
            onClick={handleCompleteClick}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Complete Task
          </button>
          <button
            onClick={() => onReschedule(task.id)}
            className="px-4 py-2.5 bg-bg-primary hover:bg-bg-card text-text-primary font-medium rounded-lg border border-border transition-colors"
          >
            Reschedule
          </button>
          <button
            onClick={() => onEscalate(task.id)}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            Escalate
          </button>
        </div>
      )}
    </div>
  );
}

export default TaskDetailView;
