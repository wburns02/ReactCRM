/**
 * Quick Action Buttons Component
 *
 * Reusable action button row for survey responses.
 * Provides one-click actions with loading states and success feedback.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import {
  useScheduleCallback,
  useCreateTicketFromResponse,
  useGenerateOffer,
  useSendFollowUpEmail,
  useBookAppointment,
  useMarkActionTaken,
  type SurveyActionType,
} from '@/api/hooks/useSurveyActions.ts';

// ============================================
// Types
// ============================================

interface QuickActionButtonsProps {
  customerId: number;
  responseId: number;
  availableActions?: SurveyActionType[];
  suggestedActions?: SurveyActionType[];
  onActionClick?: (actionType: SurveyActionType) => void;
  onActionComplete?: (actionType: SurveyActionType, success: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'row' | 'grid';
  showLabels?: boolean;
  className?: string;
}

type ActionButtonState = 'idle' | 'loading' | 'success' | 'error';

// ============================================
// Action Button Configuration
// ============================================

const ACTION_CONFIG: Record<
  SurveyActionType,
  {
    label: string;
    shortLabel: string;
    icon: string;
    description: string;
    bgColor: string;
    hoverColor: string;
    textColor: string;
  }
> = {
  schedule_callback: {
    label: 'Schedule Callback',
    shortLabel: 'Callback',
    icon: '📞',
    description: 'Schedule a phone call with the customer',
    bgColor: 'bg-blue-500/10',
    hoverColor: 'hover:bg-blue-500/20',
    textColor: 'text-blue-600',
  },
  create_ticket: {
    label: 'Create Ticket',
    shortLabel: 'Ticket',
    icon: '🎫',
    description: 'Create a support ticket',
    bgColor: 'bg-orange-500/10',
    hoverColor: 'hover:bg-orange-500/20',
    textColor: 'text-orange-600',
  },
  generate_offer: {
    label: 'Generate Offer',
    shortLabel: 'Offer',
    icon: '💰',
    description: 'Generate a retention offer',
    bgColor: 'bg-green-500/10',
    hoverColor: 'hover:bg-green-500/20',
    textColor: 'text-green-600',
  },
  book_appointment: {
    label: 'Book Appointment',
    shortLabel: 'Meeting',
    icon: '📅',
    description: 'Schedule a meeting',
    bgColor: 'bg-purple-500/10',
    hoverColor: 'hover:bg-purple-500/20',
    textColor: 'text-purple-600',
  },
  send_email: {
    label: 'Send Email',
    shortLabel: 'Email',
    icon: '📧',
    description: 'Send apology/follow-up email',
    bgColor: 'bg-cyan-500/10',
    hoverColor: 'hover:bg-cyan-500/20',
    textColor: 'text-cyan-600',
  },
  create_task: {
    label: 'Create Task',
    shortLabel: 'Task',
    icon: '📋',
    description: 'Create a CS task',
    bgColor: 'bg-indigo-500/10',
    hoverColor: 'hover:bg-indigo-500/20',
    textColor: 'text-indigo-600',
  },
  trigger_playbook: {
    label: 'Trigger Playbook',
    shortLabel: 'Playbook',
    icon: '📖',
    description: 'Start a recovery playbook',
    bgColor: 'bg-pink-500/10',
    hoverColor: 'hover:bg-pink-500/20',
    textColor: 'text-pink-600',
  },
  assign_csm: {
    label: 'Assign CSM',
    shortLabel: 'Assign',
    icon: '👤',
    description: 'Assign a Customer Success Manager',
    bgColor: 'bg-teal-500/10',
    hoverColor: 'hover:bg-teal-500/20',
    textColor: 'text-teal-600',
  },
  escalate: {
    label: 'Escalate',
    shortLabel: 'Escalate',
    icon: '🚨',
    description: 'Escalate to management',
    bgColor: 'bg-danger/10',
    hoverColor: 'hover:bg-danger/20',
    textColor: 'text-danger',
  },
};

// Default actions shown when none specified
const DEFAULT_ACTIONS: SurveyActionType[] = [
  'schedule_callback',
  'create_ticket',
  'generate_offer',
  'book_appointment',
  'send_email',
];

// ============================================
// Action Button Component
// ============================================

interface ActionButtonProps {
  actionType: SurveyActionType;
  onClick: () => void;
  state: ActionButtonState;
  isSuggested?: boolean;
  size: 'sm' | 'md' | 'lg';
  showLabel: boolean;
}

function ActionButton({
  actionType,
  onClick,
  state,
  isSuggested,
  size,
  showLabel,
}: ActionButtonProps) {
  const config = ACTION_CONFIG[actionType];

  const sizeClasses = {
    sm: 'px-2 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const iconSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <button
      onClick={onClick}
      disabled={state === 'loading'}
      title={config.description}
      className={cn(
        'relative rounded-lg font-medium transition-all flex items-center gap-1.5',
        config.bgColor,
        config.hoverColor,
        config.textColor,
        sizeClasses[size],
        state === 'loading' && 'opacity-70 cursor-wait',
        state === 'success' && 'bg-success/10 text-success',
        state === 'error' && 'bg-danger/10 text-danger',
        isSuggested && 'ring-2 ring-primary/50'
      )}
    >
      {/* Loading Spinner */}
      {state === 'loading' && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {/* Success Check */}
      {state === 'success' && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}

      {/* Error X */}
      {state === 'error' && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}

      {/* Icon */}
      {state === 'idle' && <span className={iconSizes[size]}>{config.icon}</span>}

      {/* Label */}
      {showLabel && <span>{size === 'sm' ? config.shortLabel : config.label}</span>}

      {/* Suggested indicator */}
      {isSuggested && state === 'idle' && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
      )}
    </button>
  );
}

