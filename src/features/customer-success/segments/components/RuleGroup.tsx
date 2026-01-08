/**
 * RuleGroup Component
 *
 * Group of rules with AND/OR logic.
 * Supports nested rule groups for complex conditions.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import type { SegmentRule, SegmentRuleSet } from '@/api/types/customerSuccess.ts';
import { RuleBuilder, createEmptyRule, formatRuleDescription } from './RuleBuilder.tsx';

interface RuleGroupProps {
  ruleSet: SegmentRuleSet;
  onChange: (ruleSet: SegmentRuleSet) => void;
  onRemove?: () => void;
  depth?: number;
  className?: string;
}

export function RuleGroup({
  ruleSet,
  onChange,
  onRemove,
  depth = 0,
  className,
}: RuleGroupProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Check if an item is a rule or a rule set
  const isRuleSet = (item: SegmentRule | SegmentRuleSet): item is SegmentRuleSet => {
    return 'logic' in item && 'rules' in item;
  };

  // Toggle AND/OR logic
  const toggleLogic = () => {
    onChange({
      ...ruleSet,
      logic: ruleSet.logic === 'and' ? 'or' : 'and',
    });
  };

  // Add a new rule
  const addRule = () => {
    onChange({
      ...ruleSet,
      rules: [...ruleSet.rules, createEmptyRule()],
    });
  };

  // Add a nested rule group
  const addGroup = () => {
    const newGroup: SegmentRuleSet = {
      logic: 'and',
      rules: [createEmptyRule()],
    };
    onChange({
      ...ruleSet,
      rules: [...ruleSet.rules, newGroup],
    });
  };

  // Update a rule at index
  const updateRule = (index: number, rule: SegmentRule | SegmentRuleSet) => {
    const newRules = [...ruleSet.rules];
    newRules[index] = rule;
    onChange({ ...ruleSet, rules: newRules });
  };

  // Remove a rule at index
  const removeRule = (index: number) => {
    const newRules = ruleSet.rules.filter((_, i) => i !== index);
    onChange({ ...ruleSet, rules: newRules });
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder rules
    const newRules = [...ruleSet.rules];
    const [draggedRule] = newRules.splice(draggedIndex, 1);
    newRules.splice(index, 0, draggedRule);
    onChange({ ...ruleSet, rules: newRules });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Color for nesting depth
  const depthColors = [
    'border-l-primary',
    'border-l-purple-500',
    'border-l-amber-500',
    'border-l-cyan-500',
  ];
  const borderColor = depthColors[depth % depthColors.length];

  return (
    <div
      className={cn(
        'relative rounded-lg',
        depth > 0 && 'border-l-4 pl-4 py-2',
        depth > 0 && borderColor,
        className
      )}
    >
      {/* Logic Toggle Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLogic}
            className={cn(
              'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
              ruleSet.logic === 'and'
                ? 'bg-blue-500 text-white'
                : 'bg-amber-500 text-white'
            )}
          >
            {ruleSet.logic.toUpperCase()}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {ruleSet.logic === 'and'
              ? 'Match ALL of the following'
              : 'Match ANY of the following'}
          </span>
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove group"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Rules */}
      <div className="space-y-2">
        {ruleSet.rules.map((item, index) => (
          <div
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            {/* Logic connector */}
            {index > 0 && (
              <div className="flex items-center gap-2 my-2 px-4">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                <span className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded',
                  ruleSet.logic === 'and'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                )}>
                  {ruleSet.logic.toUpperCase()}
                </span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
              </div>
            )}

            {isRuleSet(item) ? (
              <RuleGroup
                ruleSet={item}
                onChange={(updated) => updateRule(index, updated)}
                onRemove={() => removeRule(index)}
                depth={depth + 1}
              />
            ) : (
              <RuleBuilder
                rule={item}
                onChange={(updated) => updateRule(index, updated)}
                onRemove={() => removeRule(index)}
                isDragging={draggedIndex === index}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add Buttons */}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={addRule}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:text-primary-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Rule
        </button>

        {depth < 2 && ( // Limit nesting depth
          <button
            type="button"
            onClick={addGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            Add Group
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact rule summary for display
 */
export function RuleSummary({ ruleSet, className }: { ruleSet: SegmentRuleSet; className?: string }) {
  const isRuleSet = (item: SegmentRule | SegmentRuleSet): item is SegmentRuleSet => {
    return 'logic' in item && 'rules' in item;
  };

  const countRules = (rs: SegmentRuleSet): number => {
    return rs.rules.reduce((count, item) => {
      if (isRuleSet(item)) {
        return count + countRules(item);
      }
      return count + 1;
    }, 0);
  };

  const totalRules = countRules(ruleSet);

  return (
    <div className={cn('text-sm text-gray-600 dark:text-gray-400', className)}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(
          'px-2 py-0.5 text-xs font-semibold rounded',
          ruleSet.logic === 'and'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        )}>
          {ruleSet.logic.toUpperCase()}
        </span>
        <span>{totalRules} rule{totalRules !== 1 ? 's' : ''}</span>
      </div>

      <ul className="space-y-1">
        {ruleSet.rules.slice(0, 3).map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="text-gray-400">-</span>
            {isRuleSet(item) ? (
              <span className="italic">Nested group ({countRules(item)} rules)</span>
            ) : (
              <span>{formatRuleDescription(item)}</span>
            )}
          </li>
        ))}
        {ruleSet.rules.length > 3 && (
          <li className="text-gray-400 italic">
            + {ruleSet.rules.length - 3} more...
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * Create an empty rule set
 */
export function createEmptyRuleSet(): SegmentRuleSet {
  return {
    logic: 'and',
    rules: [],
  };
}

/**
 * Validate entire rule set
 */
export function validateRuleSet(ruleSet: SegmentRuleSet): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ruleSet.rules || ruleSet.rules.length === 0) {
    errors.push('At least one rule is required');
    return { valid: false, errors };
  }

  const isRuleSetCheck = (item: SegmentRule | SegmentRuleSet): item is SegmentRuleSet => {
    return 'logic' in item && 'rules' in item;
  };

  const validateRecursive = (rs: SegmentRuleSet, path: string = '') => {
    rs.rules.forEach((item, index) => {
      const currentPath = path ? `${path}.${index}` : `Rule ${index + 1}`;

      if (isRuleSetCheck(item)) {
        if (item.rules.length === 0) {
          errors.push(`${currentPath}: Empty rule group`);
        }
        validateRecursive(item, currentPath);
      } else {
        if (!item.field) {
          errors.push(`${currentPath}: Field is required`);
        }
        if (!item.operator) {
          errors.push(`${currentPath}: Operator is required`);
        }
      }
    });
  };

  validateRecursive(ruleSet);

  return { valid: errors.length === 0, errors };
}
