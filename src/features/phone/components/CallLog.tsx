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
            <CardTitle>Contact History</CardTitle>
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
            <CardTitle>Contact History</CardTitle>
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
            <CardTitle>Contact History</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={call.direction === "inbound" ? "default" : "warning"}>
                        {call.direction === "inbound" ? "Inbound" : "Outbound"}
                      </Badge>
                      <span className="text-sm text-text-secondary">
                        {formatDurationSeconds(call.duration_seconds)}
                      </span>
                      {call.start_time && (
                        <span className="text-xs text-text-muted">
                          {formatDate(call.start_time)}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-text-primary font-mono text-sm">
                      {call.direction === "inbound"
                        ? "From: " + formatPhone(call.from_number)
                        : "To: " + formatPhone(call.to_number)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {call.disposition ? (
                      <Badge variant="success">{call.disposition.replace(/_/g, " ")}</Badge>
                    ) : (
                      <button onClick={() => handleAddDisposition(call)} className="text-xs text-primary hover:underline">
                        + Disposition
                      </button>
                    )}
                    {call.sentiment && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        call.sentiment === "positive" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : call.sentiment === "negative" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}>{call.sentiment}</span>
                    )}
                  </div>
                </div>

                {/* AI Summary */}
                {call.ai_summary && (
                  <div className="mt-2 bg-primary/5 rounded-md p-2.5">
                    <p className="text-xs font-medium text-primary mb-0.5">AI Summary</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{call.ai_summary}</p>
                  </div>
                )}

                {/* Notes */}
                {call.notes && (
                  <div className="mt-2 bg-bg-muted rounded-md p-2.5">
                    <p className="text-xs font-medium text-text-primary mb-0.5">Notes</p>
                    <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{call.notes}</p>
                  </div>
                )}

                {/* Transcript */}
                {call.transcription && (
                  <details className="mt-2">
                    <summary className="text-xs text-primary cursor-pointer hover:underline">
                      View Transcript
                    </summary>
                    <div className="mt-1 bg-bg-muted rounded-md p-2.5 max-h-40 overflow-y-auto">
                      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{call.transcription}</p>
                    </div>
                  </details>
                )}

                {/* Recording player */}
                {call.recording_url && (
                  <div className="mt-2">
                    <audio controls preload="none" className="w-full h-8" style={{ minHeight: "32px" }}>
                      <source src={call.recording_url} type="audio/mpeg" />
                      <a href={call.recording_url} target="_blank" rel="noopener noreferrer" className="text-xs text-text-link">
                        Download recording
                      </a>
                    </audio>
                  </div>
                )}
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
