import { describe, expect, it } from "vitest";
import { matchRoute, moduleHref, type AdminModule } from "../src/module";
import { resolveNav, validateConfig, type AdminConfig } from "../src/config";

const Page = () => null;
const mod = (id: string, basePath: string, paths: string[]): AdminModule => ({ id, title: id, icon: "layers", basePath, routes: paths.map((path) => ({ path, component: Page })) });
const modules = [mod("dashboard", "/", [""]), mod("content", "/content", ["", ":id", "new"]), mod("themes", "/themes", ["", ":id"])];

describe("matchRoute", () => {
  it("matches index, params and static segments", () => {
    expect(matchRoute("/", modules)?.module.id).toBe("dashboard");
    expect(matchRoute("/content", modules)?.route.path).toBe("");
    expect(matchRoute("/content/abc%20def", modules)?.params).toEqual({ id: "abc def" });
    expect(matchRoute("/content/new", modules)?.route.path).toBe("new");
    expect(matchRoute("/nope", modules)).toBeNull();
  });

  it("builds hrefs", () => {
    expect(moduleHref(modules[1]!, ":id", { id: "x y" })).toBe("/content/x%20y");
    expect(moduleHref(modules[0]!)).toBe("/");
  });
});

describe("config", () => {
  const base = { brand: { productName: "Test", theme: "gitwork" }, modules, roles: [{ id: "owner", label: "Owner", permissions: ["*"] }] } as unknown as AdminConfig;

  it("generates nav from modules when none is given", () => {
    expect(resolveNav(base)[0]!.items.map((i) => i.href)).toEqual(["/", "/content", "/themes"]);
  });

  it("explains missing adapters in plain English", () => {
    const withNeeds = { ...base, adapters: {}, modules: [{ ...modules[1]!, adapters: ["content"] }] } as unknown as AdminConfig;
    expect(validateConfig(withNeeds)).toEqual(['Module "content" needs the "content" adapter. Add it to adapters in admin.config.ts.']);
  });
});
