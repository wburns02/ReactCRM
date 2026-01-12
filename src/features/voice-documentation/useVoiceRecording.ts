/**
 * Voice Recording Hook
 * Handles audio recording with optional real-time transcription
 */
import { useState, useCallback, useRef, useEffect } from "react";
import type {
  RecordingStatus,
  TranscriptionStatus,
  VoiceNote,
  VoiceRecordingSettings,
} from "./types";
import {
  DEFAULT_VOICE_SETTINGS,
  getSpeechRecognition,
  getSupportedMimeType,
  isAudioRecordingSupported,
  isSpeechRecognitionSupported,
} from "./types";

export interface UseVoiceRecordingOptions {
  /** Custom settings */
  settings?: Partial<VoiceRecordingSettings>;
  /** Called on recording complete */
  onComplete?: (voiceNote: VoiceNote) => void;
  /** Called on transcription update */
  onTranscriptionUpdate?: (text: string, isFinal: boolean) => void;
  /** Called on error */
  onError?: (error: string) => void;
}

export interface UseVoiceRecordingReturn {
  /** Current recording status */
  recordingStatus: RecordingStatus;
  /** Current transcription status */
  transcriptionStatus: TranscriptionStatus;
  /** Whether recording is supported */
  isRecordingSupported: boolean;
  /** Whether transcription is supported */
  isTranscriptionSupported: boolean;
  /** Current transcription text */
  transcription: string;
  /** Current interim transcription */
  interimTranscription: string;
  /** Recording duration in seconds */
  duration: number;
  /** Audio level (0-1) */
  audioLevel: number;
  /** Last completed voice note */
  voiceNote: VoiceNote | null;
  /** Last error message */
  error: string | null;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => void;
  /** Pause recording */
  pauseRecording: () => void;
  /** Resume recording */
  resumeRecording: () => void;
  /** Cancel recording */
  cancelRecording: () => void;
  /** Start transcription only (no recording) */
  startTranscription: () => void;
  /** Stop transcription */
  stopTranscription: () => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for voice recording and transcription
 */
export function useVoiceRecording(
  options: UseVoiceRecordingOptions = {},
): UseVoiceRecordingReturn {
  const {
    settings: customSettings,
    onComplete,
    onTranscriptionUpdate,
    onError,
  } = options;
  const settings = { ...DEFAULT_VOICE_SETTINGS, ...customSettings };

  // State
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("idle");
  const [transcriptionStatus, setTranscriptionStatus] =
    useState<TranscriptionStatus>("idle");
  const [transcription, setTranscription] = useState("");
  const [interimTranscription, setInterimTranscription] = useState("");
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceNote, setVoiceNote] = useState<VoiceNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check browser support
  const isRecordingSupported = isAudioRecordingSupported();
  const isTranscriptionSupported = isSpeechRecognitionSupported();

