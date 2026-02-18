import { useState } from "react";
import {
  useCall,
  useCallDispositions,
  useSetCallDisposition,
} from "../api/calls.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatDate, formatPhone, formatDurationSeconds } from "@/lib/utils.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast";

interface CallDetailsProps {
  callId: number;
  onClose?: () => void;
}

export function CallDetails({ callId, onClose }: CallDetailsProps) {
  const { data: call, isLoading, error } = useCall(callId);
  const { data: dispositions } = useCallDispositions();
  const setDisposition = useSetCallDisposition();

  const [showDispositionPicker, setShowDispositionPicker] = useState(false);
  const [notes, setNotes] = useState("");


  const handleSetDisposition = async (dispositionName: string) => {
    try {
      await setDisposition.mutateAsync({
        callId,
        disposition: dispositionName,
        notes: notes || undefined,
      });
      setShowDispositionPicker(false);
      setNotes("");
      toastSuccess("Disposition saved");
    } catch {
      toastError("Failed to set disposition");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-bg-muted rounded w-1/3" />
            <div className="h-4 bg-bg-muted rounded w-2/3" />
            <div className="h-4 bg-bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !call) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-text-error">
            <p>Failed to load call details</p>
            {onClose && (
              <Button variant="ghost" onClick={onClose} className="mt-4">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {call.direction === "inbound" ? "📥" : "📤"}
          Call Details
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-text-muted mb-1">From</p>
            <p className="text-lg font-mono">
              {formatPhone(call.caller_number)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-muted mb-1">To</p>
            <p className="text-lg font-mono">
              {formatPhone(call.called_number)}
            </p>
          </div>
        </div>

        {/* Call info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <div>
              <p className="text-sm text-text-muted">Date</p>
              <p className="font-medium">
                {call.call_date ? formatDate(call.call_date) : "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <div>
              <p className="text-sm text-text-muted">Duration</p>
              <p className="font-medium">
                {formatDurationSeconds(call.duration_seconds)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span>📞</span>
            <div>
              <p className="text-sm text-text-muted">Direction</p>
              <Badge
                variant={call.direction === "inbound" ? "success" : "info"}
              >
                {call.direction}
              </Badge>
            </div>
          </div>
        </div>

        {/* Answered by */}
        {call.answered_by && (
          <div className="flex items-center gap-2">
            <span>👤</span>
            <div>
              <p className="text-sm text-text-muted">Answered By</p>
              <p className="font-medium">{call.answered_by}</p>
            </div>
          </div>
        )}

        {/* Recording */}
        {call.recording_url && (
          <div className="flex items-center gap-2">
            <span>🎙️</span>
            <div>
              <p className="text-sm text-text-muted">Recording</p>
              <a
                href={call.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Listen to recording
              </a>
            </div>
          </div>
        )}

        {/* Disposition */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>🏷️</span>
              <p className="text-sm font-medium text-text-muted">Disposition</p>
            </div>
            {!showDispositionPicker && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDispositionPicker(true)}
              >
                {call.call_disposition ? "Change" : "Set Disposition"}
              </Button>
            )}
          </div>

          {call.call_disposition && !showDispositionPicker && (
            <Badge className="text-base py-1 px-3">
              {call.call_disposition}
            </Badge>
          )}

          {showDispositionPicker && (
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <div className="grid grid-cols-3 gap-2">
                {dispositions?.map((disp) => (
                  <button
                    key={disp.id}
                    onClick={() => handleSetDisposition(disp.name)}
                    disabled={setDisposition.isPending}
                    className={`
                      p-2 rounded-md border text-sm font-medium transition-colors
                      ${
                        call.call_disposition === disp.name
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-bg-hover"
                      }
                    `}
                    style={{
                      borderColor:
                        call.call_disposition === disp.name
                          ? disp.color
                          : undefined,
                    }}
                  >
                    {disp.name}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="notes" className="text-sm text-text-muted">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded-md bg-bg-primary text-text-primary"
                  rows={2}
                  placeholder="Add notes about this call..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDispositionPicker(false);
                    setNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {call.notes && !showDispositionPicker && (
          <div>
            <p className="text-sm font-medium text-text-muted mb-1">Notes</p>
            <p className="text-text-primary whitespace-pre-wrap">
              {call.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
