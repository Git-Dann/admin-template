/**
 * pnpm create-client <name> [--accent "#C8102E"] [--from <theme-id>] [--flavour streaming|golf|generic] [--dark]
 *
 * Copies apps/admin-starter to apps/admin-<name>, creates packages/tokens/themes/<name>.json
 * and a Figma mapping stub, links the workspace, builds tokens and prints next steps.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { formatHex, oklch, parse } from "culori";

const ROOT = resolve(import.meta.dirname, "..");
const started = performance.now();
const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};
const fail = (msg: string): never => {
  console.error(c.red(`\n✗ ${msg}\n`));
  process.exit(1);
};

/* --------------------------------- args --------------------------------- */

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const name = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!name) fail("Usage: pnpm create-client <name> [--accent '#C8102E'] [--from gitwork] [--flavour streaming|golf|generic] [--dark]");
const id = name!.toLowerCase();
if (!/^[a-z][a-z0-9-]*$/.test(id)) fail(`"${name}" isn't a valid client id. Use lower-case letters, numbers and dashes, e.g. "acme".`);
const from = flag("from") ?? "gitwork";
const accent = flag("accent");
const flavour = flag("flavour") ?? "generic";
const darkFirst = argv.includes("--dark");
/** Use a theme file that already exists in packages/tokens/themes (e.g. one imported from Figma first). */
const keepTheme = argv.includes("--keep-theme");
const title = id.replace(/(^|-)([a-z])/g, (_, s: string, ch: string) => (s ? " " : "") + ch.toUpperCase());

const appDir = join(ROOT, "apps", `admin-${id}`);
const themePath = join(ROOT, "packages/tokens/themes", `${id}.json`);
const basePath = join(ROOT, "packages/tokens/themes", `${from}.json`);
if (existsSync(appDir)) fail(`apps/admin-${id} already exists.`);
if (existsSync(themePath) && !keepTheme) fail(`packages/tokens/themes/${id}.json already exists. Pass --keep-theme to use it.`);
if (!existsSync(themePath) && keepTheme) fail(`--keep-theme was passed but packages/tokens/themes/${id}.json doesn't exist.`);
if (!existsSync(basePath)) fail(`No theme "${from}" to start from.`);
if (accent && !parse(accent)) fail(`--accent "${accent}" isn't a colour I can read. Try a hex value like "#C8102E".`);

/* ------------------------------- 1. the app ------------------------------- */

const skip = new Set(["node_modules", ".next", ".turbo", "test-results", "playwright-report", "next-env.d.ts"]);
cpSync(join(ROOT, "apps/admin-starter"), appDir, { recursive: true, filter: (src) => !skip.has(src.split("/").pop()!) });

const ports = readdirSync(join(ROOT, "apps"))
  .map((d) => readFileSync(join(ROOT, "apps", d, "package.json"), "utf8").match(/--port (\d+)/)?.[1])
  .filter(Boolean)
  .map(Number);
const port = Math.max(2999, ...ports) + 1;

