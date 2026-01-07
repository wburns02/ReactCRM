/**
 * Trigger Playbook Modal Component
 *
 * Allows selecting a customer and triggering a playbook execution.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Playbook } from '@/api/types/customerSuccess.ts';
import { useCustomers } from '@/api/hooks/useCustomers.ts';
import { useTriggerPlaybook } from '@/api/hooks/useCustomerSuccess.ts';

interface TriggerPlaybookModalProps {
  playbook: Playbook;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Helper to get full name from customer
function getCustomerName(customer: { first_name: string; last_name: string }): string {
  return `${customer.first_name} ${customer.last_name}`.trim();
}

export function TriggerPlaybookModal({
  playbook,
  isOpen,
  onClose,
  onSuccess,
}: TriggerPlaybookModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerReason, setTriggerReason] = useState('');

  const { data: customersData, isLoading: customersLoading } = useCustomers({
    page_size: 100,
    search: searchQuery || undefined,
  });

  const triggerMutation = useTriggerPlaybook();

  if (!isOpen) return null;

  const customers = customersData?.items || [];
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleTrigger = async () => {
    if (!selectedCustomerId) return;

    try {
      await triggerMutation.mutateAsync({
        playbook_id: playbook.id,
        customer_id: parseInt(selectedCustomerId, 10),
        reason: triggerReason || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to trigger playbook:', error);
    }
  };

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
                Trigger Playbook
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {playbook.name}
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
        <div className="p-6 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Customer <span className="text-red-500">*</span>
            </label>

            {/* Search Input */}
            <div className="relative mb-2">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Customer List */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-gray-800">
              {customersLoading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-2" />
                  Loading customers...
                </div>
              ) : customers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No customers found
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={cn(
                        'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                        selectedCustomerId === customer.id
                          ? 'bg-primary/10 dark:bg-primary/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      )}
                    >
                      {/* Selection indicator */}
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        selectedCustomerId === customer.id
                          ? 'border-primary bg-primary'
                          : 'border-gray-300 dark:border-gray-600'
                      )}>
                        {selectedCustomerId === customer.id && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Customer info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium truncate',
                          selectedCustomerId === customer.id
                            ? 'text-primary'
                            : 'text-gray-900 dark:text-white'
                        )}>
                          {getCustomerName(customer)}
                        </p>
                        {customer.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {customer.email}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected customer display */}
            {selectedCustomer && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <span className="font-medium">Selected:</span> {getCustomerName(selectedCustomer)}
                </p>
              </div>
            )}
          </div>

          {/* Reason (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={triggerReason}
              onChange={(e) => setTriggerReason(e.target.value)}
              placeholder="Why are you triggering this playbook?"
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Playbook Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This will create {playbook.steps?.length || 0} tasks for the selected customer based on the playbook steps.
            </p>
          </div>

          {/* Error display */}
          {triggerMutation.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                Failed to trigger playbook. Please try again.
              </p>
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
            onClick={handleTrigger}
            disabled={!selectedCustomerId || triggerMutation.isPending}
            className={cn(
              'px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2',
              selectedCustomerId && !triggerMutation.isPending
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            )}
          >
            {triggerMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Triggering...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Trigger Playbook
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
