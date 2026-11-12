import { parse, wcagContrast } from "culori";
import type { Mode } from "./schema";
import type { ResolvedTheme } from "./resolve";

export interface ContrastRule {
  fg: string;
  bg: string;
  /** 4.5 for body text, 3 for large text, icons, chart marks and control boundaries. */
  min: number;
  why: string;
}

const TEXT = 4.5;
const UI = 3;

const surfaces = ["bg", "bg-elevated", "surface", "surface-raised"];

/** The pairs we promise are readable in every theme and mode (WCAG 2.2 AA). */
export const CONTRAST_RULES: ContrastRule[] = [
  ...surfaces.map((bg) => ({ fg: "text", bg, min: TEXT, why: "body text" })),
  ...surfaces.map((bg) => ({ fg: "text-muted", bg, min: TEXT, why: "secondary text" })),
  ...["bg", "surface", "surface-raised"].map((bg) => ({ fg: "accent-text", bg, min: TEXT, why: "links and active nav labels" })),
  { fg: "accent-text", bg: "accent-subtle", min: TEXT, why: "selected chip / active nav item" },
  { fg: "text-on-accent", bg: "accent", min: TEXT, why: "primary button label" },
  { fg: "text-on-accent", bg: "accent-pressed", min: TEXT, why: "pressed button label" },
  ...["success", "warning", "danger", "info"].map((tone) => ({
    fg: tone,
    bg: `${tone}-subtle`,
    min: TEXT,
    why: `${tone} status pill text`,
  })),
  ...["success", "warning", "danger", "info"].map((tone) => ({ fg: tone, bg: "surface", min: UI, why: `${tone} icon on a card` })),
  { fg: "border-strong", bg: "surface", min: UI, why: "input and toggle boundaries" },
  { fg: "border-strong", bg: "bg", min: UI, why: "input boundaries on page background" },
  { fg: "focus-ring", bg: "bg", min: UI, why: "focus ring" },
  { fg: "focus-ring", bg: "surface", min: UI, why: "focus ring on cards" },
  { fg: "accent", bg: "surface", min: UI, why: "accent icon tiles, toggles, chart highlight" },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ fg: `chart-${n}`, bg: "surface", min: UI, why: "chart series on a card" })),
];

export interface ContrastResult extends ContrastRule {
  mode: Mode;
  ratio: number;
  pass: boolean;
  skipped?: string;
}

function isOpaque(value: string): boolean {
  const c = parse(value);
  return !!c && (c.alpha === undefined || c.alpha >= 1);
}

/** True when the string is a CSS colour culori understands (hex, rgb(), hsl(), oklch()…). */
export function isColour(value: string): boolean {
  return parse(value) !== undefined;
}

/** WCAG contrast ratio between two CSS colours (any format culori can parse). */
export function contrastRatio(a: string, b: string): number {
  return Math.round(wcagContrast(a, b) * 100) / 100;
}

/** Check every rule against every supported mode of a resolved theme. */
export function checkContrast(theme: ResolvedTheme, rules: ContrastRule[] = CONTRAST_RULES): ContrastResult[] {
  const results: ContrastResult[] = [];
  for (const mode of theme.modes.supported) {
    const values = theme.values[mode] ?? {};
    for (const rule of rules) {
      const fg = values[`color.${rule.fg}`];
      const bg = values[`color.${rule.bg}`];
      if (!fg || !bg) {
        results.push({ ...rule, mode, ratio: 0, pass: false, skipped: "token missing" });
        continue;
      }
      if (!isOpaque(fg) || !isOpaque(bg)) {
        results.push({ ...rule, mode, ratio: 0, pass: true, skipped: "translucent colour, not checked" });
        continue;
      }
      const ratio = contrastRatio(fg, bg);
      results.push({ ...rule, mode, ratio, pass: ratio >= rule.min });
    }
  }
  return results;
}
