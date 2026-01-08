/**
 * Segment Detail Modal Component
 *
 * Shows segment details, rules, and membership info.
 * Includes bulk actions menu for segment operations.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Segment, SegmentType } from '@/api/types/customerSuccess.ts';
import { BulkActionsMenu, ExportModal, BulkScheduleModal } from '../segments/index.ts';
import type { ExportOptions, BulkScheduleOptions } from '../segments/index.ts';
import { useSegmentActions } from '@/hooks/useSegmentActions.ts';

interface SegmentDetailModalProps {
  segment: Segment;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (segment: Segment) => void;
  onViewMembers?: (segment: Segment) => void;
}

const TYPE_CONFIG: Record<SegmentType, { label: string; icon: string; className: string }> = {
  static: { label: 'Static', icon: '📌', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  dynamic: { label: 'Dynamic', icon: '🔄', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  ai_generated: { label: 'AI Generated', icon: '🤖', className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
};

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SegmentDetailModal({
  segment,
  isOpen,
  onClose,
  onEdit,
  onViewMembers,
}: SegmentDetailModalProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  const segmentActions = useSegmentActions(segment.id, segment.name);

  if (!isOpen) return null;

  const typeConfig = TYPE_CONFIG[segment.segment_type];

  const handleExport = async (options: ExportOptions) => {
    await segmentActions.exportSegment(options);
  };

  const handleSchedule = async (options: BulkScheduleOptions) => {
    await segmentActions.scheduleService(options);
  };

  const handleAddTag = async () => {
    if (newTag.trim()) {
      await segmentActions.addTag(newTag.trim());
      setNewTag('');
      setShowTagModal(false);
    }
  };

  const handleAssign = async (method: 'auto' | 'round_robin') => {
    await segmentActions.assignToRep(undefined, method);
    setShowAssignModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium', typeConfig.className)}>
                  {typeConfig.icon} {typeConfig.label}
                </span>
                {segment.is_active ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">Active</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/10 text-gray-500 dark:text-gray-400 font-medium">Inactive</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{segment.name}</h2>
              {segment.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{segment.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <BulkActionsMenu
                segment={segment}
                onEmailAll={segmentActions.openEmailComposer}
                onCreateCallList={() => segmentActions.createCallList()}
                onScheduleService={() => setShowScheduleModal(true)}
                onExport={() => setShowExportModal(true)}
                onAddTag={() => setShowTagModal(true)}
                onAssignToRep={() => setShowAssignModal(true)}
                onLaunchCampaign={segmentActions.openCampaignLauncher}
                onCreateTasks={() => segmentActions.createTasks({ taskType: 'follow_up', title: `Follow up - ${segment.name}` })}
                onCreateWorkOrders={() => setShowScheduleModal(true)}
              />
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-gray-900">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{segment.customer_count || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(segment.total_arr)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total ARR</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {segment.avg_health_score !== null && segment.avg_health_score !== undefined
                  ? segment.avg_health_score.toFixed(0)
                  : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Health Score</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className={cn(
                'text-2xl font-bold',
                (segment.churn_risk_count || 0) > 0 ? 'text-red-500' : 'text-green-500'
              )}>
                {segment.churn_risk_count || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">At Risk</p>
            </div>
          </div>

          {/* Rules */}
          {segment.rules ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Segment Rules
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <pre className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(segment.rules as object, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}

          {/* Automation */}
          {(segment.on_entry_playbook_id || segment.on_entry_journey_id ||
            segment.on_exit_playbook_id || segment.on_exit_journey_id) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Automation
              </h3>
              <div className="space-y-2">
                {segment.on_entry_playbook_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">→</span>
                    <span className="text-gray-600 dark:text-gray-300">On entry: Trigger Playbook #{segment.on_entry_playbook_id}</span>
                  </div>
                )}
                {segment.on_entry_journey_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">→</span>
                    <span className="text-gray-600 dark:text-gray-300">On entry: Enroll in Journey #{segment.on_entry_journey_id}</span>
                  </div>
                )}
                {segment.on_exit_playbook_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-500">←</span>
                    <span className="text-gray-600 dark:text-gray-300">On exit: Trigger Playbook #{segment.on_exit_playbook_id}</span>
                  </div>
                )}
                {segment.on_exit_journey_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-500">←</span>
                    <span className="text-gray-600 dark:text-gray-300">On exit: Enroll in Journey #{segment.on_exit_journey_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {segment.tags && segment.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {segment.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Update Info */}
          {segment.segment_type === 'dynamic' && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Auto-update frequency</span>
                <span className="text-gray-900 dark:text-white">{segment.update_frequency_hours || 24} hours</span>
              </div>
              {segment.last_evaluated_at && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500 dark:text-gray-400">Last evaluated</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(segment.last_evaluated_at).toLocaleString()}
                  </span>
                </div>
              )}
              {segment.next_evaluation_at && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500 dark:text-gray-400">Next evaluation</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(segment.next_evaluation_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-end gap-3">
          {onViewMembers && (
            <button
              onClick={() => onViewMembers(segment)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View Members
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(segment)}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Segment
            </button>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        segment={segment}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isExporting={segmentActions.isExporting}
      />

      {/* Bulk Schedule Modal */}
      <BulkScheduleModal
        segment={segment}
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
        isScheduling={segmentActions.isScheduling}
      />

      {/* Tag Modal (Simple inline) */}
      {showTagModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTagModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Tag to Segment</h3>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Enter tag name..."
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTagModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim() || segmentActions.isTagging}
                className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {segmentActions.isTagging ? 'Adding...' : 'Add Tag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal (Simple inline) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Assign Customers to Reps</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Choose how to distribute {segment.customer_count || 0} customers among your team.
            </p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => handleAssign('auto')}
                disabled={segmentActions.isAssigning}
                className="w-full p-3 text-left rounded-lg border border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5 transition-all"
              >
                <p className="font-medium text-gray-900 dark:text-white">Auto-Assign</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">System assigns based on rep availability</p>
              </button>
              <button
                onClick={() => handleAssign('round_robin')}
                disabled={segmentActions.isAssigning}
                className="w-full p-3 text-left rounded-lg border border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5 transition-all"
              >
                <p className="font-medium text-gray-900 dark:text-white">Round Robin</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Distribute evenly among all active reps</p>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
