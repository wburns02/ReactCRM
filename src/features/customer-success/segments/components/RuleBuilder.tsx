/**
 * RuleBuilder Component
 *
 * Single rule component for the segment builder.
 * Combines field picker, operator select, and value input.
 */

import { cn } from '@/lib/utils.ts';
import type { SegmentRule, RuleOperator } from '@/api/types/customerSuccess.ts';
import { FieldPicker, getFieldById, type FieldDefinition } from './FieldPicker.tsx';
import { OperatorSelect } from './OperatorSelect.tsx';
import { ValueInput } from './ValueInput.tsx';

interface RuleBuilderProps {
  rule: SegmentRule;
  onChange: (rule: SegmentRule) => void;
  onRemove: () => void;
  className?: string;
  isDragging?: boolean;
}

export function RuleBuilder({
  rule,
  onChange,
  onRemove,
  className,
  isDragging,
}: RuleBuilderProps) {
  const field = getFieldById(rule.field);

  const handleFieldChange = (newField: FieldDefinition) => {
    // When field changes, reset operator to 'eq' and clear value
    onChange({
      field: newField.id,
      operator: 'eq',
      value: undefined,
      value2: undefined,
    });
  };

  const handleOperatorChange = (operator: RuleOperator) => {
    onChange({
      ...rule,
      operator,
      // Clear value2 if new operator doesn't need it
      value2: operator === 'between' ? rule.value2 : undefined,
    });
  };

  const handleValueChange = (value: unknown) => {
    onChange({ ...rule, value });
  };

  const handleValue2Change = (value2: unknown) => {
    onChange({ ...rule, value2 });
  };

  return (
    <div
      className={cn(
        'group relative flex flex-wrap items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        isDragging && 'opacity-50 border-dashed border-primary',
        className
      )}
    >
      {/* Drag Handle */}
      <div className="flex items-center self-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Field Picker */}
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Field
        </label>
        <FieldPicker
          value={rule.field}
          onChange={handleFieldChange}
        />
      </div>

      {/* Operator Select */}
      <div className="w-40">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Operator
        </label>
        <OperatorSelect
          value={rule.operator}
          fieldType={field?.type || 'string'}
          onChange={handleOperatorChange}
        />
      </div>

      {/* Value Input */}
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Value
        </label>
        <ValueInput
          field={field || { id: rule.field, label: rule.field, category: 'basic', type: 'string' }}
          operator={rule.operator}
          value={rule.value}
          value2={rule.value2}
          onChange={handleValueChange}
          onValue2Change={handleValue2Change}
        />
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        className="self-center p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove rule"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Create a new empty rule
 */
export function createEmptyRule(): SegmentRule {
  return {
    field: 'health_score',
    operator: 'gte',
    value: 70,
  };
}

/**
 * Validate a rule
 */
export function validateRule(rule: SegmentRule): { valid: boolean; error?: string } {
  if (!rule.field) {
    return { valid: false, error: 'Field is required' };
  }
  if (!rule.operator) {
    return { valid: false, error: 'Operator is required' };
  }

  // Check if value is required
  const noValueOperators: RuleOperator[] = ['is_null', 'is_not_null'];
  if (!noValueOperators.includes(rule.operator) && rule.value === undefined) {
    return { valid: false, error: 'Value is required' };
  }

  // Check if second value is required for 'between'
  if (rule.operator === 'between' && rule.value2 === undefined) {
    return { valid: false, error: 'Second value is required for "between" operator' };
  }

  return { valid: true };
}

/**
 * Format a rule for display
 */
export function formatRuleDescription(rule: SegmentRule): string {
  const field = getFieldById(rule.field);
  const fieldLabel = field?.label || rule.field;

  const operatorLabels: Record<RuleOperator, string> = {
    eq: 'equals',
    neq: 'does not equal',
    gt: 'is greater than',
    lt: 'is less than',
    gte: 'is at least',
    lte: 'is at most',
    contains: 'contains',
    not_contains: 'does not contain',
    in: 'is one of',
    not_in: 'is not one of',
    is_null: 'is empty',
    is_not_null: 'has a value',
    between: 'is between',
    starts_with: 'starts with',
    ends_with: 'ends with',
  };

  const operatorLabel = operatorLabels[rule.operator];

  if (rule.operator === 'is_null' || rule.operator === 'is_not_null') {
    return `${fieldLabel} ${operatorLabel}`;
  }

  if (rule.operator === 'between') {
    return `${fieldLabel} ${operatorLabel} ${rule.value} and ${rule.value2}`;
  }

  const valueStr = Array.isArray(rule.value)
    ? rule.value.join(', ')
    : String(rule.value);

  return `${fieldLabel} ${operatorLabel} ${valueStr}`;
}
