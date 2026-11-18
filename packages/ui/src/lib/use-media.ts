"use client";

import { useMemo, useSyncExternalStore } from "react";

/** Phones and small tablets: below Tailwind's `md` breakpoint. */
export const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

/** Live media query match. Renders the desktop layout on the server and in tests. */
export function useMediaQuery(query: string): boolean {
  const sub = useMemo(() => subscribe(query), [query]);
  return useSyncExternalStore(
    sub,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** True on phones: switch tables to cards, matrices to lists, chip rows to selects. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
