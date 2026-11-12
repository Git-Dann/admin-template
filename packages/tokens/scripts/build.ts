/**
 * Build tokens: theme JSON → CSS variables (Style Dictionary), Tailwind v4 theme,
 * resolved JSON for runtime use, native colour files, and the theme JSON Schema.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import StyleDictionary from "style-dictionary";
import type { DesignTokens } from "style-dictionary/types";
import { z } from "zod";
import {
  checkContrast,
  CSS_PREFIX,
  fontStack,
  tailwindThemeCss,
  themeFileSchema,
  themeSelector,
  ThemeError,
  type Mode,
  type ResolvedTheme,
  type ThemeFile,
} from "../src";
import { c, DIST, loadThemes, PKG } from "./lib";

type Raw = string | { light?: string; dark?: string } | { $value: Raw };

function pick(v: Raw, mode: Mode, fallback: Mode): string {
  if (typeof v === "string") return v;
  if ("$value" in v) return pick(v.$value, mode, fallback);
  return v[mode] ?? v[fallback] ?? v.light ?? v.dark ?? "";
}

/** Theme file → DTCG token tree for one mode, references left in place for Style Dictionary. */
function dtcgFor(file: ThemeFile, mode: Mode): DesignTokens {
  const fallback = file.modes?.default ?? "light";
  const types: Record<string, string | undefined> = { color: "color", palette: "color", radius: "dimension", space: "dimension", size: "dimension" };
  const walk = (node: Record<string, unknown>, type: string | undefined): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      const isToken =
        typeof value === "string" ||
        (typeof value === "object" && value !== null && ("$value" in value || "light" in value || "dark" in value));
      out[key] = isToken
        ? { $value: pick(value as Raw, mode, fallback), ...(type ? { $type: type } : {}) }
        : walk(value as Record<string, unknown>, type);
    }
    return out;
  };
  const tree: Record<string, unknown> = {};
  for (const [group, node] of Object.entries(file.tokens ?? {})) {
    if (node) tree[group] = walk(node as Record<string, unknown>, types[group]);
  }
  const fonts = file.fonts ?? {};
  const font: Record<string, unknown> = {};
  for (const kind of ["display", "body", "mono"] as const) {
    const spec = fonts[kind];
    if (spec) font[kind] = { $value: fontStack(spec) };
  }
  tree.font = font;
  return tree as DesignTokens;
}

/** Style Dictionary pass for one theme + mode. Returns `path → value` with references resolved. */
async function sdValues(file: ThemeFile, mode: Mode): Promise<Record<string, string>> {
  const sd = new StyleDictionary({
    tokens: dtcgFor(file, mode),
    usesDtcg: true,
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: {
      css: {
        prefix: CSS_PREFIX,
        transforms: ["name/kebab"],
        files: [{ destination: "unused.css", format: "gitwork/values", filter: (t) => t.path[0] !== "palette" }],
      },
    },
  });
  const [result] = await sd.formatPlatform("css");
  return JSON.parse(String(result?.output ?? "{}")) as Record<string, string>;
}

StyleDictionary.registerFormat({
  name: "gitwork/values",
  format: ({ dictionary }) =>
    JSON.stringify(Object.fromEntries(dictionary.allTokens.map((t) => [t.path.join("."), String(t.$value ?? t.value)]))),
});

/** Native colour files for iOS / Android asset packs. */
async function buildNative(file: ThemeFile, mode: Mode) {
  const tokens = dtcgFor(file, mode);
  const sd = new StyleDictionary({
    tokens: { palette: tokens.palette ?? {}, color: tokens.color ?? {} },
    usesDtcg: true,
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: {
      ios: {
        transformGroup: "ios-swift",
        buildPath: join(DIST, "native", file.id, mode, "ios") + "/",
        files: [
          {
            destination: "ThemeColors.swift",
            format: "ios-swift/class.swift",
            options: { className: "ThemeColors" },
            filter: (t) => t.path[0] === "color",
          },
        ],
      },
      android: {
        transformGroup: "android",
        buildPath: join(DIST, "native", file.id, mode, "android") + "/",
        files: [{ destination: "colors.xml", format: "android/colors", filter: (t) => t.path[0] === "color" }],
      },
    },
  });
  await sd.buildAllPlatforms();
}

function cssBlock(selector: string, scheme: Mode, values: Record<string, string>): string {
  const lines = Object.entries(values).map(([path, value]) => `  --${CSS_PREFIX}-${path.replace(/\./g, "-")}: ${value};`);
  return `${selector} {\n  color-scheme: ${scheme};\n${lines.join("\n")}\n}`;
}

async function main() {
  const started = performance.now();
  let themes: ReturnType<typeof loadThemes>;
  try {
    themes = loadThemes();
  } catch (error) {
    if (error instanceof ThemeError) {
      console.error(c.red(error.message));
      process.exit(1);
    }
    throw error;
  }

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, "css"), { recursive: true });

  const all: string[] = [];
  const resolvedOut: ResolvedTheme[] = [];

  for (const [index, file] of themes.merged.entries()) {
    const resolved = themes.resolved[index]!;
    const values: Partial<Record<Mode, Record<string, string>>> = {};
    for (const mode of resolved.modes.supported) {
      values[mode] = await sdValues(file, mode);
      await buildNative(file, mode);
    }

    const base = values[resolved.modes.default]!;
    const blocks = [cssBlock(themeSelector(file.id), resolved.modes.default, base)];
    for (const mode of resolved.modes.supported) {
      const changed =
        mode === resolved.modes.default
          ? {}
          : Object.fromEntries(Object.entries(values[mode]!).filter(([k, v]) => base[k] !== v));
      blocks.push(cssBlock(themeSelector(file.id, mode), mode, changed));
    }
    const css = `/* Generated by @gitwork/tokens from themes/${file.id}.json. Do not edit. */\n${blocks.join("\n\n")}\n`;
    writeFileSync(join(DIST, "css", `${file.id}.css`), css);
    all.push(css);
    resolvedOut.push({ ...resolved, values });

    const failures = checkContrast({ ...resolved, values }).filter((r) => !r.pass);
    const status = failures.length ? c.yellow(`${failures.length} contrast issue(s), run pnpm tokens:check`) : c.green("AA ok");
    console.log(`  ${c.bold(file.id.padEnd(10))} ${resolved.modes.supported.join(" + ").padEnd(12)} ${status}`);
  }

  writeFileSync(join(DIST, "themes.css"), all.join("\n"));
  const paths = Object.keys(resolvedOut[0]?.values[resolvedOut[0].modes.default] ?? {});
  writeFileSync(join(DIST, "tailwind.css"), tailwindThemeCss(paths));
  writeFileSync(join(DIST, "themes.json"), JSON.stringify(resolvedOut, null, 2));

  const schema = z.toJSONSchema(themeFileSchema, { target: "draft-7", unrepresentable: "any" });
  writeFileSync(join(PKG, "schema", "theme.schema.json"), JSON.stringify(schema, null, 2) + "\n");

  console.log(c.dim(`  built ${resolvedOut.length} themes in ${Math.round(performance.now() - started)}ms → packages/tokens/dist`));
}

await main();
