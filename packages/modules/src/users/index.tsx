import type { AdminModule } from "@gitwork/admin-shell";
import { UsersPage } from "./page";

/** Users: searchable, filterable list with a detail drawer, role change and suspend. */
export function users(options: { basePath?: string; title?: string } = {}): AdminModule {
  return {
    id: "users",
    title: options.title ?? "Users",
    icon: "users",
    basePath: options.basePath ?? "/users",
    permission: "users.read",
    permissions: [
      { id: "users.read", label: "View users" },
      { id: "users.manage", label: "Suspend and reactivate users" },
      { id: "users.roles", label: "Change user roles" },
    ],
    adapters: ["users"],
    routes: [{ path: "", component: UsersPage }],
  };
}
