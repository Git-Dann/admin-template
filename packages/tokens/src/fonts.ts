import type { FontSpec } from "./schema";

const DEFAULT_FALLBACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** CSS font-family value for a font spec, with a sensible fallback stack. */
export function fontStack(spec: FontSpec): string {
  const fallback = spec.fallback ?? DEFAULT_FALLBACK;
  if (spec.source === "system") return fallback;
  return `"${spec.family}", ${fallback}`;
}

/**
 * Stylesheet URLs needed to load a theme's fonts. Families shared between
 * display/body are merged into one request.
 */
export function fontStylesheets(fonts: { display?: FontSpec; body?: FontSpec; mono?: FontSpec }): string[] {
  const bySource = new Map<string, Map<string, Set<number>>>();
  for (const spec of [fonts.display, fonts.body, fonts.mono]) {
    if (!spec || spec.source === "system" || spec.source === "local") continue;
    const families = bySource.get(spec.source) ?? new Map<string, Set<number>>();
    const weights = families.get(spec.family) ?? new Set<number>();
    for (const w of spec.weights ?? [400, 500, 600, 700]) weights.add(w);
    families.set(spec.family, weights);
    bySource.set(spec.source, families);
  }

  const urls: string[] = [];
  const google = bySource.get("google");
  if (google?.size) {
    const params = [...google]
      .map(([family, w]) => `family=${family.replace(/ /g, "+")}:wght@${[...w].sort((a, b) => a - b).join(";")}`)
      .join("&");
    urls.push(`https://fonts.googleapis.com/css2?${params}&display=swap`);
  }
  const fontshare = bySource.get("fontshare");
  if (fontshare?.size) {
    const params = [...fontshare]
      .map(([family, w]) => `f[]=${family.toLowerCase().replace(/ /g, "-")}@${[...w].sort((a, b) => a - b).join(",")}`)
      .join("&");
    urls.push(`https://api.fontshare.com/v2/css?${params}&display=swap`);
  }
  return urls;
}

/** `@font-face` rules for `source: "local"` fonts (files served from the app's public folder). */
export function localFontFaces(fonts: { display?: FontSpec; body?: FontSpec; mono?: FontSpec }): string {
  const rules: string[] = [];
  for (const spec of [fonts.display, fonts.body, fonts.mono]) {
    if (spec?.source !== "local") continue;
    for (const file of spec.files ?? []) {
      rules.push(
        `@font-face { font-family: "${spec.family}"; src: url("${file.src}"); font-weight: ${file.weight}; font-style: ${file.style ?? "normal"}; font-display: swap; }`,
      );
    }
  }
  return rules.join("\n");
}
