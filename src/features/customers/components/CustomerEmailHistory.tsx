import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { EmailComposeModal } from "@/features/communications/components/EmailComposeModal";

interface EmailMessage {
  id: number;
  type: string;
  direction: "inbound" | "outbound";
  status: string;
  to_address: string;
  from_address: string | null;
  subject: string | null;
  content: string;
  sent_at: string | null;
  created_at: string;
}

interface CustomerEmailHistoryProps {
  customerId: string;
  customerEmail?: string;
  customerName?: string;
}

/**
 * Customer Email History Component
 *
 * Displays email communication history for a specific customer
 * with ability to compose new emails.
 */
export function CustomerEmailHistory({
  customerId,
  customerEmail,
  customerName,
}: CustomerEmailHistoryProps) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customer-emails", customerId],
    queryFn: async () => {
      const response = await apiClient.get("/communications/history", {
        params: {
          customer_id: customerId,
          type: "email",
          page_size: 10,
        },
      });
      return response.data;
    },
    enabled: !!customerId,
  });

  const emails: EmailMessage[] = data?.items || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Email History</CardTitle>
          {customerEmail && (
            <button
              onClick={() => setIsComposeOpen(true)}
              className="px-3 py-1.5 text-sm bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              Send Email
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-bg-muted rounded" />
            <div className="h-16 bg-bg-muted rounded" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-3xl block mb-2">📧</span>
            <p className="text-text-muted">No emails sent</p>
            {customerEmail && (
              <button
                onClick={() => setIsComposeOpen(true)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Send first email
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                    email.direction === "outbound"
                      ? "bg-primary/10 text-primary"
                      : "bg-purple-500/10 text-purple-500"
                  }`}
                >
                  {email.direction === "outbound" ? "Out" : "In"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {email.subject || "(No Subject)"}
                  </p>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {email.content?.substring(0, 150)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span>
                      {formatDate(email.sent_at || email.created_at)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-text-muted" />
                    <span
                      className={
                        email.status === "delivered"
                          ? "text-success"
                          : email.status === "failed"
                            ? "text-danger"
                            : ""
                      }
                    >
                      {email.status === "sent" && "Sent"}
                      {email.status === "delivered" && "Delivered"}
                      {email.status === "failed" && "Failed"}
                      {email.status === "pending" && "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {data?.total > 10 && (
              <p className="text-center text-sm text-text-muted pt-2">
                +{data.total - 10} more emails
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Compose Modal */}
      <EmailComposeModal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        defaultEmail={customerEmail}
        customerId={customerId}
        customerName={customerName}
      />
    </Card>
  );
}
