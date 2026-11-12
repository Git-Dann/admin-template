import { formatHex, formatHex8 } from "culori";
import { REQUIRED, type Mode } from "./schema";

/**
 * Figma → semantic token import.
 *
 * Accepts either:
 *  - Figma's native "Export modes" DTCG JSON (one file per mode), or
 *  - the REST API response of GET /v1/files/:key/variables/local (all modes in one file).
 *
 * A per-client mapping file translates Figma variable names into our semantic names.
 * Anything not in the mapping is auto-matched when its last path segment already equals a
 * semantic name (e.g. "Semantic/Colour/Surface Raised" → color.surface-raised).
 */

export interface FigmaMapping {
  $schema?: string;
  /** Figma mode name → our mode. Defaults to case-insensitive "light"/"dark". */
  modes?: Record<string, Mode>;
  /** Only import from these collections (REST format). */
  collections?: string[];
  /** Figma variable name ("Brand/Red/500") → semantic token path ("color.accent"). */
  tokens?: Record<string, string>;
  /** Figma variable names to ignore silently. */
  ignore?: string[];
}

export interface FigmaVariable {
  name: string;
  type: "color" | "number" | "string" | "boolean";
  /** Literal value per Figma mode name, aliases already resolved. */
  values: Record<string, string>;
}

export interface FigmaImportResult {
  /** Token groups ready to merge into a theme file's `tokens`. */
  tokens: Record<string, Record<string, { light?: string; dark?: string } | string>>;
  mapped: Array<{ figma: string; token: string; auto: boolean }>;
  unmapped: string[];
  /** Primitive variables (Primitives/, Palette/, Core/...) skipped because semantic ones alias them. */
  primitives: string[];
  /** Semantic tokens that the import did not provide (theme keeps its current value). */
  notProvided: string[];
  modesSeen: string[];
}

type Rgba = { r: number; g: number; b: number; a?: number };

function rgbaToCss(c: Rgba): string {
  const color = { mode: "rgb" as const, r: c.r, g: c.g, b: c.b, alpha: c.a ?? 1 };
  return (c.a ?? 1) < 1 ? formatHex8(color) : formatHex(color);
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numberToCss(name: string, n: number): string {
  // Figma has no units. Treat FLOATs as px unless the name says otherwise.
  if (/opacity|weight|ratio|scale/i.test(name)) return String(n);
  return `${n}px`;
}

/* ----------------------------- REST API format ----------------------------- */

interface RestVariable {
  id: string;
  name: string;
  variableCollectionId: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  valuesByMode: Record<string, unknown>;
}
interface RestCollection {
  id: string;
  name: string;
  defaultModeId?: string;
  modes: Array<{ modeId: string; name: string }>;
}

function toMap<T extends { id: string }>(input: unknown): Map<string, T> {
  if (Array.isArray(input)) return new Map((input as T[]).map((v) => [v.id, v]));
  if (isObj(input)) return new Map(Object.entries(input as Record<string, T>));
  return new Map();
}

function parseRest(json: Record<string, unknown>, collections?: string[]): FigmaVariable[] {
  const root = (isObj(json.meta) ? json.meta : json) as Record<string, unknown>;
  const vars = toMap<RestVariable>(root.variables);
  const cols = toMap<RestCollection>(root.variableCollections);

  const modeName = (collectionId: string, modeId: string) =>
    cols.get(collectionId)?.modes.find((m) => m.modeId === modeId)?.name ?? modeId;

  const literal = (v: RestVariable, modeId: string, depth = 0): string | undefined => {
    const raw = v.valuesByMode[modeId] ?? Object.values(v.valuesByMode)[0];
    if (isObj(raw) && raw.type === "VARIABLE_ALIAS") {
      const target = vars.get(raw.id as string);
      if (!target || depth > 10) return undefined;
      // Same mode name in the target collection, else its default mode.
      const wanted = modeName(v.variableCollectionId, modeId);
      const targetCol = cols.get(target.variableCollectionId);
      const targetMode =
        targetCol?.modes.find((m) => m.name === wanted)?.modeId ?? targetCol?.defaultModeId ?? Object.keys(target.valuesByMode)[0]!;
      return literal(target, targetMode, depth + 1);
    }
    if (v.resolvedType === "COLOR" && isObj(raw)) return rgbaToCss(raw as Rgba);
    if (v.resolvedType === "FLOAT" && typeof raw === "number") return numberToCss(v.name, raw);
    if (raw === undefined || raw === null) return undefined;
    return String(raw);
  };

  const out: FigmaVariable[] = [];
  for (const v of vars.values()) {
    const col = cols.get(v.variableCollectionId);
    if (collections?.length && col && !collections.includes(col.name)) continue;
    const values: Record<string, string> = {};
    for (const modeId of Object.keys(v.valuesByMode)) {
      const value = literal(v, modeId);
      if (value !== undefined) values[modeName(v.variableCollectionId, modeId)] = value;
    }
    const type = ({ COLOR: "color", FLOAT: "number", STRING: "string", BOOLEAN: "boolean" } as const)[v.resolvedType];
    out.push({ name: v.name, type, values });
  }
  return out;
}

/* ------------------------------ DTCG format ------------------------------ */

function dtcgModeName(json: Record<string, unknown>, fallback: string): string {
  const ext = json.$extensions;
  if (isObj(ext) && typeof ext["com.figma.modeName"] === "string") return ext["com.figma.modeName"] as string;
  return fallback;
}

function collectDtcg(node: Record<string, unknown>, path: string[], out: Map<string, { type?: string; value: unknown }>, inheritedType?: string) {
  const groupType = typeof node.$type === "string" ? node.$type : inheritedType;
  if ("$value" in node) {
    out.set(path.join("/"), { type: groupType, value: node.$value });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || !isObj(child)) continue;
    collectDtcg(child, [...path, key], out, groupType);
  }
}

