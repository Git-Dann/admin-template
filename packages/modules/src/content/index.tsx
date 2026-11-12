import type { AdminModule } from "@gitwork/admin-shell";
import { ContentList, ContentDetail } from "./page";

const BASE = { basePath: "/content" };
/** Content: collection grid (series, groups, courses) and a detail page with per-item stats. */
export function content(options: { basePath?: string; title?: string } = {}): AdminModule {
  const basePath = options.basePath ?? BASE.basePath;
  return {
    id: "content",
    title: options.title ?? "Content",
    icon: "content",
    basePath,
    permission: "content.read",
    permissions: [
      { id: "content.read", label: "View content and stats" },
      { id: "content.manage", label: "Edit content", ownable: true },
    ],
    adapters: ["content"],
    routes: [
      { path: "", component: () => <ContentList basePath={basePath} /> },
      { path: ":id", component: (p) => <ContentDetail {...p} basePath={basePath} /> },
    ],
  };
}
