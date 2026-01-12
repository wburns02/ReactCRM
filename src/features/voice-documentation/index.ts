/**
 * Voice Documentation Feature
 * Voice recording and speech-to-text transcription for field notes
 */

// Types
export type {
  RecordingStatus,
  TranscriptionStatus,
  AudioConfig,
  VoiceNote,
  VoiceRecordingSettings,
  SpeechResult,
  VoiceDocEntry,
} from "./types";

// Utilities
export {
  DEFAULT_AUDIO_CONFIG,
  DEFAULT_VOICE_SETTINGS,
  formatDuration,
  isSpeechRecognitionSupported,
  isAudioRecordingSupported,
  getSpeechRecognition,
  getSupportedMimeType,
  blobToBase64,
  base64ToBlob,
} from "./types";

// Hooks
export {
  useVoiceRecording,
  type UseVoiceRecordingOptions,
  type UseVoiceRecordingReturn,
} from "./useVoiceRecording";

// Components
export { VoiceNotesRecorder } from "./components/VoiceNotesRecorder";
export { DictationField } from "./components/DictationField";
