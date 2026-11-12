import { describe, expect, it } from "vitest";
import { resolveThemes, ThemeError, cssVar } from "../src";
import gitwork from "../themes/gitwork.json";

describe("resolveThemes", () => {
  it("resolves references per mode and hides the palette", () => {
    const [theme] = resolveThemes([
      {
        ...gitwork,
        id: "t",
        tokens: {
          ...gitwork.tokens,
          palette: { brand: { "500": { light: "#111111", dark: "#EEEEEE" } } },
          color: { ...gitwork.tokens.color, accent: "{palette.brand.500}" },
        },
      },
    ]);
    expect(theme!.values.light!["color.accent"]).toBe("#111111");
    expect(theme!.values.dark!["color.accent"]).toBe("#EEEEEE");
    expect(Object.keys(theme!.values.light!).some((k) => k.startsWith("palette."))).toBe(false);
  });

  it("applies extends so a seasonal theme only lists what changes", () => {
    const themes = resolveThemes([gitwork, { id: "xmas", name: "Christmas", extends: "gitwork", tokens: { color: { accent: "#C8102E" } } }]);
    const xmas = themes.find((t) => t.id === "xmas")!;
    expect(xmas.values.light!["color.accent"]).toBe("#C8102E");
    expect(xmas.values.light!["color.surface"]).toBe(gitwork.tokens.color.surface.light);
    expect(xmas.modes.supported).toEqual(["light", "dark"]);
  });

  it("reports every missing semantic token in one readable error", () => {
    try {
      resolveThemes([{ id: "bad", name: "Bad", tokens: { color: { bg: "#fff" } } }]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ThemeError);
      expect((error as ThemeError).problems.join("\n")).toMatch(/tokens\.color is missing: bg-elevated/);
    }
  });

  it("catches unknown and circular references", () => {
    const base = { ...gitwork, id: "r" };
    expect(() =>
      resolveThemes([{ ...base, tokens: { ...base.tokens, color: { ...base.tokens.color, accent: "{color.nope}" } } }]),
    ).toThrow(/Unknown reference \{color.nope\}/);
    expect(() =>
      resolveThemes([
        { ...base, tokens: { ...base.tokens, color: { ...base.tokens.color, accent: "{color.text}", text: "{color.accent}" } } },
      ]),
    ).toThrow(/Circular reference/);
  });

  it("rejects invalid ids with a plain message", () => {
    expect(() => resolveThemes([{ ...gitwork, id: "Not OK" }])).toThrow(/lower-case letters/);
  });

  it("names CSS variables predictably", () => {
    expect(cssVar("color.bg-elevated")).toBe("--gw-color-bg-elevated");
  });
});
