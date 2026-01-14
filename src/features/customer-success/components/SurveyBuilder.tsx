/**
 * Survey Builder Component
 *
 * A drag-and-drop survey builder with:
 * - Question type selector (rating, scale, text, multiple_choice, single_choice)
 * - Drag to reorder questions
 * - Preview mode
 * - Conditional logic UI
 * - Save as template option
 */

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils.ts";
import { SurveyPreview } from "./SurveyPreview.tsx";
import {
  SurveyConditionalLogic,
  type ConditionalLogicRule,
} from "./SurveyConditionalLogic.tsx";

// Types
export type QuestionType =
  | "rating"
  | "scale"
  | "text"
  | "multiple_choice"
  | "single_choice";

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: { min: string; max: string };
  placeholder?: string;
  max_length?: number;
  conditional_logic?: ConditionalLogicRule[];
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  type: "nps" | "csat" | "ces" | "custom";
  questions: SurveyQuestion[];
  created_at: string;
}

export interface SurveyBuilderProps {
  initialQuestions?: SurveyQuestion[];
  surveyType?: "nps" | "csat" | "ces" | "custom";
  surveyName?: string;
  onSave?: (
    questions: SurveyQuestion[],
    name: string,
    saveAsTemplate: boolean,
  ) => void;
  onCancel?: () => void;
}

