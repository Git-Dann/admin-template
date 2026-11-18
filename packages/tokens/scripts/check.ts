/**
 * Validate every theme file and check WCAG AA contrast for each supported mode.
 * Exits non-zero on any failure, so CI blocks unreadable themes.
 *
 *   pnpm tokens:check            all themes
 *   pnpm tokens:check fellas     one theme
 *   pnpm tokens:check --verbose  print every pair, not just failures
 */
import { checkContrast, ThemeError } from "../src";
import { c, loadThemes } from "./lib";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const only = args.filter((a) => !a.startsWith("--"));

let failed = 0;
try {
  const { resolved } = loadThemes();
  for (const theme of resolved) {
    if (only.length && !only.includes(theme.id)) continue;
    const results = checkContrast(theme);
    const failures = results.filter((r) => !r.pass);
    failed += failures.length;
    const head = failures.length ? c.red(`✗ ${failures.length} failing`) : c.green(`✓ ${results.length} pairs pass AA`);
    console.log(`\n${c.bold(theme.name)} (${theme.id}) ${head}`);
    for (const r of verbose ? results : failures) {
      const mark = r.pass ? c.green("pass") : c.red("FAIL");
      const ratio = r.skipped ? c.dim(r.skipped) : `${r.ratio.toFixed(2)}:1 (needs ${r.min}:1)`;
      console.log(`  ${mark}  [${r.mode}${r.variant ? ` · ${r.variant}` : ""}] ${r.fg} on ${r.bg}  ${ratio}  ${c.dim(r.why)}`);
    }
  }
} catch (error) {
  if (error instanceof ThemeError) {
    console.error(c.red(`\n${error.message}`));
    process.exit(1);
  }
  throw error;
}

if (failed) {
  console.log(c.red(`\n${failed} contrast failure(s). Adjust the token values in packages/tokens/themes/*.json.`));
  process.exit(1);
}
console.log(c.green("\nAll themes meet WCAG AA."));
