/** Shared fixture for shell and module stories: a full config on mock data, already signed in. */
import type { RoleDefinition } from "@gitwork/data";
import { createMockAdapters } from "@gitwork/data/mock";
import type { AdminConfig } from "./config";
import type { AdminModule } from "./module";

export const storyRoles: RoleDefinition[] = [
  { id: "owner", label: "Owner", tone: "accent", permissions: ["*"] },
  { id: "admin", label: "Admin", tone: "info", permissions: ["dashboard.*", "users.*", "reports.*", "content.*"] },
  { id: "creator", label: "Creator", tone: "success", permissions: ["dashboard.read", "content.read", "content.manage:own"] },
  { id: "viewer", label: "Viewer", tone: "neutral", permissions: ["dashboard.read", "reports.read"] },
];

export function storyConfig(modules: AdminModule[], overrides: Partial<AdminConfig> = {}): AdminConfig {
  const mock = createMockAdapters({ flavour: "streaming", roleIds: storyRoles.map((r) => r.id), ownerRoleId: "creator", roles: storyRoles, behaviour: { latency: [0, 0] }, today: new Date("2026-11-12T00:00:00Z") });
  return {
    brand: { productName: "Gitwork Admin", theme: "gitwork", version: "1.0.0" },
    modules,
    roles: storyRoles,
    adapters: {
      ...mock,
      auth: { ...mock.auth, getSession: async () => ({ user: { id: "usr_0001", name: "Priya Kaur", email: "priya@example.com", roleId: "owner" } }) },
    },
    devRolePicker: false,
    ...overrides,
  };
}
