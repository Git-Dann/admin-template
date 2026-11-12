/**
 * Pure theme-builder logic: asset validation, colour token import, native icon
 * release status and seasonal CSS. No React, no DOM (except where noted), fully testable.
 */
import {
  checkContrast,
  isColour,
  isFigmaRestExport,
  mapFigmaVariables,
  readFigmaVariables,
  SEMANTIC_COLORS,
  type Mode,
  type ResolvedTheme,
} from "@gitwork/tokens";
import type { AppBuild, ColourOverrides, SeasonalTheme } from "@gitwork/data";

/* ------------------------------ Lottie splash ------------------------------ */

export interface LottieCheck {
  error?: string;
  warning?: string;
  meta?: string;
}

/** Validate a Lottie (Bodymovin) JSON document. */
export function validateLottie(json: unknown, { maxSeconds = 5 } = {}): LottieCheck {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return { error: "That isn't a Lottie file: expected a JSON object." };
  const doc = json as Record<string, unknown>;
  const missing = ["v", "fr", "ip", "op", "w", "h", "layers"].filter((k) => !(k in doc));
  if (missing.length) return { error: `Not a Lottie file: missing ${missing.map((m) => `"${m}"`).join(", ")}.` };
  if (!Array.isArray(doc.layers)) return { error: 'Not a Lottie file: "layers" should be a list.' };
  const fr = Number(doc.fr);
  const seconds = (Number(doc.op) - Number(doc.ip)) / fr;
  if (!(fr > 0) || !(seconds > 0)) return { error: "The animation has no frames. Check the in and out points." };
  const w = Number(doc.w);
  const h = Number(doc.h);
  const meta = `Lottie ${String(doc.v)} · ${w}×${h} · ${seconds.toFixed(1)}s · ${Math.round(fr)}fps`;
  if (Array.isArray(doc.assets) && (doc.assets as Array<Record<string, unknown>>).some((a) => typeof a.p === "string" && !String(a.p).startsWith("data:") && a.e !== 1)) {
    return { error: "The animation links to external images. Export with images embedded (Bodymovin: “Include in json”).", meta };
  }
  if (seconds > maxSeconds) return { warning: `Runs for ${seconds.toFixed(1)}s. Splash animations should be ${maxSeconds}s or less.`, meta };
  if (w > h) return { warning: "Landscape animation. Splash screens are portrait on phones.", meta };
  return { meta };
}

/* --------------------------------- images --------------------------------- */

export interface ImageRule {
  minWidth: number;
  minHeight: number;
  /** "square", "portrait", "landscape" */
  shape?: "square" | "portrait" | "landscape";
  label: string;
}

export const IMAGE_RULES = {
  appIcon: { minWidth: 1024, minHeight: 1024, shape: "square", label: "1024×1024 PNG" },
  splashFallback: { minWidth: 1080, minHeight: 1920, shape: "portrait", label: "1080×1920 or larger, portrait" },
  backgroundMobile: { minWidth: 1170, minHeight: 2532, shape: "portrait", label: "1170×2532 or larger, portrait" },
  backgroundDesktop: { minWidth: 1920, minHeight: 1080, shape: "landscape", label: "1920×1080 or larger, landscape" },
} satisfies Record<string, ImageRule>;

export function checkImageSize(width: number, height: number, rule: ImageRule): { error?: string; meta: string } {
  const meta = `${width}×${height}`;
  if (rule.shape === "square" && width !== height) return { error: `Must be square. This is ${meta}.`, meta };
  if (rule.shape === "portrait" && width >= height) return { error: `Must be portrait. This is ${meta}.`, meta };
  if (rule.shape === "landscape" && width <= height) return { error: `Must be landscape. This is ${meta}.`, meta };
  if (width < rule.minWidth || height < rule.minHeight) return { error: `Too small: ${meta}. Needs ${rule.label}.`, meta };
  return { meta };
}

/* ------------------------------ colour tokens ------------------------------ */

export interface ColourImport {
  tokens: ColourOverrides;
  ignored: string[];
  source: "gitwork" | "figma" | "flat";
}

const semantic = new Set<string>(SEMANTIC_COLORS);

function cleanValue(v: unknown): string | { light?: string; dark?: string } | null {
  if (typeof v === "string") return isColour(v) ? v : null;
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    if ("$value" in o) return cleanValue(o.$value);
    const light = typeof o.light === "string" && isColour(o.light) ? o.light : undefined;
    const dark = typeof o.dark === "string" && isColour(o.dark) ? o.dark : undefined;
    if (light || dark) return { ...(light ? { light } : {}), ...(dark ? { dark } : {}) };
  }
  return null;
}

/**
 * Import seasonal colour overrides from any of:
 *  - a Gitwork theme file (tokens.color),
 *  - a Figma Variables export (native per-mode DTCG or REST),
 *  - a flat map: { "accent": "#C8102E", "bg": { "dark": "#100" } }.
 * Only semantic colour names are kept. References and unknown names are reported.
 */
