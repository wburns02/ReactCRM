import { useState, useEffect, useRef, useCallback } from "react";
import type { ActiveCall } from "@/context/WebPhoneContext";

/**
 * Hook that captures the remote (customer) audio from RingCentral WebRTC calls,
 * streams it to the backend via WebSocket for Google STT transcription,
 * and receives live transcript results back.
 */

interface TranscriptEntry {
  speaker: "customer";
  text: string;
  isFinal: boolean;
  timestamp: string;
}

interface UseRemoteAudioTranscriptReturn {
  customerText: string;
  customerInterim: string;
  isStreaming: boolean;
  isConnected: boolean;
  error: string | null;
}

export function useRemoteAudioTranscript(
  activeCall: ActiveCall | null,
  callEnded: boolean
): UseRemoteAudioTranscriptReturn {
  const [customerText, setCustomerText] = useState("");
  const [customerInterim, setCustomerInterim] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sendWsRef = useRef<WebSocket | null>(null);
  const receiveWsRef = useRef<WebSocket | null>(null);
  const callIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    // Disconnect audio processing
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try { processorRef.current.disconnect(); } catch { /* ignore */ }
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Close WebSockets
    if (sendWsRef.current) {
      sendWsRef.current.close();
      sendWsRef.current = null;
    }
    if (receiveWsRef.current) {
      receiveWsRef.current.close();
      receiveWsRef.current = null;
    }

    setIsStreaming(false);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!activeCall || callEnded) {
      cleanup();
      return;
    }

    // Generate a unique call ID for this session
    const callId = `rc-${Date.now()}-${activeCall.remoteNumber.replace(/\D/g, "")}`;
    callIdRef.current = callId;

    // Derive WebSocket URL from API URL
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const baseUrl = apiUrl.replace(/\/api\/v2\/?$/, "");
    const wsBase = baseUrl.replace(/^http/, "ws");

    // Small delay to let the call establish and audio element appear
    const startTimer = setTimeout(() => {
      startCapture(activeCall, callId, wsBase);
    }, 2000);

    return () => {
      clearTimeout(startTimer);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall, callEnded]);

  async function startCapture(call: ActiveCall, callId: string, wsBase: string) {
    try {
      // 1. Extract remote audio from RingCentral session
      const session = call.session;
      if (!session) {
        setError("No call session");
        return;
      }

      // RingCentral WebPhone v2.x stores remote audio in session.audioElement
      const audioElement = session.audioElement as HTMLAudioElement | undefined;
      const remoteStream = audioElement?.srcObject as MediaStream | null;

      if (!remoteStream || remoteStream.getAudioTracks().length === 0) {
        console.warn("[RemoteAudioTranscript] No remote audio stream available yet, retrying...");
        // Retry after another second
        setTimeout(() => startCapture(call, callId, wsBase), 1000);
        return;
      }

      console.log("[RemoteAudioTranscript] Got remote audio stream, tracks:", remoteStream.getAudioTracks().length);

      // 2. Set up AudioContext to capture PCM audio
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(remoteStream);
      sourceRef.current = source;

      // ScriptProcessorNode to get raw PCM samples
      // Buffer size 4096 at 16kHz = 256ms per chunk
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // 3. Connect to backend — send audio WebSocket
      const sendWs = new WebSocket(`${wsBase}/ws/ringcentral-audio/${callId}`);
      sendWsRef.current = sendWs;

      sendWs.onopen = () => {
        console.log("[RemoteAudioTranscript] Audio send WebSocket connected");
        setIsStreaming(true);
      };

      sendWs.onerror = (e) => {
        console.error("[RemoteAudioTranscript] Audio send WebSocket error:", e);
        setError("Failed to connect audio stream");
      };

      sendWs.onclose = () => {
        setIsStreaming(false);
      };

      // 4. Connect to backend — receive transcript WebSocket
      const receiveWs = new WebSocket(`${wsBase}/ws/call-transcript/${callId}`);
      receiveWsRef.current = receiveWs;

      receiveWs.onopen = () => {
        setIsConnected(true);
      };

      receiveWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TranscriptEntry | { type: string };
          if ("type" in data && data.type === "pong") return;

          const entry = data as TranscriptEntry;
          if (entry.text) {
            if (entry.isFinal) {
              setCustomerText((prev) => (prev ? prev + " " + entry.text : entry.text));
              setCustomerInterim("");
            } else {
              setCustomerInterim(entry.text);
            }
          }
        } catch { /* ignore */ }
      };

      receiveWs.onclose = () => {
        setIsConnected(false);
      };

      // 5. Process audio and send to backend
      processor.onaudioprocess = (e) => {
        if (sendWs.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 PCM to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send as binary
        sendWs.send(pcm16.buffer);
      };

      // Connect the audio pipeline
      source.connect(processor);
      processor.connect(audioContext.destination);

      setError(null);

    } catch (err) {
      console.error("[RemoteAudioTranscript] Failed to start capture:", err);
      setError(err instanceof Error ? err.message : "Failed to capture audio");
    }
  }

  return {
    customerText,
    customerInterim,
    isStreaming,
    isConnected,
    error,
  };
}