  /**
   * Clean up resources
   */
  const cleanup = useCallback(() => {
    // Stop media recorder
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Clear intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }

    analyserRef.current = null;
    audioChunksRef.current = [];
  }, []);

  /**
   * Setup audio level monitoring
   */
  const setupAudioLevel = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    levelIntervalRef.current = setInterval(() => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
      }
    }, 100);
  }, []);

  /**
   * Setup speech recognition
   */
  const setupSpeechRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = settings.language;
    recognition.continuous = settings.continuous;
    recognition.interimResults = settings.interimResults;

    recognition.onstart = () => {
      setTranscriptionStatus("listening");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscription((prev) => prev + " " + finalTranscript.trim());
        onTranscriptionUpdate?.(finalTranscript, true);
      }

      setInterimTranscription(interimTranscript);
      if (interimTranscript) {
        onTranscriptionUpdate?.(interimTranscript, false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      // Ignore no-speech errors when continuous
      if (event.error === "no-speech" && settings.continuous) {
        return;
      }

      console.error("Speech recognition error:", event.error);
      setTranscriptionStatus("error");

      if (event.error === "not-allowed") {
        setError("Microphone permission denied");
        onError?.("Microphone permission denied");
      }
    };

    recognition.onend = () => {
      // Restart if still recording and continuous mode
      if (
        recordingStatus === "recording" &&
        settings.continuous &&
        recognitionRef.current
      ) {
        try {
          recognition.start();
        } catch {
          // Ignore if already started
        }
      } else {
        setTranscriptionStatus("idle");
      }
    };

    return recognition;
  }, [settings, recordingStatus, onTranscriptionUpdate, onError]);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    if (!isRecordingSupported) {
      setError("Audio recording is not supported");
      onError?.("Audio recording is not supported");
      return;
    }

    try {
      cleanup();
      setError(null);
      setTranscription("");
      setInterimTranscription("");
      setDuration(0);
      setRecordingStatus("recording");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
        },
      });
      streamRef.current = stream;

      // Setup audio level monitoring
      setupAudioLevel(stream);

      // Setup media recorder
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setRecordingStatus("processing");

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        const note: VoiceNote = {
          id: `voice-${Date.now()}`,
          audioUrl,
          audioBlob,
          transcription: transcription.trim(),
          duration,
          createdAt: new Date().toISOString(),
          isTranscriptionFinal: true,
        };

        setVoiceNote(note);
        setRecordingStatus("complete");
        onComplete?.(note);
      };

      recorder.onerror = () => {
        setRecordingStatus("error");
        setError("Recording failed");
        onError?.("Recording failed");
      };

      // Start recording
      recorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();

      // Setup duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // Check max duration
        if (settings.maxDuration > 0 && elapsed >= settings.maxDuration) {
          stopRecording();
        }
      }, 1000);

      // Setup speech recognition if enabled
      if (settings.autoTranscribe && isTranscriptionSupported) {
        const recognition = setupSpeechRecognition();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
        }
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
      cleanup();
      setRecordingStatus("error");

      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Microphone permission denied");
        onError?.("Microphone permission denied");
      } else {
        setError("Failed to start recording");
        onError?.("Failed to start recording");
      }
    }
  }, [
    isRecordingSupported,
    isTranscriptionSupported,
    settings,
    transcription,
    duration,
    cleanup,
    setupAudioLevel,
    setupSpeechRecognition,
    onComplete,
    onError,
  ]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    setAudioLevel(0);
  }, []);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setRecordingStatus("paused");
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setRecordingStatus("recording");

      // Resume duration counter
      const pausedDuration = duration;
      startTimeRef.current = Date.now() - pausedDuration * 1000;
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 1000);

      // Resume speech recognition
      if (settings.autoTranscribe && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Ignore if already started
        }
      }
    }
  }, [duration, settings.autoTranscribe]);

  /**
   * Cancel recording
   */
  const cancelRecording = useCallback(() => {
    cleanup();
    setRecordingStatus("idle");
    setTranscriptionStatus("idle");
    setTranscription("");
    setInterimTranscription("");
    setDuration(0);
    setAudioLevel(0);
  }, [cleanup]);

  /**
   * Start transcription only (no recording)
   */
  const startTranscription = useCallback(() => {
    if (!isTranscriptionSupported) {
      setError("Speech recognition is not supported");
      onError?.("Speech recognition is not supported");
      return;
    }

    setError(null);
    setTranscription("");
    setInterimTranscription("");

    const recognition = setupSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
    }
  }, [isTranscriptionSupported, setupSpeechRecognition, onError]);

  /**
   * Stop transcription
   */
  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setTranscriptionStatus("idle");
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    cleanup();
    setRecordingStatus("idle");
    setTranscriptionStatus("idle");
    setTranscription("");
    setInterimTranscription("");
    setDuration(0);
    setAudioLevel(0);
    setVoiceNote(null);
    setError(null);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    recordingStatus,
    transcriptionStatus,
    isRecordingSupported,
    isTranscriptionSupported,
    transcription,
    interimTranscription,
    duration,
    audioLevel,
    voiceNote,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    startTranscription,
    stopTranscription,
    reset,
  };
}

export default useVoiceRecording;
