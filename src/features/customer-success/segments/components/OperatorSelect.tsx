/**
 * OperatorSelect Component
 *
 * Dynamic operator dropdown that shows appropriate operators based on field type.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils.ts";
import type { RuleOperator } from "@/api/types/customerSuccess.ts";
import type { FieldDefinition } from "./FieldPicker.tsx";

interface OperatorDefinition {
  id: RuleOperator;
  label: string;
  description?: string;
  types: FieldDefinition["type"][];
}

// All available operators with type compatibility
const ALL_OPERATORS: OperatorDefinition[] = [
  // Equality operators (all types)
  {
    id: "eq",
    label: "equals",
    description: "Exactly matches",
    types: ["string", "number", "boolean", "date", "select"],
  },
  {
    id: "neq",
    label: "not equals",
    description: "Does not match",
    types: ["string", "number", "boolean", "date", "select"],
  },

  // Comparison operators (number, date)
  {
    id: "gt",
    label: "greater than",
    description: ">",
    types: ["number", "date"],
  },
  { id: "lt", label: "less than", description: "<", types: ["number", "date"] },
  {
    id: "gte",
    label: "greater or equal",
    description: ">=",
    types: ["number", "date"],
  },
  {
    id: "lte",
    label: "less or equal",
    description: "<=",
    types: ["number", "date"],
  },
  {
    id: "between",
    label: "between",
    description: "In range",
    types: ["number", "date"],
  },

  // String operators
  {
    id: "contains",
    label: "contains",
    description: "Includes text",
    types: ["string"],
  },
  {
    id: "not_contains",
    label: "does not contain",
    description: "Excludes text",
    types: ["string"],
  },
  {
    id: "starts_with",
    label: "starts with",
    description: "Begins with",
    types: ["string"],
  },
  {
    id: "ends_with",
    label: "ends with",
    description: "Ends with",
    types: ["string"],
  },

  // Multi-value operators
  {
    id: "in",
    label: "is one of",
    description: "Matches any",
    types: ["string", "number", "select"],
  },
  {
    id: "not_in",
    label: "is not one of",
    description: "Excludes all",
    types: ["string", "number", "select"],
  },

  // Null operators (all types)
  {
    id: "is_null",
    label: "is empty",
    description: "No value",
    types: ["string", "number", "boolean", "date", "select"],
  },
  {
    id: "is_not_null",
    label: "has value",
    description: "Any value",
    types: ["string", "number", "boolean", "date", "select"],
  },
];

interface OperatorSelectProps {
  value: RuleOperator;
  fieldType: FieldDefinition["type"];
  onChange: (operator: RuleOperator) => void;
  className?: string;
}

export function OperatorSelect({
  value,
  fieldType,
  onChange,
  className,
}: OperatorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter operators based on field type
  const availableOperators = ALL_OPERATORS.filter((op) =>
    op.types.includes(fieldType),
  );

  const selectedOperator = ALL_OPERATORS.find((op) => op.id === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 text-left text-sm rounded-lg border transition-colors",
          "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
          "hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          isOpen && "ring-2 ring-primary/20 border-primary",
        )}
      >
        <span className="text-gray-900 dark:text-white">
          {selectedOperator?.label || "Select..."}
        </span>
        <svg
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180",
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-48 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto p-1">
            {availableOperators.map((op) => (
              <button
                key={op.id}
                onClick={() => {
                  onChange(op.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm rounded-lg transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-gray-700",
                  value === op.id && "bg-primary/10 text-primary",
                )}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {op.label}
                </div>
                {op.description && (
                  <div className="text-xs text-gray-500">{op.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get operator info by ID
 */
export function getOperatorById(
  id: RuleOperator,
): OperatorDefinition | undefined {
  return ALL_OPERATORS.find((op) => op.id === id);
}

/**
 * Check if operator requires a secondary value (e.g., 'between')
 */
export function operatorNeedsSecondValue(operator: RuleOperator): boolean {
  return operator === "between";
}

/**
 * Check if operator requires no value (e.g., 'is_null', 'is_not_null')
 */
export function operatorNeedsNoValue(operator: RuleOperator): boolean {
  return operator === "is_null" || operator === "is_not_null";
}
