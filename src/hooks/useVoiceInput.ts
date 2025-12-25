import { useState, useCallback, useRef, useEffect } from "react";

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInterface;
    webkitSpeechRecognition: new () => SpeechRecognitionInterface;
  }
}

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: "en-IN", label: "English (India)", flag: "🇮🇳" },
  { code: "ta-IN", label: "தமிழ் (Tamil)", flag: "🇮🇳" },
  { code: "te-IN", label: "తెలుగు (Telugu)", flag: "🇮🇳" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)", flag: "🇮🇳" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)", flag: "🇮🇳" },
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

interface UseVoiceInputOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  language?: LanguageCode;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const {
    onResult,
    onError,
    continuous = false,
    language = "en-IN",
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(language);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = currentLanguage;

      recognitionRef.current.onresult = (event) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        setInterimTranscript(interim);

        if (final) {
          setTranscript((prev) => prev + final);
          onResult?.(final);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        let errorMessage = "Speech recognition error";
        switch (event.error) {
          case "not-allowed":
            errorMessage = "Microphone access denied. Please allow microphone access.";
            break;
          case "no-speech":
            errorMessage = "No speech detected. Please try again.";
            break;
          case "network":
            errorMessage = "Network error. Please check your connection.";
            break;
          case "aborted":
            errorMessage = "Speech recognition was aborted.";
            break;
        }

        onError?.(errorMessage);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, currentLanguage, onResult, onError]);

  // Update language
  const changeLanguage = useCallback((newLanguage: LanguageCode) => {
    if (isListening) {
      recognitionRef.current?.stop();
    }
    setCurrentLanguage(newLanguage);
  }, [isListening]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      setTranscript("");
      setInterimTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      onError?.("Failed to start speech recognition");
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    currentLanguage,
    startListening,
    stopListening,
    toggleListening,
    changeLanguage,
    resetTranscript: () => setTranscript(""),
  };
}