function dtcgLiteral(
  name: string,
  entry: { type?: string; value: unknown },
  all: Map<string, { type?: string; value: unknown }>,
  depth = 0,
): string | undefined {
  const { value, type } = entry;
  if (typeof value === "string") {
    const ref = value.match(/^\{(.+)\}$/);
    if (ref) {
      const target = all.get(ref[1]!.replace(/\./g, "/"));
      return target && depth < 10 ? dtcgLiteral(name, target, all, depth + 1) : undefined;
    }
    return value;
  }
  if (typeof value === "number") return type === "number" || type === "dimension" ? numberToCss(name, value) : String(value);
  if (isObj(value)) {
    if (typeof value.hex === "string" && (value.alpha === undefined || value.alpha === 1)) return value.hex as string;
    if (Array.isArray(value.components)) {
      const [r, g, b] = value.components as number[];
      return rgbaToCss({ r: r!, g: g!, b: b!, a: (value.alpha as number | undefined) ?? 1 });
    }
    if (typeof value.value === "number" && typeof value.unit === "string") return `${value.value}${value.unit}`;
  }
  return undefined;
}

function parseDtcg(files: Array<{ json: Record<string, unknown>; mode: string }>): FigmaVariable[] {
  const perMode = files.map(({ json, mode }) => {
    const entries = new Map<string, { type?: string; value: unknown }>();
    collectDtcg(json, [], entries);
    return { mode: dtcgModeName(json, mode), entries };
  });
  const byName = new Map<string, FigmaVariable>();
  for (const { mode, entries } of perMode) {
    for (const [name, entry] of entries) {
      const literal = dtcgLiteral(name, entry, entries);
      if (literal === undefined) continue;
      const type = entry.type === "color" ? "color" : entry.type === "number" || entry.type === "dimension" ? "number" : "string";
      const variable = byName.get(name) ?? { name, type, values: {} };
      variable.values[mode] = literal;
      byName.set(name, variable);
    }
  }
  return [...byName.values()];
}

/* ------------------------------ public API ------------------------------ */

export function isFigmaRestExport(json: unknown): boolean {
  if (!isObj(json)) return false;
  const root = isObj(json.meta) ? json.meta : json;
  return isObj(root) && "variables" in root && "variableCollections" in root;
}

