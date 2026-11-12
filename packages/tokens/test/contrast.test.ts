import { describe, expect, it } from "vitest";
import { checkContrast, contrastRatio, resolveThemes } from "../src";
import gitwork from "../themes/gitwork.json";
import wedge from "../themes/wedge.json";
import fellas from "../themes/fellas.json";

describe("contrast", () => {
  it("matches known WCAG ratios", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBe(21);
    expect(contrastRatio("#FFFFFF", "#EA140D")).toBeCloseTo(4.56, 1);
  });

  it("every seeded theme meets AA in every mode", () => {
    for (const theme of resolveThemes([gitwork, wedge, fellas])) {
      const failures = checkContrast(theme).filter((r) => !r.pass);
      expect(failures, `${theme.id}: ${failures.map((f) => `${f.fg}/${f.bg}`).join(", ")}`).toEqual([]);
    }
  });

  it("flags brand red used as text on the Fellas background", () => {
    const [theme] = resolveThemes([{ ...fellas, tokens: { ...fellas.tokens, color: { ...fellas.tokens.color, "accent-text": "#EA140D" } } }]);
    const fail = checkContrast(theme!).find((r) => r.fg === "accent-text" && r.bg === "bg");
    expect(fail?.pass).toBe(false);
  });
});
