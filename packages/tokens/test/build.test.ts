import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { themeCss, type ResolvedTheme } from "../src";
import { DIST, loadThemes } from "../scripts/lib";

const strip = (css: string) => css.replace(/^\/\*.*\*\/\n/, "");

describe("build output", () => {
  const { resolved } = loadThemes();

  it("Style Dictionary output matches the runtime CSS generator (no drift)", () => {
    for (const theme of resolved) {
      const built = readFileSync(join(DIST, "css", `${theme.id}.css`), "utf8");
      expect(strip(built)).toBe(themeCss(theme));
    }
  });

  it("emits every theme in themes.json", () => {
    const json = JSON.parse(readFileSync(join(DIST, "themes.json"), "utf8")) as ResolvedTheme[];
    expect(json.map((t) => t.id).sort()).toEqual(resolved.map((t) => t.id).sort());
  });

  it("removes Tailwind's default palette and maps semantic tokens", () => {
    const tw = readFileSync(join(DIST, "tailwind.css"), "utf8");
    expect(tw).toContain("--color-*: initial;");
    expect(tw).toContain("--color-accent: var(--gw-color-accent);");
    expect(tw).toContain("--spacing-control: var(--gw-size-control);");
  });
});
