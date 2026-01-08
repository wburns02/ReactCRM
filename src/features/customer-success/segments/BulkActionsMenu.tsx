/**
 * Bulk Actions Menu Component
 *
 * Dropdown menu for bulk segment operations including email, scheduling,
 * export, tagging, assignment, and more.
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Segment } from '@/api/types/customerSuccess.ts';

interface BulkActionsMenuProps {
  segment: Segment;
  onEmailAll?: () => void;
  onCreateCallList?: () => void;
  onScheduleService?: () => void;
  onExport?: () => void;
  onAddTag?: () => void;
  onAssignToRep?: () => void;
  onLaunchCampaign?: () => void;
  onCreateTasks?: () => void;
  onCreateWorkOrders?: () => void;
  className?: string;
}

interface MenuAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  dividerAfter?: boolean;
}

export function BulkActionsMenu({
  segment,
  onEmailAll,
  onCreateCallList,
  onScheduleService,
  onExport,
  onAddTag,
  onAssignToRep,
  onLaunchCampaign,
  onCreateTasks,
  onCreateWorkOrders,
  className,
}: BulkActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const customerCount = segment.customer_count || 0;
  const hasCustomers = customerCount > 0;

  const actions: MenuAction[] = [
    {
      id: 'email-all',
      label: 'Email All',
      description: `Send email to ${customerCount} customers`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      onClick: onEmailAll,
      disabled: !hasCustomers,
    },
    {
      id: 'create-call-list',
      label: 'Create Call List',
      description: 'Generate prioritized call queue',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      onClick: onCreateCallList,
      disabled: !hasCustomers,
      dividerAfter: true,
    },
    {
      id: 'schedule-service',
      label: 'Schedule Service',
      description: 'Bulk service scheduling',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      onClick: onScheduleService,
      disabled: !hasCustomers,
    },
    {
      id: 'create-work-orders',
      label: 'Create Work Orders',
      description: 'Bulk work order generation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      onClick: onCreateWorkOrders,
      disabled: !hasCustomers,
    },
    {
      id: 'create-tasks',
      label: 'Create Tasks',
      description: 'Bulk task creation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: onCreateTasks,
      disabled: !hasCustomers,
      dividerAfter: true,
    },
    {
      id: 'launch-campaign',
      label: 'Launch Campaign',
      description: 'Start nurture sequence',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      onClick: onLaunchCampaign,
      disabled: !hasCustomers,
      dividerAfter: true,
    },
    {
      id: 'add-tag',
      label: 'Add Tag',
      description: 'Bulk tagging',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      onClick: onAddTag,
      disabled: !hasCustomers,
    },
    {
      id: 'assign-to-rep',
      label: 'Assign to Rep',
      description: 'Distribute among team',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      onClick: onAssignToRep,
      disabled: !hasCustomers,
      dividerAfter: true,
    },
    {
      id: 'export',
      label: 'Export',
      description: 'CSV/Excel download',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      onClick: onExport,
      disabled: !hasCustomers,
    },
  ];

  const handleActionClick = (action: MenuAction) => {
    if (action.onClick && !action.disabled) {
      action.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          'bg-primary text-white hover:bg-primary-hover',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Bulk Actions
        <svg
          className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Actions for "{segment.name}"
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {customerCount} {customerCount === 1 ? 'customer' : 'customers'} in segment
            </p>
          </div>

          {/* Actions List */}
          <div className="py-1 max-h-80 overflow-y-auto">
            {actions.map((action) => (
              <div key={action.id}>
                <button
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled}
                  className={cn(
                    'w-full px-4 py-2.5 flex items-start gap-3 text-left transition-colors',
                    action.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  <span className={cn(
                    'flex-shrink-0 mt-0.5',
                    action.disabled
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-600 dark:text-gray-300'
                  )}>
                    {action.icon}
                  </span>
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      action.disabled
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-900 dark:text-white'
                    )}>
                      {action.label}
                    </p>
                    <p className={cn(
                      'text-xs mt-0.5',
                      action.disabled
                        ? 'text-gray-300 dark:text-gray-600'
                        : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {action.description}
                    </p>
                  </div>
                </button>
                {action.dividerAfter && (
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                )}
              </div>
            ))}
          </div>

          {!hasCustomers && (
            <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Add customers to this segment to enable bulk actions.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
