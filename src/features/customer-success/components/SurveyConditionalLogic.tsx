/**
 * Survey Conditional Logic Component
 *
 * Conditional logic editor for surveys:
 * - "If [Question X] [operator] [value] then [show/hide] [Question Y]"
 * - Visual flow diagram
 * - Validation of logic rules
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils.ts";

// Types
export type LogicOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "contains"
  | "not_contains"
  | "is_answered"
  | "is_not_answered";

export type LogicAction = "show" | "hide" | "skip_to" | "end_survey";

export interface ConditionalLogicRule {
  id: string;
  source_question_id: string;
  operator: LogicOperator;
  value: string | number | string[];
  action: LogicAction;
  target_question_id?: string;
  logic_group?: "and" | "or";
}

export interface SurveyConditionalLogicProps {
  questionId: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    options?: string[];
    scale_min?: number;
    scale_max?: number;
  }>;
  currentRules: ConditionalLogicRule[];
  onChange: (rules: ConditionalLogicRule[]) => void;
}

// Operator configurations
const OPERATORS: {
  value: LogicOperator;
  label: string;
  requiresValue: boolean;
  applicableTypes: string[];
}[] = [
  {
    value: "equals",
    label: "equals",
    requiresValue: true,
    applicableTypes: ["rating", "scale", "single_choice", "text"],
  },
  {
    value: "not_equals",
    label: "does not equal",
    requiresValue: true,
    applicableTypes: ["rating", "scale", "single_choice", "text"],
  },
  {
    value: "greater_than",
    label: "is greater than",
    requiresValue: true,
    applicableTypes: ["rating", "scale"],
  },
  {
    value: "less_than",
    label: "is less than",
    requiresValue: true,
    applicableTypes: ["rating", "scale"],
  },
  {
    value: "greater_or_equal",
    label: "is greater than or equal to",
    requiresValue: true,
    applicableTypes: ["rating", "scale"],
  },
  {
    value: "less_or_equal",
    label: "is less than or equal to",
    requiresValue: true,
    applicableTypes: ["rating", "scale"],
  },
  {
    value: "contains",
    label: "contains",
    requiresValue: true,
    applicableTypes: ["text", "multiple_choice"],
  },
  {
    value: "not_contains",
    label: "does not contain",
    requiresValue: true,
    applicableTypes: ["text", "multiple_choice"],
  },
  {
    value: "is_answered",
    label: "is answered",
    requiresValue: false,
    applicableTypes: [
      "rating",
      "scale",
      "text",
      "single_choice",
      "multiple_choice",
    ],
  },
  {
    value: "is_not_answered",
    label: "is not answered",
    requiresValue: false,
    applicableTypes: [
      "rating",
      "scale",
      "text",
      "single_choice",
      "multiple_choice",
    ],
  },
];

const ACTIONS: {
  value: LogicAction;
  label: string;
  icon: React.ReactNode;
  requiresTarget: boolean;
}[] = [
  {
    value: "show",
    label: "Show this question",
    icon: (
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
    ),
    requiresTarget: false,
  },
  {
    value: "hide",
    label: "Hide this question",
    icon: (
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
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      </svg>
    ),
    requiresTarget: false,
  },
  {
    value: "skip_to",
    label: "Skip to question",
    icon: (
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
          d="M13 5l7 7-7 7M5 5l7 7-7 7"
        />
      </svg>
    ),
    requiresTarget: true,
  },
  {
    value: "end_survey",
    label: "End survey",
    icon: (
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
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
        />
      </svg>
    ),
    requiresTarget: false,
  },
];

// Generate unique ID
const generateId = () =>
  `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Rule Editor Component
function RuleEditor({
  rule,
  questions,
  onUpdate,
  onDelete,
  isFirst,
  showLogicConnector,
}: {
  rule: ConditionalLogicRule;
  questions: SurveyConditionalLogicProps["questions"];
  onUpdate: (rule: ConditionalLogicRule) => void;
  onDelete: () => void;
  isFirst: boolean;
  showLogicConnector: boolean;
}) {
  const sourceQuestion = questions.find(
    (q) => q.id === rule.source_question_id,
  );

  // Get applicable operators for the source question type
  const applicableOperators = useMemo(() => {
    if (!sourceQuestion) return OPERATORS;
    return OPERATORS.filter((op) =>
      op.applicableTypes.includes(sourceQuestion.type),
    );
  }, [sourceQuestion]);

  const selectedOperator = OPERATORS.find((op) => op.value === rule.operator);
  const selectedAction = ACTIONS.find((a) => a.value === rule.action);

  // Render value input based on question type
  const renderValueInput = () => {
    if (!selectedOperator?.requiresValue || !sourceQuestion) return null;

    if (
      sourceQuestion.type === "single_choice" ||
      sourceQuestion.type === "multiple_choice"
    ) {
      return (
        <select
          value={rule.value as string}
          onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
          className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
        >
          <option value="">Select option...</option>
          {sourceQuestion.options?.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (sourceQuestion.type === "scale" || sourceQuestion.type === "rating") {
      const min =
        sourceQuestion.scale_min ?? (sourceQuestion.type === "rating" ? 1 : 0);
      const max =
        sourceQuestion.scale_max ?? (sourceQuestion.type === "rating" ? 5 : 10);
      const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

      return (
        <select
          value={rule.value as number}
          onChange={(e) =>
            onUpdate({ ...rule, value: parseInt(e.target.value) })
          }
          className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-w-[100px]"
        >
          <option value="">Select...</option>
          {options.map((val) => (
            <option key={val} value={val}>
              {val}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={rule.value as string}
        onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
        className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
        placeholder="Enter value..."
      />
    );
  };

  return (
    <div className="relative">
      {/* Logic Connector */}
      {showLogicConnector && !isFirst && (
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px bg-border flex-1" />
          <select
            value={rule.logic_group || "and"}
            onChange={(e) =>
              onUpdate({ ...rule, logic_group: e.target.value as "and" | "or" })
            }
            className="px-2 py-1 text-xs font-medium border border-border rounded bg-bg-primary text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="and">AND</option>
            <option value="or">OR</option>
          </select>
          <div className="h-px bg-border flex-1" />
        </div>
      )}

      <div className="bg-bg-hover rounded-lg p-4">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm text-text-secondary py-2">If</span>

          {/* Source Question */}
          <select
            value={rule.source_question_id}
            onChange={(e) =>
              onUpdate({ ...rule, source_question_id: e.target.value })
            }
            className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary max-w-[200px]"
          >
            <option value="">Select question...</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.text.substring(0, 40)}
                {q.text.length > 40 ? "..." : ""}
              </option>
            ))}
          </select>

          {/* Operator */}
          <select
            value={rule.operator}
            onChange={(e) =>
              onUpdate({ ...rule, operator: e.target.value as LogicOperator })
            }
            className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {applicableOperators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {/* Value */}
          {renderValueInput()}

          <span className="text-sm text-text-secondary py-2">then</span>

          {/* Action */}
          <select
            value={rule.action}
            onChange={(e) =>
              onUpdate({ ...rule, action: e.target.value as LogicAction })
            }
            className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ACTIONS.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>

          {/* Target Question (if needed) */}
          {selectedAction?.requiresTarget && (
            <select
              value={rule.target_question_id || ""}
              onChange={(e) =>
                onUpdate({ ...rule, target_question_id: e.target.value })
              }
              className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary max-w-[200px]"
            >
              <option value="">Select question...</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text.substring(0, 40)}
                  {q.text.length > 40 ? "..." : ""}
                </option>
              ))}
            </select>
          )}

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors ml-auto"
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
    </div>
  );
}

