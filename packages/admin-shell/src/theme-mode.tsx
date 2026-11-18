"use client";

import { useCallback, useSyncExternalStore } from "react";

import { MODE_STORAGE_KEY, type ThemeMode } from "./mode-script";

export { MODE_STORAGE_KEY, modeScript, type ThemeMode } from "./mode-script";

function read(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.mode === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode", "data-theme"] });
  return () => observer.disconnect();
}

/** Current light/dark mode and a setter that persists the choice. */
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => "light" as ThemeMode);
  const set = useCallback((next: ThemeMode) => {
    document.documentElement.dataset.mode = next;
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      /* storage blocked */
    }
  }, []);
  return [mode, set];
}
