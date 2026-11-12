import { describe, expect, it } from "vitest";
import themes from "@gitwork/tokens/themes.json";
import type { ResolvedTheme } from "@gitwork/tokens";
import type { AppBuild } from "@gitwork/data";
import { applyOverrides, checkImageSize, iconRelease, IMAGE_RULES, importColourTokens, publishBlockers, seasonalContrast, seasonalCss, slugify, validateLottie } from "../src/theme-builder/logic";

const fellas = (themes as ResolvedTheme[]).find((t) => t.id === "fellas")!;
const lottie = { v: "5.12.1", fr: 60, ip: 0, op: 180, w: 1080, h: 1920, layers: [] };

describe("Lottie validation", () => {
  it("accepts a valid file and describes it", () => {
    expect(validateLottie(lottie)).toEqual({ meta: "Lottie 5.12.1 · 1080×1920 · 3.0s · 60fps" });
  });
  it("names missing keys", () => {
    expect(validateLottie({ v: "5" }).error).toMatch(/missing "fr", "ip", "op", "w", "h", "layers"/);
  });
  it("warns about long or landscape animations", () => {
    expect(validateLottie({ ...lottie, op: 600 }).warning).toMatch(/10.0s/);
    expect(validateLottie({ ...lottie, w: 1920, h: 1080 }).warning).toMatch(/Landscape/);
  });
  it("rejects linked (non-embedded) images", () => {
    expect(validateLottie({ ...lottie, assets: [{ id: "a", p: "img_0.png", u: "images/" }] }).error).toMatch(/embedded/);
  });
});

describe("image rules", () => {
  it("checks shape and minimum size", () => {
    expect(checkImageSize(1024, 1024, IMAGE_RULES.appIcon).error).toBeUndefined();
    expect(checkImageSize(1024, 1000, IMAGE_RULES.appIcon).error).toMatch(/square/);
    expect(checkImageSize(512, 512, IMAGE_RULES.appIcon).error).toMatch(/Too small/);
    expect(checkImageSize(1920, 1080, IMAGE_RULES.backgroundMobile).error).toMatch(/portrait/);
  });
});

describe("colour import", () => {
  it("reads a flat map and skips unknown names", () => {
    const r = importColourTokens({ accent: "#C8102E", sparkle: "#fff", bg: { dark: "#100" }, text: "not-a-colour" });
    expect(r.tokens).toEqual({ accent: "#C8102E", bg: { dark: "#100" } });
    expect(r.ignored).toEqual(["sparkle", "text (not a colour)"]);
  });
  it("reads a Gitwork theme file", () => {
    expect(importColourTokens({ id: "x", tokens: { color: { accent: { light: "#123456" } } } }).source).toBe("gitwork");
  });
  it("reads a Figma DTCG export", () => {
    const figma = { Colour: { Accent: { $type: "color", $value: { colorSpace: "srgb", components: [1, 0, 0], alpha: 1, hex: "#FF0000" } } } };
    const r = importColourTokens(figma);
    expect(r.source).toBe("figma");
    expect(r.tokens.accent).toBe("#FF0000");
  });
});

describe("seasonal colours", () => {
  it("applies overrides per mode and checks contrast against the client theme", () => {
    const merged = applyOverrides(fellas, { accent: "#00AA00" });
    expect(merged.values.dark!["color.accent"]).toBe("#00AA00");
    expect(seasonalContrast(fellas, { "text-muted": "#333333" }).some((r) => r.fg === "text-muted")).toBe(true);
    expect(seasonalContrast(fellas, { accent: "#EA140D" })).toEqual([]);
  });
  it("generates a data-season stylesheet", () => {
    const css = seasonalCss("fellas", "christmas-2026", { accent: { light: "#C00", dark: "#F55" }, secondary: "#0A0" });
    expect(css).toContain('[data-theme="fellas"][data-season="christmas-2026"] {');
    expect(css).toContain("--gw-color-accent: #C00;");
    expect(css).toContain('[data-mode="dark"] {\n  --gw-color-accent: #F55;');
    expect(slugify("Valentine’s Day 2027!")).toBe("valentines-day-2027");
  });
});

describe("native icon release status", () => {
  const builds: AppBuild[] = [
    { platform: "ios", version: "4.12.0", status: "live", alternateIcons: ["halloween"] },
    { platform: "ios", version: "4.13.0", status: "in review", alternateIcons: ["halloween", "christmas"] },
  ];
  it("is honest about what ships where", () => {
    expect(iconRelease("halloween", "ios", builds)).toMatchObject({ state: "shipped", build: { version: "4.12.0" } });
    expect(iconRelease("christmas", "ios", builds)).toMatchObject({ state: "in-review", build: { version: "4.13.0" } });
    expect(iconRelease("valentines", "ios", builds).state).toBe("requires-release");
    expect(iconRelease("halloween", "android", builds).state).toBe("requires-release");
  });
});

describe("publish blockers", () => {
  const base = { name: "Xmas", platforms: ["ios" as const], startsAt: undefined, endsAt: undefined, assets: { splash: { enabled: false }, appIcon: { enabled: false }, background: { enabled: false }, colours: { enabled: true, tokens: { accent: "#C00" } } } };
  it("passes a minimal valid theme and explains problems otherwise", () => {
    expect(publishBlockers(base)).toEqual([]);
    expect(publishBlockers({ ...base, name: "", platforms: [], assets: { ...base.assets, colours: { enabled: false }, appIcon: { enabled: true } } })).toEqual([
      "Give the theme a name.",
      "Choose at least one platform.",
      "App icon is on but no icon is uploaded.",
    ]);
  });
});
