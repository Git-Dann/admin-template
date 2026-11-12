/**
 * Fellas Loaded: streaming app. Dark UI, red brand, seasonal themes.
 * Uses Heroicons to show the icon set is swappable per client.
 */
import { defineAdminConfig } from "@gitwork/admin-shell";
import type { RoleDefinition } from "@gitwork/data";
import { createMockAdapters } from "@gitwork/data/mock";
import { content, coupons, dashboard, notifications, rbac, reports, themeBuilder, users } from "@gitwork/modules";

const roles: RoleDefinition[] = [
  { id: "owner", label: "Owner", tone: "accent", description: "Full access, including roles and publishing.", permissions: ["*"] },
  { id: "producer", label: "Producer", tone: "warning", description: "Runs series, notifications and seasonal themes.", permissions: ["dashboard.read", "content.*", "notifications.*", "themes.*", "coupons.read"] },
  { id: "host", label: "Host", tone: "success", description: "Manages their own series.", permissions: ["dashboard.read", "content.read", "content.manage:own", "themes.read"] },
  { id: "finance", label: "Finance", tone: "info", description: "Revenue, codes and exports.", permissions: ["dashboard.read", "reports.*", "coupons.*"] },
  { id: "support", label: "Support", tone: "neutral", description: "Helps subscribers.", permissions: ["dashboard.read", "users.read", "users.manage", "coupons.read"] },
];

export default defineAdminConfig({
  brand: {
    productName: "Fellas Admin",
    theme: "fellas",
    logo: { full: "/brand/logo.svg", mark: "/brand/mark.svg", alt: "Fellas Loaded" },
    icons: "heroicons",
    version: "4.12.0",
  },
  modules: [
    dashboard(),
    reports(),
    content({ title: "Series", basePath: "/series" }),
    notifications(),
    themeBuilder(),
    users({ title: "Subscribers", basePath: "/subscribers" }),
    coupons(),
    rbac({ title: "Team & roles", basePath: "/team" }),
  ],
  nav: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/", icon: "dashboard" },
        { label: "Reports", href: "/reports", icon: "reports", permission: "reports.read" },
      ],
    },
    {
      label: "Content",
      items: [
        { label: "Series", href: "/series", icon: "film", permission: "content.read" },
        { label: "Notifications", href: "/notifications", icon: "megaphone", permission: "notifications.read" },
        { label: "Theme builder", href: "/themes", icon: "theme", permission: "themes.read" },
      ],
    },
    {
      label: "Growth",
      items: [
        { label: "Subscribers", href: "/subscribers", icon: "users", permission: "users.read" },
        { label: "Coupons", href: "/coupons", icon: "coupons", permission: "coupons.read" },
      ],
    },
    { label: "Settings", items: [{ label: "Team & roles", href: "/team", icon: "shield", permission: "roles.read" }] },
  ],
  roles,
  adapters: createMockAdapters({ flavour: "streaming", roleIds: roles.map((r) => r.id), ownerRoleId: "host", roles, seed: 42, links: { users: "/subscribers" } }),
  features: {},
});