const pkgPath = join(appDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = `admin-${id}`;
for (const key of ["dev", "start"]) pkg.scripts[key] = pkg.scripts[key].replace(/--port \d+/, `--port ${port}`);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

const configPath = join(appDir, "admin.config.ts");
writeFileSync(
  configPath,
  readFileSync(configPath, "utf8")
    .replace('productName: "Starter Admin"', `productName: "${title} Admin"`)
    .replace('theme: "gitwork"', `theme: "${id}"`)
    .replace('flavour: "generic"', `flavour: "${flavour}"`),
);
const pwPath = join(appDir, "playwright.config.ts");
writeFileSync(pwPath, readFileSync(pwPath, "utf8").replace("process.env.PORT ?? 3000", `process.env.PORT ?? ${port}`));

/* ------------------------------ 2. the theme ------------------------------ */

const theme = JSON.parse(readFileSync(keepTheme ? themePath : basePath, "utf8"));
theme.id = id;
if (!keepTheme) theme.name = title;
if (darkFirst) theme.modes = { default: "dark", supported: theme.modes?.supported?.includes("dark") ? theme.modes.supported : ["dark"] };

if (accent) {
  const base = oklch(parse(accent)!)!;
  const hex = (l: number, chroma = base.c) => formatHex({ mode: "oklch", l: Math.min(0.98, Math.max(0.05, l)), c: chroma, h: base.h ?? 0 });
  const brandColour = formatHex(base);
  const light = { accent: brandColour, "accent-pressed": hex(base.l - 0.08), "accent-subtle": hex(0.95, base.c * 0.25), "accent-text": hex(Math.min(base.l, 0.48)), "focus-ring": brandColour, "chart-1": brandColour };
  const dark = { accent: hex(Math.max(base.l, 0.68)), "accent-pressed": hex(Math.max(base.l, 0.68) - 0.06), "accent-subtle": hex(0.26, base.c * 0.4), "accent-text": hex(0.78), "focus-ring": hex(0.78), "chart-1": hex(Math.max(base.l, 0.68)) };
  for (const [token, value] of Object.entries(light)) {
    const current = theme.tokens.color[token];
    theme.tokens.color[token] = typeof current === "object" && current !== null ? { ...current, light: value, dark: dark[token as keyof typeof dark] } : value;
  }
}
if (!keepTheme || accent || darkFirst) writeFileSync(themePath, JSON.stringify(theme, null, 2) + "\n");

const mappingPath = join(ROOT, "packages/tokens/mappings", `${id}.figma.json`);
if (!existsSync(mappingPath)) writeFileSync(
  mappingPath,
  JSON.stringify(
    {
      $comment: "Figma variable name → semantic token. Names whose last segment matches a token (e.g. 'Colour/Surface Raised') map automatically.",
      modes: { Light: "light", Dark: "dark" },
      tokens: { "Brand/Primary": "color.accent" },
      ignore: [],
    },
    null,
    2,
  ) + "\n",
);

/* ------------------------------- 3. logos ------------------------------- */

// No placeholder logos are drawn: until the client's real logo files are added, the sidebar
// shows the product name. Export them from the client's Figma into public/brand/.
mkdirSync(join(appDir, "public/brand"), { recursive: true });

/* --------------------------- 4. link and build --------------------------- */

const run = (cmd: string) => execSync(cmd, { cwd: ROOT, stdio: "pipe" }).toString();
try {
  run("pnpm install --prefer-offline");
  run("pnpm --filter @gitwork/tokens build");
} catch (error) {
  fail(`Setup failed:\n${(error as { stdout?: Buffer }).stdout?.toString() ?? (error as Error).message}`);
}
let contrast = c.green("all pairs meet WCAG AA");
try {
  run(`pnpm --filter @gitwork/tokens check ${id}`);
} catch (error) {
  const out = (error as { stdout?: Buffer }).stdout?.toString() ?? "";
  contrast = c.red(`${(out.match(/FAIL/g) ?? []).length} contrast issue(s): run pnpm tokens:check ${id}`);
}

const seconds = ((performance.now() - started) / 1000).toFixed(1);
console.log(`
${c.green("✓")} Created ${c.bold(`${title} Admin`)} in ${seconds}s

  apps/admin-${id}/                      the app (port ${port})
  apps/admin-${id}/admin.config.ts       brand, nav, roles, modules, adapters
  packages/tokens/themes/${id}.json       colours, fonts, radii (${contrast})
  packages/tokens/mappings/${id}.figma.json  Figma variable names → tokens

${c.bold("Next steps")}
  1. pnpm --filter admin-${id} dev        → http://localhost:${port}
  2. Export the client's real logo from their Figma into apps/admin-${id}/public/brand/
     and set brand.logo in admin.config.ts (until then the product name is shown)
  3. Set colours and fonts in themes/${id}.json, or import from Figma:
       pnpm tokens:import ./figma-export.json --client ${id}
  4. Turn modules on or off and edit nav and roles in admin.config.ts
  5. Swap mock adapters for real ones as the client API lands
${c.dim("  See README.md › Adding a client for details.")}
`);
