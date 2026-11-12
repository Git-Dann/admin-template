import type { ComponentType } from "react";
import type { AdapterKey, Adapters } from "@gitwork/data";
import type { IconLike } from "@gitwork/ui/icons";
import type { PermissionDefinition } from "./rbac";

export interface ModuleRouteProps {
  /** Named segments from the route path, e.g. { id: "abc" } for ":id". */
  params: Record<string, string>;
}

export interface ModuleRoute {
  /** Relative to the module's basePath: "" for the index, ":id", "new", ":id/edit". */
  path: string;
  component: ComponentType<ModuleRouteProps>;
  /** Permission required for this route on top of the module's. */
  permission?: string;
}

/**
 * A feature module. Modules are plain objects, created by factories in @gitwork/modules
 * (e.g. `reports({ basePath: "/finance" })`), and switched on per client in admin.config.ts.
 */
export interface AdminModule {
  id: string;
  title: string;
  icon: IconLike;
  /** URL prefix, e.g. "/reports". "/" for the dashboard. */
  basePath: string;
  routes: ModuleRoute[];
  /** Permission required to see the module at all. */
  permission?: string;
  /** Permissions this module checks, shown in the RBAC matrix. */
  permissions?: PermissionDefinition[];
  /** Adapters the module needs. Missing ones are reported at startup. */
  adapters?: AdapterKey[];
  /** Optional nav badge (count or "new"), loaded once per session. */
  badge?: (adapters: Adapters) => Promise<number | "new" | undefined>;
}

export interface RouteMatch {
  module: AdminModule;
  route: ModuleRoute;
  params: Record<string, string>;
}

const trim = (s: string) => s.replace(/^\/+|\/+$/g, "");

/** Match a pathname against every module route. Most specific (most segments, fewest params) wins. */
export function matchRoute(pathname: string, modules: readonly AdminModule[]): RouteMatch | null {
  const parts = trim(pathname).split("/").filter(Boolean);
  let best: (RouteMatch & { score: number }) | null = null;
  for (const module of modules) {
    for (const route of module.routes) {
      const pattern = [trim(module.basePath), trim(route.path)].filter(Boolean).join("/").split("/").filter(Boolean);
      if (pattern.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let score = 0;
      const ok = pattern.every((seg, i) => {
        if (seg.startsWith(":")) {
          params[seg.slice(1)] = decodeURIComponent(parts[i]!);
          return true;
        }
        score += 2;
        return seg === parts[i];
      });
      if (ok && (!best || score > best.score)) best = { module, route, params, score };
    }
  }
  return best && { module: best.module, route: best.route, params: best.params };
}

/** Build a path inside a module: href(module, ":id", { id }) */
export function moduleHref(module: Pick<AdminModule, "basePath">, path = "", params: Record<string, string> = {}): string {
  const filled = path.replace(/:(\w+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ""));
  const joined = [trim(module.basePath), trim(filled)].filter(Boolean).join("/");
  return `/${joined}`;
}
