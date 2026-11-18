import type { AdminModule } from "@gitwork/admin-shell";
import { RolesPage } from "./page";

/** Roles and a permission matrix (none / own / all) built from every enabled module's permissions. */
export function rbac(options: { basePath?: string; title?: string } = {}): AdminModule {
  return {
    id: "rbac",
    title: options.title ?? "Roles",
    icon: "shield",
    basePath: options.basePath ?? "/roles",
    permission: "roles.read",
    permissions: [
      { id: "roles.read", label: "View roles and permissions" },
      { id: "roles.manage", label: "Change permissions" },
    ],
    adapters: ["rbac"],
    routes: [{ path: "", component: RolesPage }],
  };
}