// Visual Flow Diagram Component
function LogicFlowDiagram({
  rules,
  questions,
  currentQuestionId: _currentQuestionId,
}: {
  rules: ConditionalLogicRule[];
  questions: SurveyConditionalLogicProps["questions"];
  currentQuestionId: string;
}) {
  if (rules.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-bg-hover rounded-lg">
      <h4 className="text-sm font-medium text-text-secondary mb-3">
        Logic Flow
      </h4>
      <div className="space-y-2">
        {rules.map((rule, index) => {
          const sourceQ = questions.find(
            (q) => q.id === rule.source_question_id,
          );
          const targetQ = questions.find(
            (q) => q.id === rule.target_question_id,
          );
          const operator = OPERATORS.find((op) => op.value === rule.operator);
          const action = ACTIONS.find((a) => a.value === rule.action);

          return (
            <div key={rule.id} className="flex items-center gap-2 text-sm">
              {index > 0 && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded",
                    rule.logic_group === "or"
                      ? "bg-warning/10 text-warning"
                      : "bg-info/10 text-info",
                  )}
                >
                  {rule.logic_group?.toUpperCase() || "AND"}
                </span>
              )}
              <div className="flex items-center gap-1 text-text-muted">
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
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span
                className="text-text-primary font-medium truncate max-w-[150px]"
                title={sourceQ?.text}
              >
                {sourceQ?.text.substring(0, 20)}
                {(sourceQ?.text.length || 0) > 20 ? "..." : ""}
              </span>
              <span className="text-text-muted">{operator?.label}</span>
              {operator?.requiresValue && (
                <span className="text-primary font-medium">"{rule.value}"</span>
              )}
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              <span
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                  rule.action === "show" && "bg-success/10 text-success",
                  rule.action === "hide" && "bg-danger/10 text-danger",
                  rule.action === "skip_to" && "bg-warning/10 text-warning",
                  rule.action === "end_survey" && "bg-gray-100 text-gray-600",
                )}
              >
                {action?.icon}
                {action?.label}
                {targetQ && `: ${targetQ.text.substring(0, 15)}...`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Validation Messages Component
function ValidationMessages({
  rules,
  questions,
}: {
  rules: ConditionalLogicRule[];
  questions: SurveyConditionalLogicProps["questions"];
}) {
  const validationIssues = useMemo(() => {
    const issues: string[] = [];

    rules.forEach((rule, index) => {
      if (!rule.source_question_id) {
        issues.push(`Rule ${index + 1}: No source question selected`);
      }

      const operator = OPERATORS.find((op) => op.value === rule.operator);
      if (operator?.requiresValue && !rule.value && rule.value !== 0) {
        issues.push(
          `Rule ${index + 1}: Value is required for "${operator.label}" operator`,
        );
      }

      if (rule.action === "skip_to" && !rule.target_question_id) {
        issues.push(
          `Rule ${index + 1}: Target question required for "Skip to question" action`,
        );
      }

      // Check for circular references
      if (rule.source_question_id === rule.target_question_id) {
        issues.push(
          `Rule ${index + 1}: Source and target questions cannot be the same`,
        );
      }
    });

    // Check for conflicting rules
    const showHideConflicts = rules.filter(
      (r) => r.action === "show" || r.action === "hide",
    );
    const hasConflict = showHideConflicts.some((r1, i1) =>
      showHideConflicts.some(
        (r2, i2) =>
          i1 !== i2 &&
          r1.source_question_id === r2.source_question_id &&
          r1.value === r2.value &&
          r1.action !== r2.action,
      ),
    );
    if (hasConflict) {
      issues.push(
        "Conflicting rules detected: Same condition triggers both show and hide",
      );
    }

    return issues;
  }, [rules, questions]);

  if (validationIssues.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-warning">Validation Issues</p>
          <ul className="mt-1 text-sm text-text-secondary list-disc list-inside">
            {validationIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function SurveyConditionalLogic({
  questionId,
  questions,
  currentRules,
  onChange,
}: SurveyConditionalLogicProps) {
  const [rules, setRules] = useState<ConditionalLogicRule[]>(currentRules);

  const handleAddRule = () => {
    const newRule: ConditionalLogicRule = {
      id: generateId(),
      source_question_id: "",
      operator: "equals",
      value: "",
      action: "show",
      logic_group: "and",
    };
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    onChange(updatedRules);
  };

  const handleUpdateRule = (
    index: number,
    updatedRule: ConditionalLogicRule,
  ) => {
    const updatedRules = [...rules];
    updatedRules[index] = updatedRule;
    setRules(updatedRules);
    onChange(updatedRules);
  };

  const handleDeleteRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    onChange(updatedRules);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-text-primary">
            Conditional Logic
          </h4>
          <p className="text-xs text-text-muted mt-0.5">
            Control when this question is displayed based on previous answers
          </p>
        </div>
        <button
          onClick={handleAddRule}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium"
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
          Add Condition
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-6 bg-bg-hover rounded-lg">
          <svg
            className="w-8 h-8 text-text-muted mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
          <p className="text-sm text-text-muted">No conditions configured</p>
          <p className="text-xs text-text-muted mt-1">
            This question will always be displayed
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              questions={questions}
              onUpdate={(r) => handleUpdateRule(index, r)}
              onDelete={() => handleDeleteRule(index)}
              isFirst={index === 0}
              showLogicConnector={rules.length > 1}
            />
          ))}
        </div>
      )}

      {/* Visual Flow Diagram */}
      <LogicFlowDiagram
        rules={rules}
        questions={questions}
        currentQuestionId={questionId}
      />

      {/* Validation Messages */}
      <ValidationMessages rules={rules} questions={questions} />
    </div>
  );
}
