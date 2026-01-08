/**
 * Bulk Schedule Modal Component
 *
 * Modal for scheduling services or work orders for all customers in a segment.
 * Includes date picker, service type selection, and assignment options.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Segment } from '@/api/types/customerSuccess.ts';

interface BulkScheduleModalProps {
  segment: Segment;
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (options: BulkScheduleOptions) => Promise<void>;
  isScheduling?: boolean;
}

export interface BulkScheduleOptions {
  scheduledDate: string;
  scheduledTime?: string;
  serviceType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignmentMethod: 'auto' | 'specific' | 'round_robin';
  assignedUserId?: number;
  notes?: string;
  createWorkOrders: boolean;
  sendNotifications: boolean;
}

const SERVICE_TYPES = [
  { id: 'maintenance', label: 'Routine Maintenance', icon: '🔧' },
  { id: 'inspection', label: 'Inspection', icon: '🔍' },
  { id: 'repair', label: 'Repair Service', icon: '🛠️' },
  { id: 'installation', label: 'Installation', icon: '📦' },
  { id: 'upgrade', label: 'System Upgrade', icon: '⬆️' },
  { id: 'consultation', label: 'Consultation', icon: '💬' },
  { id: 'review', label: 'Account Review', icon: '📋' },
  { id: 'training', label: 'Training Session', icon: '🎓' },
  { id: 'custom', label: 'Custom Service', icon: '⚙️' },
];

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  { id: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { id: 'high', label: 'High', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
  { id: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
];

const ASSIGNMENT_METHODS = [
  { id: 'auto', label: 'Auto-Assign', description: 'System assigns based on availability' },
  { id: 'round_robin', label: 'Round Robin', description: 'Distribute evenly among team' },
  { id: 'specific', label: 'Specific Rep', description: 'Assign to selected representative' },
];

export function BulkScheduleModal({
  segment,
  isOpen,
  onClose,
  onSchedule,
  isScheduling = false,
}: BulkScheduleModalProps) {
  const [formData, setFormData] = useState<BulkScheduleOptions>({
    scheduledDate: '',
    scheduledTime: '',
    serviceType: 'maintenance',
    priority: 'medium',
    assignmentMethod: 'auto',
    assignedUserId: undefined,
    notes: '',
    createWorkOrders: true,
    sendNotifications: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate preview data
  const previewData = useMemo(() => {
    const customerCount = segment.customer_count || 0;
    const estimatedHours = customerCount * 1.5; // Rough estimate
    const estimatedDays = Math.ceil(customerCount / 8); // 8 per day capacity

    return {
      customerCount,
      estimatedHours,
      estimatedDays,
      workOrdersToCreate: formData.createWorkOrders ? customerCount : 0,
    };
  }, [segment.customer_count, formData.createWorkOrders]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Please select a date';
    } else {
      const selectedDate = new Date(formData.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.scheduledDate = 'Date must be today or in the future';
      }
    }

    if (!formData.serviceType) {
      newErrors.serviceType = 'Please select a service type';
    }

    if (formData.assignmentMethod === 'specific' && !formData.assignedUserId) {
      newErrors.assignedUserId = 'Please select a representative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await onSchedule(formData);
      onClose();
    } catch (err) {
      console.error('Schedule error:', err);
      setErrors({ submit: 'Failed to schedule. Please try again.' });
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Schedule Bulk Service
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Schedule service for {previewData.customerCount} customers in "{segment.name}"
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={today}
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className={cn(
                  'w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  errors.scheduledDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {errors.scheduledDate && (
                <p className="text-sm text-red-500 mt-1">{errors.scheduledDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Time (optional)
              </label>
              <input
                type="time"
                value={formData.scheduledTime || ''}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, serviceType: type.id })}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    formData.serviceType === type.id
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  )}
                >
                  <span className="text-lg mr-2">{type.icon}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    formData.serviceType === type.id
                      ? 'text-primary'
                      : 'text-gray-900 dark:text-white'
                  )}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
            {errors.serviceType && (
              <p className="text-sm text-red-500 mt-1">{errors.serviceType}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: option.id as BulkScheduleOptions['priority'] })}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    formData.priority === option.id
                      ? cn(option.color, 'ring-2 ring-offset-2 ring-primary')
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignment Method
            </label>
            <div className="space-y-2">
              {ASSIGNMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, assignmentMethod: method.id as BulkScheduleOptions['assignmentMethod'], assignedUserId: undefined })}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                    formData.assignmentMethod === method.id
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    formData.assignmentMethod === method.id
                      ? 'border-primary'
                      : 'border-gray-400'
                  )}>
                    {formData.assignmentMethod === method.id && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className={cn(
                      'font-medium text-sm',
                      formData.assignmentMethod === method.id
                        ? 'text-primary'
                        : 'text-gray-900 dark:text-white'
                    )}>
                      {method.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {method.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {errors.assignedUserId && (
              <p className="text-sm text-red-500 mt-1">{errors.assignedUserId}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any special instructions or notes..."
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, createWorkOrders: !formData.createWorkOrders })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.createWorkOrders ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formData.createWorkOrders ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Create Work Orders
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically create work orders for each customer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sendNotifications: !formData.sendNotifications })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.sendNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formData.sendNotifications ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Send Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Notify customers about their scheduled service
                </p>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Preview
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{previewData.customerCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{previewData.workOrdersToCreate}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Work Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{previewData.estimatedHours.toFixed(0)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Est. Hours</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{previewData.estimatedDays}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Est. Days</p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isScheduling || previewData.customerCount === 0}
            className={cn(
              'px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2',
              !isScheduling && previewData.customerCount > 0
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            )}
          >
            {isScheduling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Scheduling...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule {previewData.customerCount} Services
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
