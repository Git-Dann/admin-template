/**
 * The only file most clients change (plus their theme JSON and adapters).
 * Everything here is type-checked: hover any field for docs.
 */
import { defineAdminConfig } from "@gitwork/admin-shell";
import type { RoleDefinition } from "@gitwork/data";
import { createMockAdapters } from "@gitwork/data/mock";
import { content, coupons, dashboard, notifications, rbac, reports, themeBuilder, users } from "@gitwork/modules";

const roles: RoleDefinition[] = [
  { id: "owner", label: "Owner", tone: "accent", description: "Everything, including roles and publishing.", permissions: ["*"] },
  { id: "admin", label: "Admin", tone: "info", description: "Runs the product day to day.", permissions: ["dashboard.*", "users.*", "reports.*", "coupons.*", "content.*", "notifications.*", "themes.*", "roles.read"] },
  { id: "editor", label: "Editor", tone: "success", description: "Manages their own content.", permissions: ["dashboard.read", "content.read", "content.manage:own", "themes.read", "notifications.read"] },
  { id: "viewer", label: "Viewer", tone: "neutral", description: "Read-only access to numbers.", permissions: ["dashboard.read", "reports.read", "content.read"] },
];

export default defineAdminConfig({
  brand: {
    productName: "Starter Admin",
    theme: "gitwork",
    logo: { full: "/brand/logo.svg", mark: "/brand/mark.svg", alt: "Starter" },
    icons: "lucide",
    version: "0.1.0",
  },
  modules: [dashboard(), reports(), users(), content(), coupons(), notifications(), themeBuilder(), rbac()],
  nav: [
    {
      items: [
        { label: "Dashboard", href: "/", icon: "dashboard" },
        { label: "Reports", href: "/reports", icon: "reports", permission: "reports.read" },
      ],
    },
    {
      label: "Manage",
      items: [
        { label: "Users", href: "/users", icon: "users", permission: "users.read" },
        { label: "Content", href: "/content", icon: "content", permission: "content.read" },
        { label: "Coupons", href: "/coupons", icon: "coupons", permission: "coupons.read" },
        { label: "Notifications", href: "/notifications", icon: "megaphone", permission: "notifications.read" },
      ],
    },
    {
      label: "Settings",
      items: [
        { label: "Theme builder", href: "/themes", icon: "theme", permission: "themes.read" },
        { label: "Roles", href: "/roles", icon: "shield", permission: "roles.read" },
      ],
    },
  ],
  roles,
  // Swap any mock for a real adapter: { ...mock, reports: createReportsAdapter(apiClient) }
  adapters: createMockAdapters({ flavour: "generic", roleIds: roles.map((r) => r.id), ownerRoleId: "editor", roles }),
  features: {},
});
