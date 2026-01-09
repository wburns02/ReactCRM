/**
 * NotificationButtons Component
 *
 * Quick action buttons for sending customer notifications.
 * Matches the legacy UI with three notification types:
 * - Send Reminder (bell icon, primary)
 * - Tech En Route (truck icon, info/blue)
 * - Service Complete (check icon, success/green)
 */

import { Button } from '@/components/ui/Button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { communicationKeys } from './hooks/useCommunications';

interface NotificationButtonsProps {
  workOrderId: string;
  customerId: string;
  customerPhone?: string;
  customerName?: string;
}

type NotificationType = 'reminder' | 'enroute' | 'complete';

export function NotificationButtons({
  workOrderId,
  customerId,
  customerPhone,
  customerName,
}: NotificationButtonsProps) {
  const queryClient = useQueryClient();

  const sendNotification = useMutation({
    mutationFn: async (type: NotificationType) => {
      return apiClient.post(`/work-orders/${workOrderId}/notifications`, {
        type,
        customer_id: customerId,
      });
    },
    onSuccess: (_, type) => {
      const messages: Record<NotificationType, string> = {
        reminder: 'Reminder sent',
        enroute: 'En route notification sent',
        complete: 'Service complete notification sent',
      };
      toastSuccess(messages[type], `Sent to ${customerName || 'customer'}`);

      // Invalidate communication history queries
      queryClient.invalidateQueries({
        queryKey: communicationKeys.history(workOrderId),
      });
    },
    onError: () => {
      toastError('Failed to send notification', 'Please try again');
    },
  });

  const isPending = sendNotification.isPending;

  if (!customerPhone) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Customer Notifications</h3>
        <p className="text-sm text-warning">
          Customer phone number required to send notifications
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Customer Notifications</h3>
      <div className="grid gap-2">
        {/* Send Reminder Button - Primary */}
        <Button
          className="w-full justify-start"
          onClick={() => sendNotification.mutate('reminder')}
          disabled={isPending}
        >
          {/* Bell icon */}
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {isPending && sendNotification.variables === 'reminder'
            ? 'Sending...'
            : 'Send Reminder'}
        </Button>

        {/* Tech En Route Button - Secondary/Info */}
        <Button
          variant="secondary"
          className="w-full justify-start bg-info/10 border-info text-info hover:bg-info/20"
          onClick={() => sendNotification.mutate('enroute')}
          disabled={isPending}
        >
          {/* Truck icon */}
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1m10 0h4l3-3v-5a1 1 0 00-1-1h-2"
            />
          </svg>
          {isPending && sendNotification.variables === 'enroute'
            ? 'Sending...'
            : 'Tech En Route'}
        </Button>

        {/* Service Complete Button - Success/Green */}
        <Button
          variant="ghost"
          className="w-full justify-start bg-success/10 border border-success text-success hover:bg-success/20"
          onClick={() => sendNotification.mutate('complete')}
          disabled={isPending}
        >
          {/* Check circle icon */}
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {isPending && sendNotification.variables === 'complete'
            ? 'Sending...'
            : 'Service Complete'}
        </Button>
      </div>
    </div>
  );
}

export default NotificationButtons;