/** Read one or more Figma export files into a flat list of variables. */
export function readFigmaVariables(
  files: Array<{ json: unknown; mode?: string }>,
  mapping: FigmaMapping = {},
): FigmaVariable[] {
  const rest = files.filter((f) => isFigmaRestExport(f.json));
  const dtcg = files.filter((f) => !isFigmaRestExport(f.json));
  return [
    ...rest.flatMap((f) => parseRest(f.json as Record<string, unknown>, mapping.collections)),
    ...parseDtcg(dtcg.map((f, i) => ({ json: f.json as Record<string, unknown>, mode: f.mode ?? (i === 0 ? "light" : `mode-${i + 1}`) }))),
  ];
}

const kebab = (s: string) =>
  s
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

/** Try to match a Figma variable name to a semantic token without a mapping entry. */
export function autoMatch(name: string, type: FigmaVariable["type"]): string | null {
  const segments = name.split("/").map(kebab);
  const groupHints: Record<string, keyof typeof REQUIRED> = {
    color: "color",
    colour: "color",
    colors: "color",
    colours: "color",
    radius: "radius",
    radii: "radius",
    "corner-radius": "radius",
    space: "space",
    spacing: "space",
    size: "size",
    sizes: "size",
    shadow: "shadow",
    shadows: "shadow",
    elevation: "shadow",
  };
  const hinted = segments.map((s) => groupHints[s]).find(Boolean);
  const candidates: Array<keyof typeof REQUIRED> = hinted ? [hinted] : type === "color" ? ["color"] : ["radius", "space", "size"];
  // Prefer the longest trailing match, so "Text/Muted" can become text-muted.
  for (let take = Math.min(3, segments.length); take >= 1; take--) {
    const joined = segments.slice(-take).join("-");
    for (const group of candidates) if (REQUIRED[group].includes(joined)) return `${group}.${joined}`;
  }
  return null;
}

function resolveMode(figmaMode: string, mapping: FigmaMapping): Mode | null {
  if (mapping.modes?.[figmaMode]) return mapping.modes[figmaMode]!;
  const lower = figmaMode.toLowerCase();
  if (lower.includes("dark")) return "dark";
  if (lower.includes("light") || lower === "default" || lower === "mode 1" || lower === "value") return "light";
  return null;
}

const PRIMITIVE_GROUP = /^(primitives?|palette|core|base|global|ref)\//i;

/** Map Figma variables onto semantic token groups. */
export function mapFigmaVariables(variables: FigmaVariable[], mapping: FigmaMapping = {}): FigmaImportResult {
  const tokens: FigmaImportResult["tokens"] = {};
  const mapped: FigmaImportResult["mapped"] = [];
  const unmapped: string[] = [];
  const modesSeen = new Set<string>();
  const ignore = new Set(mapping.ignore ?? []);
  const primitives: string[] = [];

  for (const variable of variables) {
    if (ignore.has(variable.name)) continue;
    const explicit = mapping.tokens?.[variable.name];
    const target = explicit ?? autoMatch(variable.name, variable.type);
    if (!target) {
      // Primitive scales are referenced by semantic variables, not imported directly.
      if (PRIMITIVE_GROUP.test(variable.name)) primitives.push(variable.name);
      else unmapped.push(variable.name);
      continue;
    }
    const [group, ...rest] = target.split(".");
    const key = rest.join(".");
    const perMode: { light?: string; dark?: string } = {};
    for (const [figmaMode, value] of Object.entries(variable.values)) {
      modesSeen.add(figmaMode);
      const mode = resolveMode(figmaMode, mapping) ?? "light";
      perMode[mode] = value;
    }
    const groupObj = (tokens[group!] ??= {});
    const existing = groupObj[key];
    groupObj[key] = typeof existing === "object" ? { ...existing, ...perMode } : perMode;
    mapped.push({ figma: variable.name, token: target, auto: !explicit });
  }

  // Collapse { light: x, dark: x } and single-mode values to a plain string.
  for (const group of Object.values(tokens)) {
    for (const [key, value] of Object.entries(group)) {
      if (typeof value !== "object") continue;
      const vals = Object.values(value);
      if (vals.length === 1 || (vals.length === 2 && vals[0] === vals[1])) group[key] = vals[0]!;
    }
  }

  const notProvided = Object.entries(REQUIRED).flatMap(([group, names]) =>
    names.filter((n) => !tokens[group]?.[n]).map((n) => `${group}.${n}`),
  );

  return { tokens, mapped, unmapped, primitives, notProvided, modesSeen: [...modesSeen] };
}