export function importColourTokens(json: unknown): ColourImport {
  const ignored: string[] = [];
  const take = (entries: Array<[string, unknown]>) => {
    const tokens: ColourOverrides = {};
    for (const [name, value] of entries) {
      if (!semantic.has(name)) {
        ignored.push(name);
        continue;
      }
      const clean = cleanValue(value);
      if (clean) tokens[name] = clean;
      else ignored.push(`${name} (not a colour)`);
    }
    return tokens;
  };

  if (typeof json !== "object" || json === null) throw new Error("Expected a JSON object of colour tokens.");
  const doc = json as Record<string, unknown>;

  const color = (doc.tokens as Record<string, unknown> | undefined)?.color;
  if (color && typeof color === "object") return { tokens: take(Object.entries(color)), ignored, source: "gitwork" };

  const looksDtcg = JSON.stringify(json).includes('"$value"');
  if (isFigmaRestExport(json) || looksDtcg) {
    const result = mapFigmaVariables(readFigmaVariables([{ json }]));
    ignored.push(...result.unmapped);
    return { tokens: take(Object.entries(result.tokens.color ?? {})), ignored, source: "figma" };
  }
  return { tokens: take(Object.entries(doc)), ignored, source: "flat" };
}

/** A client theme with seasonal colour overrides applied. */
export function applyOverrides(base: ResolvedTheme, overrides: ColourOverrides | undefined): ResolvedTheme {
  if (!overrides) return base;
  const values: ResolvedTheme["values"] = {};
  for (const mode of base.modes.supported) {
    const next = { ...base.values[mode] };
    for (const [name, v] of Object.entries(overrides)) {
      const value = typeof v === "string" ? v : v[mode];
      if (value) next[`color.${name}`] = value;
    }
    values[mode] = next;
  }
  return { ...base, values };
}

/** Contrast failures caused by a seasonal theme's colours. */
export function seasonalContrast(base: ResolvedTheme, overrides: ColourOverrides | undefined) {
  return checkContrast(applyOverrides(base, overrides)).filter((r) => !r.pass);
}

/** Overrides for one mode as `--gw-color-*` inline styles. */
export function overrideStyle(overrides: ColourOverrides | undefined, mode: Mode): Record<string, string> {
  const style: Record<string, string> = {};
  for (const [name, v] of Object.entries(overrides ?? {})) {
    const value = typeof v === "string" ? v : v[mode];
    if (value) style[`--gw-color-${name}`] = value;
  }
  return style;
}

/** Stylesheet for the web pack: applied when <html data-season="slug">. */
export function seasonalCss(clientTheme: string, slug: string, overrides: ColourOverrides | undefined): string {
  const lines = (mode: Mode | null) =>
    Object.entries(overrides ?? {})
      .map(([name, v]) => [name, typeof v === "string" ? (mode === null ? v : undefined) : mode === null ? (v.light ?? v.dark) : v[mode]] as const)
      .filter(([, value]) => value)
      .map(([name, value]) => `  --gw-color-${name}: ${value};`);
  const base = `[data-theme="${clientTheme}"][data-season="${slug}"]`;
  const dark = lines("dark");
  return [
    `/* Seasonal theme "${slug}". Add data-season="${slug}" to <html> while it runs. */`,
    `${base} {\n${lines(null).join("\n")}\n}`,
    dark.length ? `${base}[data-mode="dark"] {\n${dark.join("\n")}\n}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}

/* ---------------------------- native icon status ---------------------------- */

export type IconRelease =
  | { state: "shipped"; build: AppBuild }
  | { state: "in-review"; build: AppBuild }
  | { state: "requires-release" };

/**
 * Alternate app icons can't be pushed remotely: they must be compiled into the app.
 * Given the icon's key, report the first build that carries it.
 */
export function iconRelease(key: string | undefined, platform: "ios" | "android", builds: AppBuild[]): IconRelease {
  if (!key) return { state: "requires-release" };
  const carrying = builds.filter((b) => b.platform === platform && b.alternateIcons.includes(key));
  const live = carrying.find((b) => b.status === "live");
  if (live) return { state: "shipped", build: live };
  const pending = carrying[0];
  if (pending) return { state: "in-review", build: pending };
  return { state: "requires-release" };
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Problems that block publishing. */
export function publishBlockers(theme: Pick<SeasonalTheme, "name" | "platforms" | "assets" | "startsAt" | "endsAt">): string[] {
  const out: string[] = [];
  if (!theme.name.trim()) out.push("Give the theme a name.");
  if (!theme.platforms.length) out.push("Choose at least one platform.");
  if (theme.startsAt && theme.endsAt && new Date(theme.endsAt) <= new Date(theme.startsAt)) out.push("The end date must be after the start date.");
  const a = theme.assets;
  if (a.splash.enabled && !a.splash.lottie && !a.splash.fallback) out.push("Splash is on but has no animation or image.");
  if (a.appIcon.enabled && !a.appIcon.icon) out.push("App icon is on but no icon is uploaded.");
  if (a.background.enabled && !a.background.mobile && !a.background.desktop) out.push("Background is on but has no images.");
  if (a.colours.enabled && !Object.keys(a.colours.tokens ?? {}).length) out.push("Colours are on but no tokens are imported.");
  if (!a.splash.enabled && !a.appIcon.enabled && !a.background.enabled && !a.colours.enabled) out.push("Turn on at least one asset slot.");
  return out;
}
