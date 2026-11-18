import type { AdminModule } from "@gitwork/admin-shell";
import { ThemeEditor } from "./editor";
import { ThemeList } from "./list";

export * from "./logic";
export { buildPack, packManifest, type PackContext, type PackPlatform } from "./export";
export { ThemePreview } from "./preview";

/**
 * Seasonal theme builder: list, editor with asset slots (splash, app icon, background,
 * colour tokens), live preview, publish and per-platform asset pack export.
 */
export function themeBuilder(options: { basePath?: string; title?: string } = {}): AdminModule {
  const basePath = options.basePath ?? "/themes";
  return {
    id: "theme-builder",
    title: options.title ?? "Theme builder",
    icon: "theme",
    basePath,
    permission: "themes.read",
    permissions: [
      { id: "themes.read", label: "View seasonal themes" },
      { id: "themes.manage", label: "Create and edit themes" },
      { id: "themes.publish", label: "Publish themes" },
    ],
    adapters: ["themes"],
    routes: [
      { path: "", component: () => <ThemeList basePath={basePath} /> },
      { path: "new", component: (p) => <ThemeEditor {...p} basePath={basePath} />, permission: "themes.manage" },
      { path: ":id", component: (p) => <ThemeEditor {...p} basePath={basePath} /> },
    ],
    badge: async (a) => ((await a.themes.list()).some((t) => t.status === "live") ? "new" : undefined),
  };
}
