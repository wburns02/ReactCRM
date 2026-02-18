import { useState } from "react";
import { useCallLog } from "../api.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { formatDate, formatPhone, formatDurationSeconds } from "@/lib/utils.ts";
import { CallDispositionModal } from "./CallDispositionModal.tsx";
import type { CallRecord } from "../types.ts";

interface CallLogProps {
  customerId?: string;
  prospectId?: string;
  limit?: number;
  showTitle?: boolean;
}

export function CallLog({
  customerId,
  limit = 10,
  showTitle = true,
}: CallLogProps) {
  const { data: callsData, isLoading } = useCallLog({
    page_size: limit,
    customer_id: customerId,
  });
  const calls = callsData?.items || [];

  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const handleAddDisposition = (call: CallRecord) => {
    setSelectedCall(call);
    setDispositionModalOpen(true);
  };


  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>Call History</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-bg-muted rounded" />
            <div className="h-16 bg-bg-muted rounded" />
            <div className="h-16 bg-bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>Call History</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <p className="text-text-muted">No calls recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>Call History</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          call.direction === "inbound" ? "default" : "warning"
                        }
                      >
                        {call.direction === "inbound" ? "Inbound" : "Outbound"}
                      </Badge>
                      <span className="text-sm text-text-secondary">
                        {formatDurationSeconds(call.duration_seconds)}
                      </span>
                    </div>
                    <p className="font-medium text-text-primary font-mono">
                      {call.direction === "inbound"
                        ? "From: " + formatPhone(call.from_number)
                        : "To: " + formatPhone(call.to_number)}
                    </p>
                    {call.start_time && (
                      <p className="text-xs text-text-muted">
                        {formatDate(call.start_time)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {call.disposition ? (
                      <Badge variant="success">{call.disposition}</Badge>
                    ) : (
                      <button
                        onClick={() => handleAddDisposition(call)}
                        className="text-xs text-primary hover:underline"
                      >
                        Add disposition
                      </button>
                    )}
                    {call.recording_url && (
                      <a
                        href={call.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-link hover:underline"
                      >
                        Listen to recording
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {selectedCall && (
        <CallDispositionModal
          open={dispositionModalOpen}
          onClose={() => {
            setDispositionModalOpen(false);
            setSelectedCall(null);
          }}
          callId={selectedCall.id}
          phoneNumber={
            selectedCall.direction === "inbound"
              ? selectedCall.from_number
              : selectedCall.to_number
          }
        />
      )}
    </>
  );
}
