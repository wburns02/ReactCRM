/**
 * Voice Documentation Types
 * Types for voice recording and transcription
 */

/**
 * Voice recording status
 */
export type RecordingStatus =
  | "idle"
  | "recording"
  | "paused"
  | "processing"
  | "complete"
  | "error";

/**
 * Transcription status
 */
export type TranscriptionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "complete"
  | "error";

/**
 * Audio format configuration
 */
export interface AudioConfig {
  mimeType: string;
  audioBitsPerSecond: number;
  sampleRate: number;
}

/**
 * Default audio configuration
 */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  mimeType: "audio/webm;codecs=opus",
  audioBitsPerSecond: 128000,
  sampleRate: 48000,
};

/**
 * Voice note with recording and transcription
 */
export interface VoiceNote {
  id: string;
  /** Audio blob URL */
  audioUrl: string | null;
  /** Audio blob */
  audioBlob: Blob | null;
  /** Transcribed text */
  transcription: string;
  /** Duration in seconds */
  duration: number;
  /** Recording timestamp */
  createdAt: string;
  /** Whether transcription is final or interim */
  isTranscriptionFinal: boolean;
  /** Work order ID if attached */
  workOrderId?: string;
  /** Technician who created it */
  technicianId?: string;
  /** Tags/categories */
  tags?: string[];
}

/**
 * Voice recording settings
 */
export interface VoiceRecordingSettings {
  /** Enable auto-transcription while recording */
  autoTranscribe: boolean;
  /** Enable noise suppression (if supported) */
  noiseSuppression: boolean;
  /** Echo cancellation */
  echoCancellation: boolean;
  /** Language for speech recognition */
  language: string;
  /** Continuous recognition mode */
  continuous: boolean;
  /** Show interim results */
  interimResults: boolean;
  /** Max recording duration in seconds (0 = unlimited) */
  maxDuration: number;
}

/**
 * Default voice recording settings
 */
export const DEFAULT_VOICE_SETTINGS: VoiceRecordingSettings = {
  autoTranscribe: true,
  noiseSuppression: true,
  echoCancellation: true,
  language: "en-US",
  continuous: true,
  interimResults: true,
  maxDuration: 300, // 5 minutes
};

/**
 * Speech recognition result
 */
export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Voice documentation entry for storage
 */
export interface VoiceDocEntry {
  id: string;
  workOrderId?: string;
  customerId?: string;
  technicianId: string;
  audioBase64?: string;
  transcription: string;
  duration: number;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

/**
 * Format duration as MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

/**
 * Check if audio recording is supported
 */
export function isAudioRecordingSupported(): boolean {
  return "MediaRecorder" in window && "getUserMedia" in navigator.mediaDevices;
}

interface WindowWithSpeechRecognition {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
}

/**
 * Get speech recognition constructor
 */
export function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const win = window as unknown as WindowWithSpeechRecognition;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

/**
 * Get supported audio mime type
 */
export function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "audio/webm";
}

/**
 * Convert blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(",")[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 to blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
