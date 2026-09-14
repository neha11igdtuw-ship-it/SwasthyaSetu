"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
}

const SPEECH_LANG_BY_APP_LANGUAGE: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  local: "hi-IN",
};

/** Keep restarting through Chrome's ~2–3s no-speech cutoff until this cap. */
const MAX_LISTEN_MS = 120_000;
const RESTART_DELAY_MS = 280;

function joinTranscript(base: string, extra: string): string {
  return `${base} ${extra}`.replace(/\s+/g, " ").trim();
}

export interface UseSpeechRecognitionOptions {
  language: string;
  getText: () => string;
  isPlaceholder?: (text: string) => boolean;
  onText: (text: string) => void;
}

/**
 * Browser speech recognition that stays open through short pauses and
 * always appends to existing text instead of replacing it.
 */
export function useSpeechRecognition({
  language,
  getText,
  isPlaceholder,
  onText,
}: UseSpeechRecognitionOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isRecordingRef = useRef(false);
  const committedRef = useRef("");
  const lastLiveRef = useRef("");
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartedAtRef = useRef(0);
  const onTextRef = useRef(onText);
  const getTextRef = useRef(getText);
  const isPlaceholderRef = useRef(isPlaceholder);
  const languageRef = useRef(language);

  onTextRef.current = onText;
  getTextRef.current = getText;
  isPlaceholderRef.current = isPlaceholder;
  languageRef.current = language;

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const emit = (text: string) => {
    lastLiveRef.current = text;
    onTextRef.current(text);
  };

  const stopInternal = useCallback((abort = false) => {
    isRecordingRef.current = false;
    clearRestartTimer();
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = () => {};
      rec.onerror = () => {};
      rec.onend = () => {};
      try {
        if (abort) rec.abort();
        else rec.stop();
      } catch {
        // ignore
      }
    }
    const flushed = lastLiveRef.current || committedRef.current;
    if (flushed) {
      committedRef.current = flushed;
      emit(flushed);
    }
    setIsRecording(false);
  }, []);

  const attachHandlers = useCallback((recognition: SpeechRecognitionInstance) => {
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finals = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const piece = res[0]?.transcript || "";
        if (res.isFinal) finals += `${piece} `;
        else interim += piece;
      }
      if (finals.trim()) {
        committedRef.current = joinTranscript(committedRef.current, finals);
      }
      emit(joinTranscript(committedRef.current, interim));
    };

    recognition.onerror = (evt: SpeechRecognitionErrorEvent) => {
      if (evt.error === "no-speech" || evt.error === "aborted") return;
      if (evt.error === "not-allowed" || evt.error === "service-not-allowed") {
        setSpeechError(
          "Microphone access blocked. Please allow microphone permissions in your browser or type symptoms below."
        );
        stopInternal(true);
        return;
      }
      if (evt.error === "network") {
        setSpeechError("Voice recognition lost network. Your text is kept — tap the mic to continue.");
      }
    };

    recognition.onend = () => {
      if (!isRecordingRef.current) {
        setIsRecording(false);
        return;
      }
      // Persist interim words before Chrome tears the session down.
      if (lastLiveRef.current) {
        committedRef.current = lastLiveRef.current;
      }
      const elapsed = Date.now() - sessionStartedAtRef.current;
      if (elapsed >= MAX_LISTEN_MS) {
        stopInternal(false);
        return;
      }
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (!isRecordingRef.current) return;
        try {
          recognition.start();
        } catch {
          // InvalidStateError if a start is already in flight — ignore.
        }
      }, RESTART_DELAY_MS);
    };
  }, [stopInternal]);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isRecordingRef.current) return;

    const win = window as unknown as WindowWithSpeech;
    const SpeechClass = win.webkitSpeechRecognition || win.SpeechRecognition;
    if (!SpeechClass) {
      setSpeechError(
        "Voice recognition is not supported in this browser. Please type your symptoms below."
      );
      return;
    }

    const current = (getTextRef.current() || "").trim();
    const placeholder = isPlaceholderRef.current?.(current) ?? false;
    committedRef.current = placeholder ? "" : current;
    lastLiveRef.current = committedRef.current;

    setSpeechError(null);
    try {
      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      try {
        recognition.maxAlternatives = 1;
      } catch {
        // some engines do not expose maxAlternatives
      }
      recognition.lang = SPEECH_LANG_BY_APP_LANGUAGE[languageRef.current] || "en-IN";
      attachHandlers(recognition);
      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      sessionStartedAtRef.current = Date.now();
      setIsRecording(true);
      recognition.start();
    } catch (e) {
      console.warn("Failed to initialize speech recognition:", e);
      setSpeechError("Could not access microphone. Please try typing your symptoms.");
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [attachHandlers]);

  const stop = useCallback(() => {
    stopInternal(false);
  }, [stopInternal]);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      clearRestartTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return { isRecording, speechError, start, stop };
}