// ============================================
// Toast Notification
// ============================================

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4',
        type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
      )}
    >
      {type === 'success' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function QuickActionButtons({
  customerId,
  responseId,
  availableActions,
  suggestedActions = [],
  onActionClick,
  onActionComplete,
  size = 'md',
  layout = 'row',
  showLabels = true,
  className,
}: QuickActionButtonsProps) {
  const [actionStates, setActionStates] = useState<Record<SurveyActionType, ActionButtonState>>({} as Record<SurveyActionType, ActionButtonState>);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Mutations
  const scheduleCallback = useScheduleCallback();
  const createTicket = useCreateTicketFromResponse();
  const generateOffer = useGenerateOffer();
  const sendEmail = useSendFollowUpEmail();
  const bookAppointment = useBookAppointment();
  const markAction = useMarkActionTaken();

  const actions = availableActions || DEFAULT_ACTIONS;

  const setActionState = (actionType: SurveyActionType, state: ActionButtonState) => {
    setActionStates((prev) => ({ ...prev, [actionType]: state }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleActionClick = async (actionType: SurveyActionType) => {
    // If custom handler provided, use it
    if (onActionClick) {
      onActionClick(actionType);
      return;
    }

    // Otherwise, execute the quick action directly
    setActionState(actionType, 'loading');

    try {
      switch (actionType) {
        case 'schedule_callback':
          await scheduleCallback.mutateAsync({
            customerId,
            responseId,
          });
          break;
        case 'create_ticket':
          await createTicket.mutateAsync({
            customerId,
            responseId,
            title: 'Follow-up from survey response',
            priority: 'high',
          });
          break;
        case 'generate_offer':
          await generateOffer.mutateAsync({
            customerId,
            responseId,
            offerType: 'discount',
          });
          break;
        case 'send_email':
          await sendEmail.mutateAsync({
            customerId,
            responseId,
            emailType: 'follow_up',
          });
          break;
        case 'book_appointment':
          await bookAppointment.mutateAsync({
            customerId,
            responseId,
            appointmentType: 'call',
          });
          break;
        default:
          // For other actions, use the generic mark action endpoint
          await markAction.mutateAsync({
            responseId,
            actionType,
          });
      }

      setActionState(actionType, 'success');
      showToast(`${ACTION_CONFIG[actionType].label} completed`, 'success');
      onActionComplete?.(actionType, true);

      // Reset to idle after 2 seconds
      setTimeout(() => setActionState(actionType, 'idle'), 2000);
    } catch (error) {
      console.error(`Failed to execute ${actionType}:`, error);
      setActionState(actionType, 'error');
      showToast(`Failed to ${ACTION_CONFIG[actionType].label.toLowerCase()}`, 'error');
      onActionComplete?.(actionType, false);

      // Reset to idle after 2 seconds
      setTimeout(() => setActionState(actionType, 'idle'), 2000);
    }
  };

  const layoutClasses = {
    row: 'flex flex-wrap gap-2',
    grid: 'grid grid-cols-3 gap-2',
  };

  return (
    <>
      <div className={cn(layoutClasses[layout], className)}>
        {actions.map((actionType) => (
          <ActionButton
            key={actionType}
            actionType={actionType}
            onClick={() => handleActionClick(actionType)}
            state={actionStates[actionType] || 'idle'}
            isSuggested={suggestedActions.includes(actionType)}
            size={size}
            showLabel={showLabels}
          />
        ))}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}

// ============================================
// Compact Version (Icon-only)
// ============================================

interface CompactQuickActionsProps {
  customerId: number;
  responseId: number;
  onActionClick: (actionType: SurveyActionType) => void;
  className?: string;
}

export function CompactQuickActions({
  customerId,
  responseId,
  onActionClick,
  className,
}: CompactQuickActionsProps) {
  return (
    <QuickActionButtons
      customerId={customerId}
      responseId={responseId}
      onActionClick={onActionClick}
      availableActions={['schedule_callback', 'create_ticket', 'send_email', 'escalate']}
      size="sm"
      showLabels={false}
      className={className}
    />
  );
}

// ============================================
// Full Action Panel
// ============================================

interface ActionPanelProps {
  customerId: number;
  responseId: number;
  customerName: string;
  score?: number;
  feedback?: string;
  onClose?: () => void;
  className?: string;
}

export function ActionPanel({
  customerId,
  responseId,
  customerName,
  score,
  feedback,
  onClose,
  className,
}: ActionPanelProps) {
  return (
    <div className={cn('bg-bg-card rounded-xl border border-border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-text-primary">Take Action</h3>
          <p className="text-sm text-text-muted">
            {customerName}
            {score !== undefined && (
              <span className={cn('ml-2', score <= 6 ? 'text-danger' : 'text-success')}>
                Score: {score}/10
              </span>
            )}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {feedback && (
        <div className="mb-4 p-3 bg-bg-hover rounded-lg">
          <p className="text-sm text-text-secondary italic">"{feedback}"</p>
        </div>
      )}

      <QuickActionButtons
        customerId={customerId}
        responseId={responseId}
        size="md"
        layout="grid"
        showLabels={true}
      />
    </div>
  );
}
