import { memo } from 'react';
import { formatDate } from '@/lib/utils.ts';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS, type Activity } from '@/api/types/activity.ts';
import { cn } from '@/lib/utils.ts';

export interface NoteCardProps {
  activity: Activity;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
}

/**
 * Individual activity/note card component
 * Displays a single activity with type icon, description, and metadata
 *
 * Memoized for performance in activity lists.
 */
export const NoteCard = memo(function NoteCard({ activity, onEdit, onDelete }: NoteCardProps) {
  const icon = ACTIVITY_TYPE_ICONS[activity.activity_type];
  const label = ACTIVITY_TYPE_LABELS[activity.activity_type];

  return (
    <div className="flex gap-3 group">
      {/* Icon/Type */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm',
            'bg-bg-hover border border-border'
          )}
          title={label}
        >
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-text-primary">{label}</span>
              <span className="text-xs text-text-muted">
                {formatDate(activity.activity_date)}
              </span>
            </div>
            <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">
              {activity.description}
            </p>
            {activity.created_by && (
              <p className="text-xs text-text-muted mt-1">By {activity.created_by}</p>
            )}
          </div>

          {/* Actions */}
          {(onEdit || onDelete) && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(activity)}
                  className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-bg-hover"
                  aria-label="Edit activity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(activity)}
                  className="text-text-muted hover:text-danger p-1 rounded hover:bg-bg-hover"
                  aria-label="Delete activity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
