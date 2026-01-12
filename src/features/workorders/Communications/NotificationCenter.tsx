/**
 * NotificationCenter Component
 *
 * Displays all sent/pending notifications with filtering and resend capabilities.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import {
  useCommunications,
  useResendNotification,
} from "./hooks/useCommunications.ts";
import type {
  CommunicationType,
  CommunicationStatus,
} from "@/api/types/communication.ts";

interface NotificationCenterProps {
  workOrderId?: string;
  customerId?: string;
}

type FilterType = "all" | CommunicationType;
type FilterStatus = "all" | CommunicationStatus;

const STATUS_COLORS: Record<
  CommunicationStatus,
  "success" | "warning" | "danger" | "default"
> = {
  delivered: "success",
  sent: "default",
  pending: "warning",
  failed: "danger",
};

const STATUS_LABELS: Record<CommunicationStatus, string> = {
  delivered: "Delivered",
  sent: "Sent",
  pending: "Pending",
  failed: "Failed",
};

export function NotificationCenter({
  workOrderId: _workOrderId,
  customerId,
}: NotificationCenterProps) {
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useCommunications({
    page,
    page_size: 20,
    customer_id: customerId,
    communication_type: typeFilter === "all" ? undefined : typeFilter,
  });

  const resendMutation = useResendNotification();

  const filteredNotifications = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((notification) => {
      // Status filter
      if (statusFilter !== "all" && notification.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesRecipient = notification.recipient
          .toLowerCase()
          .includes(query);
        const matchesMessage = notification.message
          .toLowerCase()
          .includes(query);
        const matchesSubject = notification.subject
          ?.toLowerCase()
          .includes(query);
        if (!matchesRecipient && !matchesMessage && !matchesSubject) {
          return false;
        }
      }

      return true;
    });
  }, [data?.items, statusFilter, searchQuery]);

  const handleResend = async (notificationId: string) => {
    try {
      await resendMutation.mutateAsync(notificationId);
    } catch (err) {
      console.error("Failed to resend notification:", err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-danger">
          <p>Failed to load notifications</p>
          <p className="text-sm text-text-secondary mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <div className="text-sm text-text-secondary">
          {data?.total ?? 0} total notifications
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FilterType)}
          className="w-32"
        >
          <option value="all">All Types</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          className="w-32"
        >
          <option value="all">All Status</option>
          <option value="delivered">Delivered</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </Select>

        <Input
          type="search"
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-48"
        />
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </Card>
          ))
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-text-secondary">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p>No notifications found</p>
              <p className="text-sm mt-1">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Notifications will appear here when sent"}
              </p>
            </div>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className="p-4 hover:bg-surface-secondary/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Type Icon */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${notification.communication_type === "sms" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}
                  `}
                >
                  {notification.communication_type === "sms" ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {notification.recipient}
                    </span>
                    <Badge variant={STATUS_COLORS[notification.status]}>
                      {STATUS_LABELS[notification.status]}
                    </Badge>
                  </div>

                  {notification.subject && (
                    <p className="text-sm font-medium text-text-secondary mb-1">
                      {notification.subject}
                    </p>
                  )}

                  <p className="text-sm text-text-secondary line-clamp-2">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span>{formatTimestamp(notification.sent_at)}</span>
                    {notification.delivered_at && (
                      <span>
                        Delivered: {formatTimestamp(notification.delivered_at)}
                      </span>
                    )}
                    {notification.error_message && (
                      <span className="text-danger">
                        {notification.error_message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {notification.status === "failed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResend(notification.id)}
                      disabled={resendMutation.isPending}
                    >
                      {resendMutation.isPending ? "Resending..." : "Resend"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary">
            Page {page} of {Math.ceil(data.total / 20)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / 20)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
