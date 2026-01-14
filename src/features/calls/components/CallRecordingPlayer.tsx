import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button.tsx";

interface CallRecordingPlayerProps {
  recordingUrl: string;
  duration?: number;
  className?: string;
}

export function CallRecordingPlayer({
  recordingUrl,
  duration,
  className = "",
}: CallRecordingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-bg-muted rounded-lg ${className}`}
    >
      <audio
        ref={audioRef}
        src={recordingUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        className="h-10 w-10 p-0 rounded-full"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "⏸️" : "▶️"}
      </Button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-text-muted w-10">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={audioDuration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${progress}%, var(--color-bg-tertiary) ${progress}%)`,
            }}
            aria-label="Seek"
          />
        </div>
        <span className="text-xs text-text-muted w-10">
          {formatTime(audioDuration)}
        </span>
      </div>

      {/* Volume button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMute}
        className="h-8 w-8 p-0"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "🔇" : "🔊"}
      </Button>

      {/* External link */}
      <a
        href={recordingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-muted hover:text-text-primary"
        aria-label="Open in new tab"
      >
        🔗
      </a>
    </div>
  );
}
