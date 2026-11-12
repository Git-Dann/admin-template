"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";
export const MODE_STORAGE_KEY = "gw-mode";

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

/**
 * Inline script for <head>: applies the saved mode before first paint (no flash).
 * Only modes the theme supports are accepted.
 */
export function modeScript(supported: readonly ThemeMode[]): string {
  return `(function(){try{var m=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});if(${JSON.stringify(supported)}.indexOf(m)>-1)document.documentElement.dataset.mode=m;}catch(e){}})();`;
}
