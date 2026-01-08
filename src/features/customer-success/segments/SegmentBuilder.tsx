/**
 * SegmentBuilder Component
 *
 * Visual rule builder for creating and editing segments.
 * Features:
 * - Drag-drop rule groups with AND/OR logic
 * - Categorized field picker
 * - Dynamic operators and value inputs
 * - Live preview count
 * - AI suggestions for improving the segment
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils.ts';
import type { SegmentRuleSet, SegmentType } from '@/api/types/customerSuccess.ts';
import { RuleGroup, validateRuleSet } from './components/RuleGroup.tsx';
import { createEmptyRule } from './components/RuleBuilder.tsx';
import { useSegmentPreview, useSegmentRuleState } from '@/hooks/useSegments.ts';
import { useDebounce } from '@/hooks/useDebounce.ts';

// Segment colors
const SEGMENT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

interface SegmentBuilderProps {
  initialRules?: SegmentRuleSet;
  initialName?: string;
  initialDescription?: string;
  initialType?: SegmentType;
  initialColor?: string;
  isEditing?: boolean;
  onSave?: (data: {
    name: string;
    description: string;
    segment_type: SegmentType;
    rules: SegmentRuleSet;
    color: string;
  }) => void;
  onCancel?: () => void;
  className?: string;
}

export function SegmentBuilder({
  initialRules,
  initialName = '',
  initialDescription = '',
  initialType = 'dynamic',
  initialColor = SEGMENT_COLORS[0],
  isEditing = false,
  onSave,
  onCancel,
  className,
}: SegmentBuilderProps) {
  // Form state
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [segmentType, setSegmentType] = useState<SegmentType>(initialType);
  const [color, setColor] = useState(initialColor);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Rule state with undo/redo
  const { rules, setRules, undo, redo, canUndo, canRedo, reset } = useSegmentRuleState(
    initialRules || { logic: 'and', rules: [createEmptyRule()] }
  );

  // Preview state
  const { preview, previewResult, isLoading: previewLoading, reset: resetPreview } = useSegmentPreview();

  // Debounce rules for preview
  const debouncedRules = useDebounce(rules, 500);

  // Auto-preview on rule changes
  useEffect(() => {
    if (debouncedRules.rules.length > 0) {
      preview(debouncedRules);
    } else {
      resetPreview();
    }
  }, [debouncedRules, preview, resetPreview]);

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    const ruleValidation = validateRuleSet(rules);
    if (!ruleValidation.valid) {
      newErrors.rules = ruleValidation.errors.join(', ');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, rules]);

  // Handle save
  const handleSave = () => {
    if (!validate()) return;

    onSave?.({
      name: name.trim(),
      description: description.trim(),
      segment_type: segmentType,
      rules,
      color,
    });
  };

  // Handle reset
  const handleReset = () => {
    setName(initialName);
    setDescription(initialDescription);
    setSegmentType(initialType);
    setColor(initialColor);
    reset();
    setErrors({});
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Segment' : 'Create Segment'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Define rules to automatically group customers
            </p>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={cn(
                'p-2 rounded-lg transition-colors',
                canUndo
                  ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              )}
              title="Undo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={cn(
                'p-2 rounded-lg transition-colors',
                canRedo
                  ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              )}
              title="Redo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Rules Builder */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Segment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Enterprise At-Risk"
                  className={cn(
                    'w-full px-4 py-2 text-sm rounded-lg border transition-colors',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this segment represents..."
                  rows={2}
                  className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Segment Type
                </label>
                <div className="flex gap-2">
                  {(['dynamic', 'static', 'ai_generated'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSegmentType(type)}
                      className={cn(
                        'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
                        segmentType === type
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                      )}
                    >
                      {type === 'ai_generated' ? 'AI' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {SEGMENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-transform',
                        color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rules Builder */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Segment Rules</h3>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Reset Rules
              </button>
            </div>

            {errors.rules && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.rules}</p>
              </div>
            )}

            <RuleGroup
              ruleSet={rules}
              onChange={setRules}
            />
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <div className="p-4 sticky top-0">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Live Preview</h3>

            {/* Preview Count */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div className="text-center">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : previewResult ? (
                  <>
                    <div className="text-4xl font-bold text-primary mb-1">
                      {previewResult.count.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      customers match
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 py-4">
                    Add rules to see preview
                  </div>
                )}
              </div>
            </div>

            {/* Preview Stats */}
            {previewResult && (
              <div className="space-y-3 mb-4">
                {previewResult.total_arr && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${(previewResult.total_arr / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total ARR</div>
                  </div>
                )}
                {previewResult.avg_health_score && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {previewResult.avg_health_score}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Avg Health Score</div>
                  </div>
                )}
              </div>
            )}

            {/* Sample Customers */}
            {previewResult && previewResult.sample_customers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Sample Members
                </h4>
                <div className="space-y-2">
                  {previewResult.sample_customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {customer.email}
                        </div>
                      </div>
                      {customer.health_score !== null && (
                        <div className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          customer.health_score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          customer.health_score >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                          {customer.health_score}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {rules.rules.length} rule{rules.rules.length !== 1 ? 's' : ''} configured
          </div>
          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isEditing ? 'Save Changes' : 'Create Segment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
