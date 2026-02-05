/**
 * Voice Memo Recorder Component
 * Record and transcribe voice memos using Whisper AI on R730
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogBody } from "@/components/ui/Dialog";
import {
  useLocalAIHealth,
  useAudioUploadTranscriptionMutation,
} from "@/hooks/useLocalAI";

interface VoiceMemoRecorderProps {
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onRecordingComplete?: (audioBlob: Blob) => void;
  className?: string;
  maxDurationSeconds?: number;
}

interface TranscriptionResult {
  transcript: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
  duration_seconds: number;
}

type RecordingState =
  | "idle"
  | "recording"
  | "paused"
  | "recorded"
  | "transcribing"
  | "complete";

/**
 * Voice memo recorder with AI transcription
 */
export function VoiceMemoRecorder({
  onTranscriptionComplete,
  onRecordingComplete,
  className = "",
  maxDurationSeconds = 300, // 5 minutes default
}: VoiceMemoRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: aiHealth } = useLocalAIHealth();
  const transcriptionMutation = useAudioUploadTranscriptionMutation();

  const isAIAvailable =
    aiHealth?.status === "healthy" || aiHealth?.status === "degraded";

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordingState("recorded");

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecordingState("recording");
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDurationSeconds) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  }, [maxDurationSeconds, onRecordingComplete]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setRecordingState("paused");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  // Transcribe the recording
  const transcribeRecording = useCallback(async () => {
    if (!audioBlob) return;

    setRecordingState("transcribing");
    setError(null);

    try {
      // Determine file extension from blob type
      const ext = audioBlob.type.includes("webm")
        ? "webm"
        : audioBlob.type.includes("mp4")
          ? "m4a"
          : "webm";
      const filename = `recording.${ext}`;

      // Upload and transcribe using the API
      const result = await transcriptionMutation.mutateAsync({
        file: audioBlob,
        language: "en",
        filename,
      });

      const transcriptionResult: TranscriptionResult = {
        transcript: result.transcript || "",
        language: result.language,
        duration_seconds: result.duration_seconds || duration,
        segments: result.segments,
      };

      setTranscription(transcriptionResult);
      setRecordingState("complete");

      if (onTranscriptionComplete) {
        onTranscriptionComplete(transcriptionResult);
      }
    } catch (err) {
      console.error("Transcription failed:", err);
      setError("Failed to transcribe audio. Please try again.");
      setRecordingState("recorded");
    }
  }, [audioBlob, duration, onTranscriptionComplete, transcriptionMutation]);

  // Reset everything
  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (timerRef.current) clearInterval(timerRef.current);

    setRecordingState("idle");
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setTranscription(null);
    setError(null);
    audioChunksRef.current = [];
  }, [audioUrl]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Play/pause audio preview
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Voice Memo
          </span>
          {aiHealth && (
            <Badge variant={isAIAvailable ? "success" : "secondary"}>
              {isAIAvailable ? "Whisper Ready" : "AI Offline"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex flex-col items-center gap-4">
          {/* Duration Display */}
          <div className="text-3xl font-mono text-text-primary">
            {formatDuration(duration)}
            {recordingState === "recording" && (
              <span className="ml-2 inline-block w-2 h-2 bg-danger rounded-full animate-pulse" />
            )}
          </div>

          {/* Max duration warning */}
          {recordingState === "recording" &&
            duration > maxDurationSeconds - 30 && (
              <p className="text-xs text-warning">
                {maxDurationSeconds - duration} seconds remaining
              </p>
            )}

          {/* Control Buttons */}
          <div className="flex items-center gap-3">
            {recordingState === "idle" && (
              <Button
                variant="primary"
                size="lg"
                onClick={startRecording}
                className="rounded-full w-16 h-16"
              >
                <Mic className="w-6 h-6" />
              </Button>
            )}

            {recordingState === "recording" && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={pauseRecording}
                  className="rounded-full w-12 h-12"
                >
                  <Pause className="w-5 h-5" />
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={stopRecording}
                  className="rounded-full w-16 h-16"
                >
                  <Square className="w-6 h-6" />
                </Button>
              </>
            )}

            {recordingState === "paused" && (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={resumeRecording}
                  className="rounded-full w-12 h-12"
                >
                  <Mic className="w-5 h-5" />
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={stopRecording}
                  className="rounded-full w-16 h-16"
                >
                  <Square className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>

          {/* Status Text */}
          <p className="text-sm text-text-muted">
            {recordingState === "idle" && "Tap to start recording"}
            {recordingState === "recording" &&
              "Recording... Tap square to stop"}
            {recordingState === "paused" && "Paused - tap mic to resume"}
            {recordingState === "transcribing" &&
              "Transcribing with Whisper AI..."}
          </p>
        </div>

        {/* Audio Preview */}
        {audioUrl &&
          recordingState !== "idle" &&
          recordingState !== "recording" &&
          recordingState !== "paused" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
                <audio ref={audioRef} src={audioUrl} className="hidden" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePlayback}
                  className="rounded-full"
                >
                  <Play className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <p className="text-sm text-text-primary">Voice Memo</p>
                  <p className="text-xs text-text-muted">
                    {formatDuration(duration)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-text-muted hover:text-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Transcribe Button */}
              {recordingState === "recorded" && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={transcribeRecording}
                  disabled={!isAIAvailable}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Transcribe with AI
                </Button>
              )}

              {/* Transcribing State */}
              {recordingState === "transcribing" && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-text-secondary">
                    Processing audio...
                  </span>
                </div>
              )}
            </div>
          )}

        {/* Transcription Result */}
        {transcription && recordingState === "complete" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <h4 className="text-sm font-medium text-text-primary">
                Transcription
              </h4>
            </div>
            <div className="p-3 bg-bg-muted rounded-lg">
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {transcription.transcript}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                <span>Language: {transcription.language}</span>
                <span>•</span>
                <span>
                  Duration:{" "}
                  {formatDuration(Math.round(transcription.duration_seconds))}
                </span>
              </div>
            </div>

            {/* Segments (if available) */}
            {transcription.segments && transcription.segments.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-text-muted uppercase hover:text-text-primary">
                  Timestamped Segments ({transcription.segments.length})
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {transcription.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="flex gap-2 text-xs p-2 bg-bg-muted/50 rounded"
                    >
                      <span className="text-text-muted font-mono">
                        {formatDuration(Math.round(segment.start))}
                      </span>
                      <span className="text-text-secondary">
                        {segment.text}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Actions */}
            <Button variant="outline" className="w-full" onClick={reset}>
              <Mic className="w-4 h-4 mr-2" />
              Record Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact voice recorder button for inline use.
 * Opens a Dialog containing the full VoiceMemoRecorder component.
 */
export function VoiceRecordButton({
  onTranscriptionComplete,
  disabled = false,
}: {
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTranscriptionComplete = useCallback(
    (result: TranscriptionResult) => {
      onTranscriptionComplete?.(result);
      setIsOpen(false);
    },
    [onTranscriptionComplete],
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <Mic className="w-4 h-4 mr-1" />
        Voice Memo
      </Button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} ariaLabel="Voice Memo Recorder">
        <DialogContent size="lg">
          <DialogHeader onClose={() => setIsOpen(false)}>Voice Memo</DialogHeader>
          <DialogBody>
            <VoiceMemoRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              className="shadow-none border-0"
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default VoiceMemoRecorder;
