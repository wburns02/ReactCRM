/**
 * OutcomeForm Component
 *
 * Form for capturing task outcome with dynamic quality gates based on task type.
 */

import { useState } from "react";
import type {
  CSMQueueTask,
  CSMTaskType,
  CSMTaskOutcomeFormData,
  CSMOutcomeType,
  CSMObjectiveAchieved,
  CSMSentiment,
} from "../../../../api/types/customerSuccess";

interface OutcomeFormProps {
  task: CSMQueueTask;
  taskType?: CSMTaskType;
  onSubmit: (data: CSMTaskOutcomeFormData) => void;
  onCancel: () => void;
  isPending?: boolean;
}

const outcomeTypeOptions: {
  value: CSMOutcomeType;
  label: string;
  description: string;
}[] = [
  {
    value: "connected",
    label: "Connected",
    description: "Spoke with customer",
  },
  {
    value: "voicemail",
    label: "Voicemail",
    description: "Left voicemail message",
  },
  {
    value: "no_answer",
    label: "No Answer",
    description: "No response received",
  },
  {
    value: "rescheduled",
    label: "Rescheduled",
    description: "Moved to later date",
  },
  {
    value: "completed",
    label: "Completed",
    description: "Task fully completed",
  },
  {
    value: "escalated",
    label: "Escalated",
    description: "Escalated to manager",
  },
];

const objectiveOptions: { value: CSMObjectiveAchieved; label: string }[] = [
  { value: "yes", label: "Yes - Objective achieved" },
  { value: "partial", label: "Partial - Some progress made" },
  { value: "no", label: "No - Objective not achieved" },
];

const sentimentOptions: {
  value: CSMSentiment;
  label: string;
  emoji: string;
}[] = [
  { value: "positive", label: "Positive", emoji: "😊" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "frustrated", label: "Frustrated", emoji: "😤" },
  { value: "angry", label: "Angry", emoji: "😠" },
];

