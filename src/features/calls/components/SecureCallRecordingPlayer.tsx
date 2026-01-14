import { CallRecordingPlayer } from "./CallRecordingPlayer.tsx";
import { useCallRecording, getSecureRecordingUrl } from "../api/recordings.ts";
import { Loader2, AlertCircle, Mic } from "lucide-react";

interface SecureCallRecordingPlayerProps {
  callId: string;
  className?: string;
}

export function SecureCallRecordingPlayer({
  callId,
  className = "",
}: SecureCallRecordingPlayerProps) {
  const { data: recording, isLoading, error } = useCallRecording(callId);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-bg-muted rounded-lg ${className}`}>
        <Mic className="w-5 h-5 text-text-muted" />
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-text-muted">Loading recording...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-bg-muted rounded-lg ${className}`}>
        <AlertCircle className="w-5 h-5 text-destructive" />
        <span className="text-text-muted">Recording not available</span>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-bg-muted rounded-lg ${className}`}>
        <Mic className="w-5 h-5 text-text-muted" />
        <span className="text-text-muted">No recording found</span>
      </div>
    );
  }

  const secureUrl = getSecureRecordingUrl(recording.secure_url);

  return (
    <CallRecordingPlayer
      recordingUrl={secureUrl}
      duration={recording.duration}
      className={className}
    />
  );
}