// Question type configurations
const QUESTION_TYPES: {
  type: QuestionType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    type: "rating",
    label: "Star Rating",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    ),
    description: "1-5 star rating",
  },
  {
    type: "scale",
    label: "Scale",
    icon: (
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
          d="M4 6h16M4 12h16m-7 6h7"
        />
      </svg>
    ),
    description: "Numeric scale (e.g., 0-10)",
  },
  {
    type: "text",
    label: "Text",
    icon: (
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
          d="M4 6h16M4 12h8m-8 6h16"
        />
      </svg>
    ),
    description: "Open-ended text response",
  },
  {
    type: "multiple_choice",
    label: "Multiple Choice",
    icon: (
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
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    description: "Select multiple options",
  },
  {
    type: "single_choice",
    label: "Single Choice",
    icon: (
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
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    description: "Select one option",
  },
];

// Default templates
const DEFAULT_TEMPLATES: SurveyTemplate[] = [
  {
    id: "nps-standard",
    name: "Standard NPS Survey",
    description: "Net Promoter Score survey with follow-up question",
    type: "nps",
    questions: [
      {
        id: "nps-q1",
        type: "scale",
        text: "How likely are you to recommend us to a friend or colleague?",
        required: true,
        scale_min: 0,
        scale_max: 10,
        scale_labels: { min: "Not at all likely", max: "Extremely likely" },
      },
      {
        id: "nps-q2",
        type: "text",
        text: "What is the primary reason for your score?",
        required: false,
        placeholder: "Please share your thoughts...",
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "csat-standard",
    name: "Standard CSAT Survey",
    description: "Customer satisfaction survey",
    type: "csat",
    questions: [
      {
        id: "csat-q1",
        type: "rating",
        text: "How satisfied are you with our product/service?",
        required: true,
      },
      {
        id: "csat-q2",
        type: "text",
        text: "What could we do to improve your experience?",
        required: false,
        placeholder: "Your feedback helps us improve...",
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "ces-standard",
    name: "Customer Effort Score Survey",
    description: "Measure customer effort after support interaction",
    type: "ces",
    questions: [
      {
        id: "ces-q1",
        type: "scale",
        text: "How easy was it to resolve your issue today?",
        required: true,
        scale_min: 1,
        scale_max: 7,
        scale_labels: { min: "Very difficult", max: "Very easy" },
      },
      {
        id: "ces-q2",
        type: "text",
        text: "Is there anything we could have done to make this easier?",
        required: false,
      },
    ],
    created_at: new Date().toISOString(),
  },
];

// Generate unique ID
const generateId = () =>
  `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Question Editor Component
function QuestionEditor({
  question,
  index,
  totalQuestions,
  allQuestions,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  dragOverIndex,
}: {
  question: SurveyQuestion;
  index: number;
  totalQuestions: number;
  allQuestions: SurveyQuestion[];
  onUpdate: (question: SurveyQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showLogicEditor, setShowLogicEditor] = useState(false);

  const typeConfig = QUESTION_TYPES.find((t) => t.type === question.type);

  const handleOptionChange = (optIndex: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[optIndex] = value;
    onUpdate({ ...question, options: newOptions });
  };

  const handleAddOption = () => {
    const newOptions = [
      ...(question.options || []),
      `Option ${(question.options?.length || 0) + 1}`,
    ];
    onUpdate({ ...question, options: newOptions });
  };

  const handleRemoveOption = (optIndex: number) => {
    const newOptions = (question.options || []).filter(
      (_, i) => i !== optIndex,
    );
    onUpdate({ ...question, options: newOptions });
  };

  const handleLogicChange = (rules: ConditionalLogicRule[]) => {
    onUpdate({ ...question, conditional_logic: rules });
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "bg-bg-card rounded-lg border transition-all",
        isDragging
          ? "opacity-50 border-dashed border-primary"
          : "border-border",
        dragOverIndex === index && "border-primary border-2",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 cursor-move">
        <div className="text-text-muted hover:text-text-secondary">
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
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>

        <span className="text-sm font-medium text-text-muted">
          Q{index + 1}
        </span>

        <div
          className={cn(
            "p-1.5 rounded",
            typeConfig?.type === question.type && "bg-primary/10 text-primary",
          )}
        >
          {typeConfig?.icon}
        </div>

        <span className="flex-1 font-medium text-text-primary truncate">
          {question.text || "Untitled Question"}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30"
            title="Move up"
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
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalQuestions - 1}
            className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30"
            title="Move down"
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-text-muted hover:text-text-primary"
          >
            <svg
              className={cn(
                "w-4 h-4 transition-transform",
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
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-danger hover:text-danger/80"
            title="Delete"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Question Text
            </label>
            <input
              type="text"
              value={question.text}
              onChange={(e) => onUpdate({ ...question, text: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your question..."
            />
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Question Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {QUESTION_TYPES.map((qType) => (
                <button
                  key={qType.type}
                  onClick={() =>
                    onUpdate({
                      ...question,
                      type: qType.type,
                      options:
                        qType.type === "multiple_choice" ||
                        qType.type === "single_choice"
                          ? question.options || ["Option 1", "Option 2"]
                          : undefined,
                      scale_min: qType.type === "scale" ? 0 : undefined,
                      scale_max: qType.type === "scale" ? 10 : undefined,
                    })
                  }
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-colors",
                    question.type === qType.type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-text-secondary hover:bg-bg-hover",
                  )}
                >
                  {qType.icon}
                  <span className="text-xs font-medium">{qType.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scale Options */}
          {question.type === "scale" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Min Value
                </label>
                <input
                  type="number"
                  value={question.scale_min || 0}
                  onChange={(e) =>
                    onUpdate({
                      ...question,
                      scale_min: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Max Value
                </label>
                <input
                  type="number"
                  value={question.scale_max || 10}
                  onChange={(e) =>
                    onUpdate({
                      ...question,
                      scale_max: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Min Label
                </label>
                <input
                  type="text"
                  value={question.scale_labels?.min || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...question,
                      scale_labels: {
                        ...question.scale_labels,
                        min: e.target.value,
                        max: question.scale_labels?.max || "",
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Not at all likely"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Max Label
                </label>
                <input
                  type="text"
                  value={question.scale_labels?.max || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...question,
                      scale_labels: {
                        min: question.scale_labels?.min || "",
                        max: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Extremely likely"
                />
              </div>
            </div>
          )}

          {/* Choice Options */}
          {(question.type === "multiple_choice" ||
            question.type === "single_choice") && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Options
              </label>
              <div className="space-y-2">
                {(question.options || []).map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <span className="text-text-muted text-sm w-6">
                      {optIndex + 1}.
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) =>
                        handleOptionChange(optIndex, e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleRemoveOption(optIndex)}
                      className="p-2 text-danger hover:bg-danger/10 rounded"
                      disabled={(question.options?.length || 0) <= 2}
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
                ))}
                <button
                  onClick={handleAddOption}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark"
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
                  Add Option
                </button>
              </div>
            </div>
          )}

          {/* Text Options */}
          {question.type === "text" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={question.placeholder || ""}
                  onChange={(e) =>
                    onUpdate({ ...question, placeholder: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter placeholder text..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Max Length
                </label>
                <input
                  type="number"
                  value={question.max_length || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...question,
                      max_length: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="No limit"
                />
              </div>
            </div>
          )}

          {/* Required Toggle and Conditional Logic */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) =>
                  onUpdate({ ...question, required: e.target.checked })
                }
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-secondary">Required</span>
            </label>

            <button
              onClick={() => setShowLogicEditor(!showLogicEditor)}
              className={cn(
                "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors",
                question.conditional_logic?.length
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-bg-hover",
              )}
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
                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                />
              </svg>
              Conditional Logic
              {question.conditional_logic?.length
                ? ` (${question.conditional_logic.length})`
                : ""}
            </button>
          </div>

          {/* Conditional Logic Editor */}
          {showLogicEditor && (
            <SurveyConditionalLogic
              questionId={question.id}
              questions={allQuestions.filter((q) => q.id !== question.id)}
              currentRules={question.conditional_logic || []}
              onChange={handleLogicChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Template Selector Component
function TemplateSelector({
  onSelect,
  onClose,
}: {
  onSelect: (template: SurveyTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">
            Start from Template
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
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

        <div className="grid gap-4">
          {DEFAULT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded uppercase",
                    template.type === "nps" && "bg-primary/10 text-primary",
                    template.type === "csat" && "bg-warning/10 text-warning",
                    template.type === "ces" && "bg-info/10 text-info",
                    template.type === "custom" && "bg-gray-100 text-gray-600",
                  )}
                >
                  {template.type}
                </span>
                <h3 className="font-medium text-text-primary">
                  {template.name}
                </h3>
              </div>
              <p className="text-sm text-text-muted mb-2">
                {template.description}
              </p>
              <p className="text-xs text-text-muted">
                {template.questions.length} questions
              </p>
            </button>
          ))}

          <button
            onClick={() =>
              onSelect({
                id: "blank",
                name: "Blank Survey",
                description: "Start from scratch",
                type: "custom",
                questions: [],
                created_at: new Date().toISOString(),
              })
            }
            className="text-left p-4 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-hover">
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-text-primary">Blank Survey</h3>
                <p className="text-sm text-text-muted">Start from scratch</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Survey Builder Component
export function SurveyBuilder({
  initialQuestions = [],
  surveyType = "custom",
  surveyName = "",
  onSave,
  onCancel,
}: SurveyBuilderProps) {
  const [questions, setQuestions] =
    useState<SurveyQuestion[]>(initialQuestions);
  const [name, setName] = useState(surveyName);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(
    initialQuestions.length === 0,
  );
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const dragNodeRef = useRef<number | null>(null);

  // Add new question
  const handleAddQuestion = useCallback((type: QuestionType = "text") => {
    const newQuestion: SurveyQuestion = {
      id: generateId(),
      type,
      text: "",
      required: false,
      options:
        type === "multiple_choice" || type === "single_choice"
          ? ["Option 1", "Option 2"]
          : undefined,
      scale_min: type === "scale" ? 0 : undefined,
      scale_max: type === "scale" ? 10 : undefined,
    };
    setQuestions((prev) => [...prev, newQuestion]);
  }, []);

  // Update question
  const handleUpdateQuestion = useCallback(
    (index: number, question: SurveyQuestion) => {
      setQuestions((prev) => {
        const newQuestions = [...prev];
        newQuestions[index] = question;
        return newQuestions;
      });
    },
    [],
  );

  // Delete question
  const handleDeleteQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Move question up
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setQuestions((prev) => {
      const newQuestions = [...prev];
      [newQuestions[index - 1], newQuestions[index]] = [
        newQuestions[index],
        newQuestions[index - 1],
      ];
      return newQuestions;
    });
  }, []);

  // Move question down
  const handleMoveDown = useCallback((index: number) => {
    setQuestions((prev) => {
      if (index === prev.length - 1) return prev;
      const newQuestions = [...prev];
      [newQuestions[index], newQuestions[index + 1]] = [
        newQuestions[index + 1],
        newQuestions[index],
      ];
      return newQuestions;
    });
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((index: number) => {
    dragNodeRef.current = index;
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragNodeRef.current !== index) {
      setDragOverIndex(index);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragNodeRef.current !== null && dragNodeRef.current !== dropIndex) {
      setQuestions((prev) => {
        const newQuestions = [...prev];
        const draggedItem = newQuestions[dragNodeRef.current!];
        newQuestions.splice(dragNodeRef.current!, 1);
        newQuestions.splice(dropIndex, 0, draggedItem);
        return newQuestions;
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (template: SurveyTemplate) => {
      setQuestions(template.questions.map((q) => ({ ...q, id: generateId() })));
      if (!name && template.name !== "Blank Survey") {
        setName(template.name);
      }
      setShowTemplateSelector(false);
    },
    [name],
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(questions, name, saveAsTemplate);
    }
  }, [questions, name, saveAsTemplate, onSave]);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-text-muted hover:text-text-primary"
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
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
              )}
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xl font-semibold text-text-primary bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                  placeholder="Untitled Survey"
                />
                <p className="text-sm text-text-muted">
                  {questions.length} question{questions.length !== 1 ? "s" : ""}{" "}
                  | {surveyType.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="px-3 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover flex items-center gap-2"
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
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
                Templates
              </button>

              <button
                onClick={() => setShowPreview(true)}
                className="px-3 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover flex items-center gap-2"
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Preview
              </button>

              <button
                onClick={handleSave}
                disabled={questions.length === 0 || !name}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Survey
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Questions List */}
          <div className="lg:col-span-3 space-y-4">
            {questions.length === 0 ? (
              <div className="bg-bg-card rounded-xl border border-dashed border-border p-12 text-center">
                <svg
                  className="w-12 h-12 text-text-muted mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No Questions Yet
                </h3>
                <p className="text-text-muted mb-4">
                  Start by adding your first question or use a template
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => handleAddQuestion("scale")}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                  >
                    Add Question
                  </button>
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ) : (
              questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  totalQuestions={questions.length}
                  allQuestions={questions}
                  onUpdate={(q) => handleUpdateQuestion(index, q)}
                  onDelete={() => handleDeleteQuestion(index)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  isDragging={dragIndex === index}
                  dragOverIndex={dragOverIndex}
                />
              ))
            )}

            {/* Add Question Button */}
            {questions.length > 0 && (
              <button
                onClick={() => handleAddQuestion("text")}
                className="w-full p-4 border border-dashed border-border rounded-lg text-text-muted hover:text-text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Question
              </button>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Add */}
            <div className="bg-bg-card rounded-xl border border-border p-4">
              <h3 className="font-medium text-text-primary mb-3">Quick Add</h3>
              <div className="space-y-2">
                {QUESTION_TYPES.map((qType) => (
                  <button
                    key={qType.type}
                    onClick={() => handleAddQuestion(qType.type)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                  >
                    <div className="p-1.5 rounded bg-bg-hover">
                      {qType.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{qType.label}</p>
                      <p className="text-xs text-text-muted">
                        {qType.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Options */}
            <div className="bg-bg-card rounded-xl border border-border p-4">
              <h3 className="font-medium text-text-primary mb-3">
                Save Options
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-secondary">
                  Save as template
                </span>
              </label>
              <p className="text-xs text-text-muted mt-2">
                Save this survey as a reusable template for future surveys
              </p>
            </div>

            {/* Stats */}
            <div className="bg-bg-card rounded-xl border border-border p-4">
              <h3 className="font-medium text-text-primary mb-3">
                Survey Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Questions</span>
                  <span className="font-medium text-text-primary">
                    {questions.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Required</span>
                  <span className="font-medium text-text-primary">
                    {questions.filter((q) => q.required).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">With Logic</span>
                  <span className="font-medium text-text-primary">
                    {
                      questions.filter((q) => q.conditional_logic?.length)
                        .length
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <SurveyPreview
          surveyName={name || "Untitled Survey"}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
