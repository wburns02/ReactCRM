/**
 * Voice Notes Recorder Component
 * UI for recording voice notes with transcription
 */
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '../useVoiceRecording';
import { formatDuration, type VoiceNote } from '../types';

interface VoiceNotesRecorderProps {
  /** Called when a voice note is saved */
  onSave?: (note: VoiceNote) => void;
  /** Work order ID to associate */
  workOrderId?: string;
  /** Technician ID */
  technicianId?: string;
  /** Compact mode */
  compact?: boolean;
  /** Class name */
  className?: string;
  /** Placeholder text when no transcription */
  placeholder?: string;
  /** Auto-start recording on mount */
  autoStart?: boolean;
  /** Show saved notes list */
  showSavedNotes?: boolean;
}

export function VoiceNotesRecorder({
  onSave,
  workOrderId,
  technicianId,
  compact = false,
  className,
  placeholder = 'Press the microphone to start recording...',
  autoStart = false,
  showSavedNotes = true,
}: VoiceNotesRecorderProps) {
  const [savedNotes, setSavedNotes] = useState<VoiceNote[]>([]);
  const [editingTranscription, setEditingTranscription] = useState(false);
  const [editedText, setEditedText] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);

  const {
    recordingStatus,
    isRecordingSupported,
    isTranscriptionSupported,
    transcription,
    interimTranscription,
    duration,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    reset,
  } = useVoiceRecording({
    settings: { autoTranscribe: true },
    onComplete: (note) => {
      // Add IDs if provided
      const noteWithIds = {
        ...note,
        workOrderId,
        technicianId,
      };
      setSavedNotes((prev) => [noteWithIds, ...prev]);
      onSave?.(noteWithIds);
    },
  });

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && isRecordingSupported) {
      startRecording();
    }
  }, [autoStart, isRecordingSupported, startRecording]);

  const isRecording = recordingStatus === 'recording';
  const isPaused = recordingStatus === 'paused';
  const isProcessing = recordingStatus === 'processing';
  const isComplete = recordingStatus === 'complete';

  const handleMicClick = () => {
    if (isRecording || isPaused) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handlePlayNote = (note: VoiceNote) => {
    if (!note.audioUrl) return;

    if (playingNoteId === note.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingNoteId(null);
    } else {
      // Start playing
      if (audioRef.current) {
        audioRef.current.src = note.audioUrl;
        audioRef.current.play();
        setPlayingNoteId(note.id);
      }
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setSavedNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (playingNoteId === noteId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingNoteId(null);
    }
  };

  const handleEditTranscription = (text: string) => {
    setEditedText(text);
    setEditingTranscription(true);
  };

  const handleSaveEdit = (noteId: string) => {
    setSavedNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, transcription: editedText } : n))
    );
    setEditingTranscription(false);
    setEditedText('');
  };

  // Not supported
  if (!isRecordingSupported) {
    return (
      <Card className={cn('bg-warning/10 border-warning/20', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="font-medium text-text-primary">Voice Recording Not Available</p>
              <p className="text-sm text-text-secondary">
                Your browser doesn't support audio recording.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {/* Mic button */}
        <button
          onClick={handleMicClick}
          disabled={isProcessing}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-all',
            isRecording
              ? 'bg-danger text-white animate-pulse'
              : isPaused
              ? 'bg-warning text-white'
              : 'bg-primary text-white hover:bg-primary-hover'
          )}
        >
          {isRecording || isPaused ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          )}
        </button>

        {/* Transcription preview */}
        <div className="flex-1 min-w-0">
          {isRecording && (
            <div className="flex items-center gap-2">
              <Badge variant="danger" className="animate-pulse">
                {formatDuration(duration)}
              </Badge>
              <div className="h-2 flex-1 bg-bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-sm text-text-secondary truncate">
            {transcription || interimTranscription || placeholder}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            🎙️ Voice Notes
            {!isTranscriptionSupported && (
              <Badge variant="warning" className="text-xs">
                No transcription
              </Badge>
            )}
          </h3>
          {savedNotes.length > 0 && (
            <Badge variant="primary">{savedNotes.length} saved</Badge>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Recording controls */}
        <div className="flex flex-col items-center space-y-4">
          {/* Mic button */}
          <button
            onClick={handleMicClick}
            disabled={isProcessing}
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105',
              isRecording
                ? 'bg-danger text-white shadow-lg shadow-danger/30'
                : isPaused
                ? 'bg-warning text-white'
                : 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover'
            )}
            style={{
              boxShadow: isRecording
                ? `0 0 0 ${audioLevel * 30}px rgba(239, 68, 68, ${audioLevel * 0.3})`
                : undefined,
            }}
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRecording || isPaused ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
              </svg>
            )}
          </button>

          {/* Status text */}
          <div className="text-center">
            {isRecording && (
              <div className="flex items-center gap-2">
                <Badge variant="danger" className="animate-pulse">
                  Recording
                </Badge>
                <span className="text-lg font-mono font-bold">
                  {formatDuration(duration)}
                </span>
              </div>
            )}
            {isPaused && (
              <Badge variant="warning">Paused - {formatDuration(duration)}</Badge>
            )}
            {isProcessing && (
              <Badge variant="primary">Processing...</Badge>
            )}
            {isComplete && (
              <Badge variant="success">Saved!</Badge>
            )}
            {recordingStatus === 'idle' && (
              <p className="text-sm text-text-muted">Tap to start recording</p>
            )}
          </div>

          {/* Pause/Resume buttons */}
          {(isRecording || isPaused) && (
            <div className="flex items-center gap-2">
              {isRecording && (
                <Button variant="secondary" size="sm" onClick={pauseRecording}>
                  Pause
                </Button>
              )}
              {isPaused && (
                <Button variant="secondary" size="sm" onClick={resumeRecording}>
                  Resume
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={cancelRecording}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Audio level visualization */}
        {isRecording && (
          <div className="flex items-center gap-1 justify-center h-8">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full transition-all"
                style={{
                  height: `${Math.max(4, Math.random() * audioLevel * 32)}px`,
                  opacity: audioLevel > 0.1 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        )}

        {/* Live transcription */}
        {(transcription || interimTranscription) && (
          <div className="p-3 bg-bg-muted rounded-lg">
            <p className="text-sm text-text-secondary mb-1">Transcription:</p>
            <p className="text-text-primary">
              {transcription}
              {interimTranscription && (
                <span className="text-text-muted italic"> {interimTranscription}</span>
              )}
            </p>
          </div>
        )}

        {/* Saved notes */}
        {showSavedNotes && savedNotes.length > 0 && (
          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-sm font-medium text-text-primary">Recent Notes</h4>
            {savedNotes.slice(0, 5).map((note) => (
              <div
                key={note.id}
                className="p-3 border border-border rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlayNote(note)}
                      disabled={!note.audioUrl}
                    >
                      {playingNoteId === note.id ? '⏹️' : '▶️'}
                    </Button>
                    <span className="text-sm text-text-muted">
                      {formatDuration(note.duration)}
                    </span>
                    <span className="text-xs text-text-muted">
                      {new Date(note.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-danger hover:text-danger"
                  >
                    🗑️
                  </Button>
                </div>
                {editingTranscription && editedText !== '' ? (
                  <div className="flex gap-2">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="flex-1 p-2 text-sm border border-border rounded resize-none"
                      rows={2}
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveEdit(note.id)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTranscription(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm text-text-secondary cursor-pointer hover:bg-bg-hover p-1 rounded"
                    onClick={() => handleEditTranscription(note.transcription)}
                  >
                    {note.transcription || (
                      <span className="italic text-text-muted">
                        No transcription (click to add)
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hidden audio element for playback */}
        <audio
          ref={audioRef}
          onEnded={() => setPlayingNoteId(null)}
          className="hidden"
        />

        {/* Reset button */}
        {isComplete && (
          <Button variant="secondary" className="w-full" onClick={reset}>
            Record Another
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default VoiceNotesRecorder;
