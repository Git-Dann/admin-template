import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { flattenExtends, parseThemeFile, resolveTheme, type ResolvedTheme, type ThemeFile } from "../src";

export const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const THEMES_DIR = join(PKG, "themes");
export const DIST = join(PKG, "dist");

export const c = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

export function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${path}: ${(error as Error).message}`);
  }
}

/** Load every theme file, apply `extends`, and resolve. */
export function loadThemes(): { files: ThemeFile[]; merged: ThemeFile[]; resolved: ResolvedTheme[] } {
  const files = readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => parseThemeFile(readJson(join(THEMES_DIR, f)), f));
  const registry = new Map(files.map((f) => [f.id, f]));
  const merged = files.map((f) => flattenExtends(f, registry));
  return { files, merged, resolved: merged.map(resolveTheme) };
}
