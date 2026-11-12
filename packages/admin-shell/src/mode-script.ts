/** Server-safe: used by the root layout before any client code runs. */
export type ThemeMode = "light" | "dark";
export const MODE_STORAGE_KEY = "gw-mode";

/**
 * Inline script for <head>: applies the saved mode before first paint (no flash).
 * Only modes the theme supports are accepted.
 */
export function modeScript(supported: readonly ThemeMode[]): string {
  return `(function(){try{var m=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});if(${JSON.stringify(supported)}.indexOf(m)>-1)document.documentElement.dataset.mode=m;}catch(e){}})();`;
}
