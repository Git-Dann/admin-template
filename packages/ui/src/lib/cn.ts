import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import type { SemanticColor } from "@gitwork/tokens";

/** Teach tailwind-merge our token names so `h-control` and `h-10` conflict correctly. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "bg", "bg-elevated", "surface", "surface-raised", "border", "border-strong", "text", "text-muted",
        "text-on-accent", "accent", "accent-pressed", "accent-subtle", "accent-text", "secondary",
        "success", "success-subtle", "warning", "warning-subtle", "danger", "danger-subtle", "info", "info-subtle",
        "focus-ring", "overlay", "sidebar", "sidebar-text", "sidebar-text-muted", "sidebar-active", "sidebar-active-text", "sidebar-border", "sidebar-indicator", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6",
      ],
      spacing: ["control", "control-sm", "sidebar", "sidebar-collapsed", "topbar"],
      radius: ["sm", "md", "lg", "xl", "pill"],
      shadow: ["sm", "md", "lg"],
      font: ["display", "body", "mono"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ColorToken = SemanticColor;

/**
 * CSS variable for a token, for places Tailwind classes can't reach (SVG attributes,
 * inline styles, chart libraries). Always use this instead of writing `var(--…)` by hand.
 *   tokenVar("chart-1") → "var(--gw-color-chart-1)"
 */
export function tokenVar(name: ColorToken): string;
export function tokenVar(group: "radius" | "shadow" | "font" | "size" | "space", name: string): string;
export function tokenVar(a: string, b?: string): string {
  return b === undefined ? `var(--gw-color-${a})` : `var(--gw-${a}-${b})`;
}