export function OutcomeForm({
  taskType,
  onSubmit,
  onCancel,
  isPending,
}: OutcomeFormProps) {
  const [formData, setFormData] = useState<Partial<CSMTaskOutcomeFormData>>({
    outcome_type: undefined,
    objective_achieved: undefined,
    sentiment: undefined,
    next_action_required: false,
    quality_gate_responses: {},
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get quality gates from task type
  const qualityGates = taskType?.quality_gates || [];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.outcome_type) {
      newErrors.outcome_type = "Please select an outcome type";
    }

    if (formData.outcome_type === "connected" && !formData.objective_achieved) {
      newErrors.objective_achieved =
        "Please indicate if the objective was achieved";
    }

    if (formData.outcome_type === "connected" && !formData.sentiment) {
      newErrors.sentiment = "Please select customer sentiment";
    }

    if (!formData.notes || formData.notes.trim().length < 10) {
      newErrors.notes =
        "Please provide detailed notes (at least 10 characters)";
    }

    // Validate required quality gates
    qualityGates.forEach((gate) => {
      if (
        gate.required &&
        formData.quality_gate_responses?.[gate.id] === undefined
      ) {
        newErrors[`gate_${gate.id}`] = "This question is required";
      }
    });

    if (formData.next_action_required && !formData.next_action_date) {
      newErrors.next_action_date = "Please select a follow-up date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData as CSMTaskOutcomeFormData);
    }
  };

  const updateGateResponse = (
    gateId: string,
    value: string | boolean | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      quality_gate_responses: {
        ...prev.quality_gate_responses,
        [gateId]: value,
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Outcome Type */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Outcome Type <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {outcomeTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, outcome_type: option.value }))
              }
              className={`
                p-3 rounded-lg border text-left transition-all
                ${
                  formData.outcome_type === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-bg-primary hover:border-border-hover text-text-primary"
                }
              `}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-text-muted">
                {option.description}
              </div>
            </button>
          ))}
        </div>
        {errors.outcome_type && (
          <p className="text-red-400 text-sm mt-1">{errors.outcome_type}</p>
        )}
      </div>

      {/* Conditional fields for "Connected" outcome */}
      {formData.outcome_type === "connected" && (
        <>
          {/* Objective Achieved */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Was the objective achieved?{" "}
              <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {objectiveOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="objective_achieved"
                    value={option.value}
                    checked={formData.objective_achieved === option.value}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        objective_achieved: option.value,
                      }))
                    }
                    className="w-4 h-4 text-primary bg-bg-primary border-border focus:ring-primary"
                  />
                  <span className="text-text-primary">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.objective_achieved && (
              <p className="text-red-400 text-sm mt-1">
                {errors.objective_achieved}
              </p>
            )}
          </div>

          {/* Blocker Reason (if not achieved) */}
          {(formData.objective_achieved === "no" ||
            formData.objective_achieved === "partial") && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                What was the blocker?
              </label>
              <textarea
                value={formData.blocker_reason || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    blocker_reason: e.target.value,
                  }))
                }
                placeholder="Describe what prevented achieving the objective..."
                className="w-full px-4 py-3 rounded-lg bg-bg-primary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={2}
              />
            </div>
          )}

          {/* Customer Sentiment */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Customer Sentiment <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              {sentimentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sentiment: option.value,
                    }))
                  }
                  className={`
                    flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all
                    ${
                      formData.sentiment === option.value
                        ? option.value === "positive"
                          ? "border-green-500 bg-green-500/10 text-green-400"
                          : option.value === "neutral"
                            ? "border-gray-500 bg-gray-500/10 text-gray-400"
                            : option.value === "frustrated"
                              ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                              : "border-red-500 bg-red-500/10 text-red-400"
                        : "border-border bg-bg-primary hover:border-border-hover text-text-primary"
                    }
                  `}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
            {errors.sentiment && (
              <p className="text-red-400 text-sm mt-1">{errors.sentiment}</p>
            )}
          </div>
        </>
      )}

      {/* Quality Gates */}
      {qualityGates.length > 0 && (
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Quality Gates
          </h3>
          <div className="space-y-4">
            {qualityGates.map((gate) => (
              <div key={gate.id}>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {gate.question}
                  {gate.required && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </label>

                {gate.gate_type === "boolean" && (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`gate_${gate.id}`}
                        checked={
                          formData.quality_gate_responses?.[gate.id] === true
                        }
                        onChange={() => updateGateResponse(gate.id, true)}
                        className="w-4 h-4 text-primary bg-bg-primary border-border focus:ring-primary"
                      />
                      <span className="text-text-primary">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`gate_${gate.id}`}
                        checked={
                          formData.quality_gate_responses?.[gate.id] === false
                        }
                        onChange={() => updateGateResponse(gate.id, false)}
                        className="w-4 h-4 text-primary bg-bg-primary border-border focus:ring-primary"
                      />
                      <span className="text-text-primary">No</span>
                    </label>
                  </div>
                )}

                {gate.gate_type === "select" && gate.options && (
                  <select
                    value={
                      (formData.quality_gate_responses?.[gate.id] as string) ||
                      ""
                    }
                    onChange={(e) =>
                      updateGateResponse(gate.id, e.target.value)
                    }
                    className="w-full px-4 py-2 rounded-lg bg-bg-primary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select an option</option>
                    {gate.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {gate.gate_type === "text" && (
                  <textarea
                    value={
                      (formData.quality_gate_responses?.[gate.id] as string) ||
                      ""
                    }
                    onChange={(e) =>
                      updateGateResponse(gate.id, e.target.value)
                    }
                    placeholder="Enter your response..."
                    className="w-full px-4 py-2 rounded-lg bg-bg-primary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={2}
                  />
                )}

                {gate.gate_type === "rating" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => updateGateResponse(gate.id, rating)}
                        className={`
                          w-10 h-10 rounded-lg border font-medium transition-all
                          ${
                            formData.quality_gate_responses?.[gate.id] ===
                            rating
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-bg-primary hover:border-border-hover text-text-primary"
                          }
                        `}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                )}

                {errors[`gate_${gate.id}`] && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors[`gate_${gate.id}`]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Action Required */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.next_action_required}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                next_action_required: e.target.checked,
              }))
            }
            className="w-5 h-5 text-primary bg-bg-primary border-border rounded focus:ring-primary"
          />
          <span className="text-text-primary font-medium">
            Follow-up action required
          </span>
        </label>

        {formData.next_action_required && (
          <div className="mt-4 pl-8 space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Follow-up Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.next_action_date || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    next_action_date: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg bg-bg-primary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.next_action_date && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.next_action_date}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Follow-up Notes
              </label>
              <textarea
                value={formData.next_action_notes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    next_action_notes: e.target.value,
                  }))
                }
                placeholder="What needs to be done next?"
                className="w-full px-4 py-2 rounded-lg bg-bg-primary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Notes <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Provide detailed notes about this interaction..."
          className="w-full px-4 py-3 rounded-lg bg-bg-primary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={4}
        />
        {errors.notes && (
          <p className="text-red-400 text-sm mt-1">{errors.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
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
              Saving...
            </>
          ) : (
            <>
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Complete Task
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-6 py-3 bg-bg-primary hover:bg-bg-card text-text-primary font-medium rounded-lg border border-border transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default OutcomeForm;
