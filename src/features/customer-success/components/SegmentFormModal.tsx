/**
 * Segment Form Modal Component
 *
 * Modal for creating and editing customer segments.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Segment, SegmentFormData, SegmentType } from '@/api/types/customerSuccess.ts';
import { useCreateSegment, useUpdateSegment } from '@/api/hooks/useCustomerSuccess.ts';

interface SegmentFormModalProps {
  segment?: Segment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SEGMENT_TYPES: { value: SegmentType; label: string; description: string }[] = [
  { value: 'dynamic', label: 'Dynamic', description: 'Auto-updates based on rules' },
  { value: 'static', label: 'Static', description: 'Manually managed members' },
  { value: 'ai_generated', label: 'AI Generated', description: 'Created by AI analysis' },
];

const SEGMENT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function SegmentFormModal({
  segment,
  isOpen,
  onClose,
  onSuccess,
}: SegmentFormModalProps) {
  const isEditing = !!segment;

  const [formData, setFormData] = useState<SegmentFormData>({
    name: '',
    description: '',
    segment_type: 'dynamic',
    priority: 0,
    is_active: true,
    color: SEGMENT_COLORS[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateSegment();
  const updateMutation = useUpdateSegment();

  useEffect(() => {
    if (segment) {
      setFormData({
        name: segment.name || '',
        description: segment.description || '',
        segment_type: segment.segment_type || 'dynamic',
        priority: segment.priority || 0,
        is_active: segment.is_active ?? true,
        color: segment.color || SEGMENT_COLORS[0],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        segment_type: 'dynamic',
        priority: 0,
        is_active: true,
        color: SEGMENT_COLORS[0],
      });
    }
    setErrors({});
  }, [segment, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (isEditing && segment) {
        await updateMutation.mutateAsync({
          id: segment.id,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to save segment:', error);
      setErrors({ submit: 'Failed to save segment. Please try again.' });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Segment' : 'Create Segment'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {isEditing ? 'Update segment details' : 'Define a new customer segment'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Enterprise Accounts"
              className={cn(
                'w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              )}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what defines this segment..."
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Segment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Segment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SEGMENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, segment_type: type.value })}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    formData.segment_type === type.value
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  )}
                >
                  <p className={cn(
                    'font-medium text-sm',
                    formData.segment_type === type.value
                      ? 'text-primary'
                      : 'text-gray-900 dark:text-white'
                  )}>
                    {type.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {SEGMENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform',
                    formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <input
              type="number"
              value={formData.priority || 0}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              min={0}
              max={100}
              className="w-24 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Higher priority segments are evaluated first
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                formData.is_active ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  formData.is_active ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          {/* Error display */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className={cn(
              'px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2',
              !isPending
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            )}
          >
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEditing ? 'Save Changes' : 'Create Segment'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
