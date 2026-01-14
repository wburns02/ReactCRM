/**
 * VoiceCallLog Component
 *
 * Display call history for a work order with recording playback and notes.
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useVoiceCallLog,
  useAddCallNote,
  type VoiceCall,
} from "./hooks/useCommunications.ts";

interface VoiceCallLogProps {
  workOrderId: string;
}

const STATUS_COLORS: Record<
  VoiceCall["status"],
  "success" | "warning" | "danger" | "default"
> = {
  completed: "success",
  missed: "danger",
  voicemail: "warning",
  busy: "warning",
  failed: "danger",
};

const STATUS_LABELS: Record<VoiceCall["status"], string> = {
  completed: "Completed",
  missed: "Missed",
  voicemail: "Voicemail",
  busy: "Busy",
  failed: "Failed",
};

export function VoiceCallLog({ workOrderId }: VoiceCallLogProps) {
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);

  const { data, isLoading, error } = useVoiceCallLog(workOrderId);
  const addNote = useAddCallNote();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  const handleSaveNotes = async () => {
    if (!selectedCall) return;

    try {
      await addNote.mutateAsync({
        callId: selectedCall.id,
        workOrderId,
        notes,
      });
      setEditingNotes(false);
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
  };

  const handlePlayRecording = (callId: string, _recordingUrl: string) => {
    if (playingRecording === callId) {
      setPlayingRecording(null);
    } else {
      setPlayingRecording(callId);
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-danger">
          <p>Failed to load call history</p>
          <p className="text-sm text-text-secondary mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Call History</h3>
          <p className="text-sm text-text-secondary">
            {data?.total ?? 0} calls for this work order
          </p>
        </div>
      </div>

      {/* Call list */}
      <div className="space-y-2">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))
        ) : !data?.items?.length ? (
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
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <p>No calls recorded</p>
              <p className="text-sm mt-1">Call history will appear here</p>
            </div>
          </Card>
        ) : (
          data.items.map((call) => (
            <Card
              key={call.id}
              className="p-4 hover:bg-surface-secondary/50 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedCall(call);
                setNotes(call.notes || "");
              }}
            >
              <div className="flex items-center gap-4">
                {/* Direction icon */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${
                      call.direction === "inbound"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-blue-500/10 text-blue-500"
                    }
                  `}
                >
                  {call.direction === "inbound" ? (
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
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
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
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                  )}
                </div>

                {/* Call details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {call.direction === "inbound" ? "Incoming" : "Outgoing"}{" "}
                      Call
                    </span>
                    <Badge variant={STATUS_COLORS[call.status]}>
                      {STATUS_LABELS[call.status]}
                    </Badge>
                    {call.recordingUrl && (
                      <svg
                        className="w-4 h-4 text-text-secondary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                    <span>
                      {call.direction === "inbound"
                        ? call.fromPhone
                        : call.toPhone}
                    </span>
                    <span>{formatTimestamp(call.timestamp)}</span>
                    {call.duration > 0 && (
                      <span>{formatDuration(call.duration)}</span>
                    )}
                  </div>
                  {call.notes && (
                    <p className="text-sm text-text-secondary mt-1 truncate">
                      {call.notes}
                    </p>
                  )}
                </div>

                {/* Recording playback */}
                {call.recordingUrl && call.status === "completed" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayRecording(call.id, call.recordingUrl!);
                    }}
                  >
                    {playingRecording === call.id ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </Button>
                )}

                {/* Chevron */}
                <svg
                  className="w-5 h-5 text-text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>

              {/* Audio player */}
              {playingRecording === call.id && call.recordingUrl && (
                <div className="mt-4 pt-4 border-t border-border">
                  <audio
                    controls
                    autoPlay
                    className="w-full"
                    onEnded={() => setPlayingRecording(null)}
                  >
                    <source src={call.recordingUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Call detail dialog */}
      <Dialog open={!!selectedCall} onClose={() => setSelectedCall(null)}>
        <DialogContent size="md">
          <DialogHeader onClose={() => setSelectedCall(null)}>
            Call Details
          </DialogHeader>
          <DialogBody>
            {selectedCall && (
              <div className="space-y-4">
                {/* Call info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Direction</p>
                    <p className="font-medium">
                      {selectedCall.direction === "inbound"
                        ? "Incoming"
                        : "Outgoing"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Status</p>
                    <Badge variant={STATUS_COLORS[selectedCall.status]}>
                      {STATUS_LABELS[selectedCall.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">From</p>
                    <p className="font-medium">{selectedCall.fromPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">To</p>
                    <p className="font-medium">{selectedCall.toPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Duration</p>
                    <p className="font-medium">
                      {formatDuration(selectedCall.duration)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Time</p>
                    <p className="font-medium">
                      {formatTimestamp(selectedCall.timestamp)}
                    </p>
                  </div>
                  {selectedCall.agentName && (
                    <div className="col-span-2">
                      <p className="text-sm text-text-secondary">Agent</p>
                      <p className="font-medium">{selectedCall.agentName}</p>
                    </div>
                  )}
                </div>

                {/* Recording */}
                {selectedCall.recordingUrl && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Recording</p>
                    <audio controls className="w-full">
                      <source
                        src={selectedCall.recordingUrl}
                        type="audio/mpeg"
                      />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Transcription */}
                {selectedCall.transcription && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Transcription</p>
                    <div className="bg-surface-secondary p-3 rounded-lg text-sm">
                      {selectedCall.transcription}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Notes</p>
                    {!editingNotes && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingNotes(true)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this call..."
                        rows={4}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingNotes(false);
                            setNotes(selectedCall.notes || "");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={addNote.isPending}
                        >
                          {addNote.isPending ? "Saving..." : "Save Notes"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface-secondary p-3 rounded-lg text-sm min-h-[80px]">
                      {selectedCall.notes || (
                        <span className="text-text-secondary italic">
                          No notes added
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelectedCall(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VoiceCallLog;
