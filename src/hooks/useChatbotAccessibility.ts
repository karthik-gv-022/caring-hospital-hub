import { useState, useEffect, useCallback } from "react";

export type FontSize = "small" | "medium" | "large" | "xlarge";
export type ContrastMode = "normal" | "high";

const STORAGE_KEY = "chatbot-accessibility";

interface AccessibilitySettings {
  fontSize: FontSize;
  contrastMode: ContrastMode;
}

const fontSizeMap: Record<FontSize, string> = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
  xlarge: "text-lg",
};

const fontSizeValues: Record<FontSize, number> = {
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 18,
};

export function useChatbotAccessibility() {
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [contrastMode, setContrastMode] = useState<ContrastMode>("normal");

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings: AccessibilitySettings = JSON.parse(saved);
        setFontSize(settings.fontSize || "medium");
        setContrastMode(settings.contrastMode || "normal");
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    const settings: AccessibilitySettings = { fontSize, contrastMode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [fontSize, contrastMode]);

  const cycleFontSize = useCallback(() => {
    const sizes: FontSize[] = ["small", "medium", "large", "xlarge"];
    const currentIndex = sizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setFontSize(sizes[nextIndex]);
  }, [fontSize]);

  const toggleContrastMode = useCallback(() => {
    setContrastMode((prev) => (prev === "normal" ? "high" : "normal"));
  }, []);

  return {
    fontSize,
    setFontSize,
    contrastMode,
    setContrastMode,
    cycleFontSize,
    toggleContrastMode,
    fontSizeClass: fontSizeMap[fontSize],
    fontSizeValue: fontSizeValues[fontSize],
  };
}
