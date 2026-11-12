import {

  REQUIRED,
  themeFileSchema,
  type FontSpec,
  type Mode,
  type ThemeFile,
  type TokenValue,
} from "./schema";
import { fontStack } from "./fonts";

const SEMANTIC_COLOR_SET = new Set<string>(REQUIRED.color);

export const CSS_PREFIX = "gw";

export type TokenGroup = "color" | "radius" | "space" | "size" | "shadow" | "font";

/** A theme after `extends` is applied, validated, and every reference resolved per mode. */
export interface ResolvedTheme {
  id: string;
  name: string;
  modes: { default: Mode; supported: Mode[] };
  brand: NonNullable<ThemeFile["brand"]>;
  fonts: { display?: FontSpec; body?: FontSpec; mono?: FontSpec };
  /** Flat token paths (`color.accent`) to final CSS values, per supported mode. */
  values: Partial<Record<Mode, Record<string, string>>>;
  /** Variant name → per-mode values that differ from the base (applied with data-variant). */
  variants: Record<string, Partial<Record<Mode, Record<string, string>>>>;
}

export class ThemeError extends Error {
  constructor(
    public readonly themeId: string,
    public readonly problems: string[],
  ) {
    super(`Theme "${themeId}" has ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
  }
}

/** CSS custom property for a token path: `color.accent` → `--gw-color-accent`. */
export function cssVar(path: string): string {
  return `--${CSS_PREFIX}-${path.replace(/\./g, "-")}`;
}

/** Parse and validate one theme file. Throws ThemeError with readable messages. */
export function parseThemeFile(input: unknown, label = "theme"): ThemeFile {
  const result = themeFileSchema.safeParse(input);
  if (result.success) return result.data;
  const id = (input as { id?: string })?.id ?? label;
  throw new ThemeError(
    id,
    result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep merge where `override` wins. Mode objects merge too, so a child can override just `dark`. */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return (override ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = key in out ? deepMerge(out[key], value) : value;
  }
  return out as T;
}

/** Apply `extends` chains. `registry` maps theme id → parsed file. */
export function flattenExtends(file: ThemeFile, registry: Map<string, ThemeFile>, seen: string[] = []): ThemeFile {
  if (!file.extends) return file;
  if (seen.includes(file.id)) throw new ThemeError(file.id, [`Circular extends: ${[...seen, file.id].join(" → ")}`]);
  const parent = registry.get(file.extends);
  if (!parent) throw new ThemeError(file.id, [`extends "${file.extends}" but no theme with that id exists`]);
  const base = flattenExtends(parent, registry, [...seen, file.id]);
  const { extends: _drop, ...rest } = file;
  return deepMerge({ ...base, id: file.id, name: file.name }, rest);
}

function rawValue(token: TokenValue): string | { light?: string; dark?: string } {
  return isPlainObject(token) && "$value" in token ? (token.$value as string | { light?: string; dark?: string }) : (token as string | { light?: string; dark?: string });
}

function pickMode(value: string | { light?: string; dark?: string }, mode: Mode, fallback: Mode): string {
  if (typeof value === "string") return value;
  return value[mode] ?? value[fallback] ?? value.light ?? value.dark ?? "";
}

/** Flatten `{ palette: { green: { 500: x } } }` style groups into `palette.green.500`. */
function flattenGroup(prefix: string, group: Record<string, unknown>, out: Map<string, TokenValue>) {
  for (const [key, value] of Object.entries(group)) {
    const path = `${prefix}.${key}`;
    const looksLikeToken =
      typeof value === "string" ||
      (isPlainObject(value) && ("$value" in value || "light" in value || "dark" in value));
    if (looksLikeToken) out.set(path, value as TokenValue);
    else if (isPlainObject(value)) flattenGroup(path, value, out);
  }
}

const REF = /\{([a-z0-9.-]+)\}/gi;

function resolveRefs(path: string, raw: Map<string, string>, stack: string[] = []): string {
  const value = raw.get(path);
  if (value === undefined) throw new Error(`Unknown reference {${path}}`);
  if (stack.includes(path)) throw new Error(`Circular reference: ${[...stack, path].join(" → ")}`);
  return value.replace(REF, (_, ref: string) => resolveRefs(ref, raw, [...stack, path]));
}

/** Resolve a merged theme file into final per-mode values. */
export function resolveTheme(file: ThemeFile): ResolvedTheme {
  const problems: string[] = [];
  const modes = file.modes ?? { default: "light" as Mode, supported: ["light" as Mode] };
  if (!modes.supported.includes(modes.default)) {
    problems.push(`modes.default "${modes.default}" is not in modes.supported`);
  }

  const tokens = file.tokens ?? {};
  for (const [group, names] of Object.entries(REQUIRED)) {
    const present = (tokens as Record<string, Record<string, unknown> | undefined>)[group] ?? {};
    const missing = names.filter((n) => !(n in present));
    if (missing.length) problems.push(`tokens.${group} is missing: ${missing.join(", ")}`);
  }

  const flat = new Map<string, TokenValue>();
  for (const [group, values] of Object.entries(tokens)) {
    if (values) flattenGroup(group, values as Record<string, unknown>, flat);
  }

  const fonts = file.fonts ?? {};
  const values: ResolvedTheme["values"] = {};
  const variants: ResolvedTheme["variants"] = {};
  for (const mode of modes.supported) {
    const raw = new Map<string, string>();
    for (const [path, token] of flat) raw.set(path, pickMode(rawValue(token), mode, modes.default));
    for (const [name, variant] of Object.entries(file.variants ?? {})) {
      const out: Record<string, string> = {};
      const vraw = new Map(raw);
      for (const [key, token] of Object.entries(variant.color)) {
        if (!SEMANTIC_COLOR_SET.has(key)) problems.push(`variants.${name}.color.${key} isn't a semantic colour`);
        vraw.set(`color.${key}`, pickMode(rawValue(token), mode, modes.default));
      }
      for (const key of Object.keys(variant.color)) {
        try {
          out[`color.${key}`] = resolveRefs(`color.${key}`, vraw);
        } catch (error) {
          problems.push(`variants.${name}.color.${key} (${mode}): ${(error as Error).message}`);
        }
      }
      (variants[name] ??= {})[mode] = out;
    }
    for (const kind of ["display", "body", "mono"] as const) {
      const spec = fonts[kind];
      if (spec) raw.set(`font.${kind}`, fontStack(spec));
    }
    const resolved: Record<string, string> = {};
    for (const path of raw.keys()) {
      if (path.startsWith("palette.")) continue; // primitives stay internal
      try {
        resolved[path] = resolveRefs(path, raw);
      } catch (error) {
        problems.push(`${path} (${mode}): ${(error as Error).message}`);
      }
    }
    values[mode] = resolved;
  }

  if (problems.length) throw new ThemeError(file.id, problems);

  return {
    id: file.id,
    name: file.name,
    modes: { default: modes.default, supported: [...modes.supported] },
    brand: file.brand ?? {},
    fonts,
    values,
    variants,
  };
}

/** A theme with one variant's overrides applied, for contrast checks and previews. */
export function applyVariant(theme: ResolvedTheme, name: string): ResolvedTheme {
  const variant = theme.variants[name];
  if (!variant) return theme;
  const values: ResolvedTheme["values"] = {};
  for (const mode of theme.modes.supported) values[mode] = { ...theme.values[mode], ...variant[mode] };
  return { ...theme, values };
}

/** Parse, flatten `extends`, and resolve a set of theme files. */
export function resolveThemes(inputs: unknown[]): ResolvedTheme[] {
  const files = inputs.map((input, i) => parseThemeFile(input, `theme #${i + 1}`));
  const registry = new Map(files.map((f) => [f.id, f]));
  return files.map((file) => resolveTheme(flattenExtends(file, registry)));
}
