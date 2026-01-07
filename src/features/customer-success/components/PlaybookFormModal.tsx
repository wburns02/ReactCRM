/**
 * Playbook Form Modal Component
 *
 * Modal for creating and editing playbooks.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Playbook, PlaybookFormData, PlaybookCategory, PlaybookTriggerType, PlaybookPriority } from '@/api/types/customerSuccess.ts';
import { useCreatePlaybook, useUpdatePlaybook } from '@/api/hooks/useCustomerSuccess.ts';

interface PlaybookFormModalProps {
  playbook?: Playbook | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PLAYBOOK_CATEGORIES: { value: PlaybookCategory; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'adoption', label: 'Adoption' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'churn_risk', label: 'Churn Risk' },
  { value: 'churn_prevention', label: 'Churn Prevention' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'qbr', label: 'QBR' },
  { value: 'executive_sponsor', label: 'Executive Sponsor' },
  { value: 'champion_change', label: 'Champion Change' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'training', label: 'Training' },
  { value: 'risk_mitigation', label: 'Risk Mitigation' },
  { value: 'winback', label: 'Win Back' },
  { value: 'custom', label: 'Custom' },
];

const TRIGGER_TYPES: { value: PlaybookTriggerType; label: string; description: string }[] = [
  { value: 'manual', label: 'Manual', description: 'Triggered by CSM' },
  { value: 'health_threshold', label: 'Health Score', description: 'When health score changes' },
  { value: 'segment_entry', label: 'Segment Entry', description: 'When customer enters segment' },
  { value: 'event', label: 'Event', description: 'Based on customer event' },
  { value: 'days_to_renewal', label: 'Renewal Date', description: 'Days before renewal' },
  { value: 'scheduled', label: 'Scheduled', description: 'On a schedule' },
];

const PRIORITIES: { value: PlaybookPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-gray-600 bg-gray-100 dark:bg-gray-800' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30' },
  { value: 'high', label: 'High', color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30' },
  { value: 'critical', label: 'Critical', color: 'text-red-700 bg-red-100 dark:bg-red-900/30' },
];

export function PlaybookFormModal({
  playbook,
  isOpen,
  onClose,
  onSuccess,
}: PlaybookFormModalProps) {
  const isEditing = !!playbook;

  const [formData, setFormData] = useState<PlaybookFormData>({
    name: '',
    description: '',
    category: 'custom',
    trigger_type: 'manual',
    priority: 'medium',
    is_active: true,
    auto_assign: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreatePlaybook();
  const updateMutation = useUpdatePlaybook();

  useEffect(() => {
    if (playbook) {
      setFormData({
        name: playbook.name || '',
        description: playbook.description || '',
        category: (playbook.category as PlaybookCategory) || 'custom',
        trigger_type: (playbook.trigger_type as PlaybookTriggerType) || 'manual',
        trigger_health_threshold: playbook.trigger_health_threshold || undefined,
        trigger_health_direction: playbook.trigger_health_direction as 'below' | 'above' | undefined,
        trigger_days_to_renewal: playbook.trigger_days_to_renewal || undefined,
        priority: playbook.priority || 'medium',
        is_active: playbook.is_active ?? true,
        auto_assign: playbook.auto_assign ?? true,
        estimated_hours: playbook.estimated_hours || undefined,
        target_completion_days: playbook.target_completion_days || undefined,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'custom',
        trigger_type: 'manual',
        priority: 'medium',
        is_active: true,
        auto_assign: true,
      });
    }
    setErrors({});
  }, [playbook, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (formData.trigger_type === 'health_threshold' && !formData.trigger_health_threshold) {
      newErrors.trigger_health_threshold = 'Health threshold is required';
    }
    if (formData.trigger_type === 'days_to_renewal' && !formData.trigger_days_to_renewal) {
      newErrors.trigger_days_to_renewal = 'Days to renewal is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (isEditing && playbook) {
        await updateMutation.mutateAsync({
          id: playbook.id,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to save playbook:', error);
      setErrors({ submit: 'Failed to save playbook. Please try again.' });
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
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Playbook' : 'Create Playbook'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {isEditing ? 'Update playbook details' : 'Define a new customer success playbook'}
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
          <div className="grid md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 90-Day Onboarding Playbook"
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the playbook purpose and goals..."
                rows={2}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as PlaybookCategory })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {PLAYBOOK_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                      formData.priority === p.value
                        ? `${p.color} ring-2 ring-primary ring-offset-1`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trigger Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TRIGGER_TYPES.map((trigger) => (
                <button
                  key={trigger.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, trigger_type: trigger.value })}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    formData.trigger_type === trigger.value
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  )}
                >
                  <p className={cn(
                    'font-medium text-sm',
                    formData.trigger_type === trigger.value
                      ? 'text-primary'
                      : 'text-gray-900 dark:text-white'
                  )}>
                    {trigger.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {trigger.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional trigger settings */}
          {formData.trigger_type === 'health_threshold' && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Health Threshold <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.trigger_health_threshold || ''}
                    onChange={(e) => setFormData({ ...formData, trigger_health_threshold: parseInt(e.target.value) || undefined })}
                    placeholder="e.g., 40"
                    min={0}
                    max={100}
                    className={cn(
                      'w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg text-sm',
                      errors.trigger_health_threshold ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {errors.trigger_health_threshold && (
                    <p className="text-sm text-red-500 mt-1">{errors.trigger_health_threshold}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Direction
                  </label>
                  <select
                    value={formData.trigger_health_direction || 'below'}
                    onChange={(e) => setFormData({ ...formData, trigger_health_direction: e.target.value as 'below' | 'above' })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  >
                    <option value="below">Below threshold</option>
                    <option value="above">Above threshold</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {formData.trigger_type === 'days_to_renewal' && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Days Before Renewal <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.trigger_days_to_renewal || ''}
                onChange={(e) => setFormData({ ...formData, trigger_days_to_renewal: parseInt(e.target.value) || undefined })}
                placeholder="e.g., 90"
                min={1}
                className={cn(
                  'w-32 px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg text-sm',
                  errors.trigger_days_to_renewal ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {errors.trigger_days_to_renewal && (
                <p className="text-sm text-red-500 mt-1">{errors.trigger_days_to_renewal}</p>
              )}
            </div>
          )}

          {/* Additional Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                value={formData.estimated_hours || ''}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || undefined })}
                placeholder="e.g., 8"
                min={0}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Completion Days
              </label>
              <input
                type="number"
                value={formData.target_completion_days || ''}
                onChange={(e) => setFormData({ ...formData, target_completion_days: parseInt(e.target.value) || undefined })}
                placeholder="e.g., 14"
                min={1}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Toggle Options */}
          <div className="flex flex-wrap gap-6">
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, auto_assign: !formData.auto_assign })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.auto_assign ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formData.auto_assign ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-assign tasks
              </label>
            </div>
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
                {isEditing ? 'Save Changes' : 'Create Playbook'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
