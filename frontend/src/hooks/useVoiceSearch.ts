'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// SpeechRecognition types (not in standard TS lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface UseVoiceSearchOptions {
  lang?: string;
  onResult?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  autoStopTimeout?: number;
}

interface UseVoiceSearchReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}

const ERROR_MESSAGES: Record<string, string | null> = {
  'not-allowed': 'Microphone access denied. Please enable it in your browser settings.',
  'no-speech': 'No speech detected. Please try again.',
  'audio-capture': 'No microphone found. Please check your device.',
  'network': 'Voice search requires HTTPS or localhost. Check your connection.',
  'aborted': null,
  'service-not-allowed': 'Speech recognition service unavailable.',
};

function isEdgeBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Edg\//i.test(navigator.userAgent);
}

export function useVoiceSearch(options: UseVoiceSearchOptions = {}): UseVoiceSearchReturn {
  const { lang = 'en-NZ', onResult, onInterim, autoStopTimeout = 5000 } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  // Detect support on mount — exclude Edge (unreliable Web Speech API on macOS)
  useEffect(() => {
    const hasSpeechAPI =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setIsSupported(hasSpeechAPI && !isEdgeBrowser());
  }, []);

  const clearAutoStopTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearAutoStopTimeout();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [clearAutoStopTimeout]);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    setError(null);
    setTranscript('');

    if (!recognitionRef.current) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = lang;
    }

    const recognition = recognitionRef.current;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        onResultRef.current?.(finalTranscript);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
        onInterimRef.current?.(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const message =
        ERROR_MESSAGES[event.error] ?? 'Something went wrong. Please try again.';
      if (message) setError(message);
      setIsListening(false);
      clearAutoStopTimeout();
    };

    recognition.onend = () => {
      setIsListening(false);
      clearAutoStopTimeout();
    };

    recognition.start();

    timeoutRef.current = setTimeout(() => {
      stopListening();
    }, autoStopTimeout);
  }, [isSupported, lang, autoStopTimeout, clearAutoStopTimeout, stopListening]);

  useEffect(() => {
    return () => {
      clearAutoStopTimeout();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [clearAutoStopTimeout]);

  return { isListening, isSupported, transcript, error, startListening, stopListening };
}
