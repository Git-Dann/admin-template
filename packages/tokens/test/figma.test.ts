import { describe, expect, it } from "vitest";
import { autoMatch, mapFigmaVariables, readFigmaVariables } from "../src";
import rest from "./fixtures/figma-rest.json";
import light from "./fixtures/Light.tokens.json";
import dark from "./fixtures/Dark.tokens.json";

describe("figma import", () => {
  it("reads the REST format, resolving aliases across collections", () => {
    const vars = readFigmaVariables([{ json: rest }], { collections: ["Semantic"] });
    const brand = vars.find((v) => v.name === "Brand/Red")!;
    expect(brand.values.Dark).toBe("#cc0d0d");
    const result = mapFigmaVariables(vars, { tokens: { "Brand/Red": "color.accent" }, modes: { Dark: "dark" } });
    expect(result.tokens.color!.accent).toBe("#cc0d0d");
    expect(result.tokens.radius!.md).toBe("12px");
    expect(result.unmapped).toEqual(["Something/Unknown"]);
  });

  it("reads native DTCG exports, one file per mode", () => {
    const vars = readFigmaVariables([{ json: light }, { json: dark }]);
    const result = mapFigmaVariables(vars);
    expect(result.tokens.color!.accent).toEqual({ light: "#01623F", dark: "#3DB585" });
    expect(result.tokens.color!["surface-raised"]).toEqual({ light: "#F0F5F0", dark: "#17241E" });
    expect(result.primitives).toEqual(["Primitives/Green/500"]);
    expect(result.unmapped).toEqual([]);
  });

  it("auto-matches common naming styles", () => {
    expect(autoMatch("Colours/Surface Raised", "color")).toBe("color.surface-raised");
    expect(autoMatch("Semantic/Text/Muted", "color")).toBe("color.text-muted");
    expect(autoMatch("Text/textOnAccent", "color")).toBe("color.text-on-accent");
    expect(autoMatch("Corner radius/lg", "number")).toBe("radius.lg");
    expect(autoMatch("Brand/Red", "color")).toBeNull();
  });
});
