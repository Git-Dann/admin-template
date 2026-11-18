/**
 * Import Figma Variables into a client theme.
 *
 *   pnpm tokens:import ./Light.tokens.json ./Dark.tokens.json --client fellas
 *   pnpm tokens:import ./variables.json --client wedge --dry-run
 *
 * Accepts Figma's native "Export modes" files (one per mode) or a REST API
 * `variables/local` response. Names are translated with mappings/<client>.figma.json;
 * anything whose last segment already matches a semantic name is mapped automatically.
 */
import { existsSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import {
  checkContrast,
  deepMerge,
  flattenExtends,
  mapFigmaVariables,
  parseThemeFile,
  readFigmaVariables,
  resolveTheme,
  ThemeError,
  type FigmaMapping,
  type ThemeFile,
} from "../src";
import { c, PKG, readJson, THEMES_DIR, loadThemes } from "./lib";

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const client = flag("client");
const forcedMode = flag("mode");
const dryRun = argv.includes("--dry-run");
const inputs = argv.filter((a, i) => !a.startsWith("--") && !["--client", "--mode"].includes(argv[i - 1] ?? ""));

if (!client || inputs.length === 0) {
  console.log(`Usage: pnpm tokens:import <figma-export.json> [more.json] --client <id> [--mode light|dark] [--dry-run]`);
  process.exit(1);
}

const cwd = process.env.INIT_CWD ?? process.cwd();
const themePath = join(THEMES_DIR, `${client}.json`);
if (!existsSync(themePath)) {
  console.error(c.red(`No theme "${client}". Expected ${themePath}. Run pnpm create-client ${client} first.`));
  process.exit(1);
}

const mappingPath = join(PKG, "mappings", `${client}.figma.json`);
const mapping: FigmaMapping = existsSync(mappingPath) ? (readJson(mappingPath) as FigmaMapping) : {};
if (!existsSync(mappingPath)) console.log(c.dim(`No mappings/${client}.figma.json, using automatic name matching only.`));

const files = inputs.map((input) => {
  const path = isAbsolute(input) ? input : resolve(cwd, input);
  const guess = /dark/i.test(basename(path)) ? "dark" : /light/i.test(basename(path)) ? "light" : undefined;
  return { json: readJson(path), mode: forcedMode ?? guess };
});

const variables = readFigmaVariables(files, mapping);
const result = mapFigmaVariables(variables, mapping);

console.log(`\n${c.bold("Figma import")} → themes/${client}.json`);
console.log(`  read ${variables.length} variables, modes: ${result.modesSeen.join(", ") || "none"}`);
console.log(`  ${c.green(`${result.mapped.length} mapped`)} (${result.mapped.filter((m) => m.auto).length} automatically)`);
for (const m of result.mapped) console.log(c.dim(`    ${m.figma} → ${m.token}${m.auto ? " (auto)" : ""}`));
if (result.unmapped.length) {
  console.log(c.yellow(`  ${result.unmapped.length} not mapped (add to mappings/${client}.figma.json "tokens", or "ignore"):`));
  for (const name of result.unmapped) console.log(c.yellow(`    ${name}`));
}
if (result.primitives.length) console.log(c.dim(`  ${result.primitives.length} primitive variables skipped (used via aliases).`));
if (result.notProvided.length) {
  console.log(c.dim(`  ${result.notProvided.length} semantic tokens not in the export keep their current values.`));
}

const current = parseThemeFile(readJson(themePath), client);
const next: ThemeFile = { ...current, tokens: deepMerge(current.tokens ?? {}, result.tokens) };

try {
  const { files: all } = loadThemes();
  const registry = new Map(all.map((f) => [f.id, f.id === client ? next : f]));
  const resolved = resolveTheme(flattenExtends(next, registry));
  const failures = checkContrast(resolved).filter((r) => !r.pass);
  if (failures.length) {
    console.log(c.red(`\n  ${failures.length} contrast failure(s) after import:`));
    for (const f of failures) console.log(c.red(`    [${f.mode}] ${f.fg} on ${f.bg}: ${f.ratio.toFixed(2)}:1, needs ${f.min}:1 (${f.why})`));
    process.exitCode = 1;
  } else {
    console.log(c.green("\n  Contrast: all pairs meet WCAG AA."));
  }
} catch (error) {
  if (error instanceof ThemeError) {
    console.error(c.red(`\n${error.message}`));
    process.exit(1);
  }
  throw error;
}

if (dryRun) {
  console.log(c.dim("\n  Dry run, nothing written."));
} else {
  writeFileSync(themePath, JSON.stringify(next, null, 2) + "\n");
  console.log(`\n  Wrote themes/${client}.json. Run ${c.bold("pnpm tokens:build")} (or just restart pnpm dev).`);
}
