/**
 * Wedge: golf community app. Light UI, green brand.
 * Creators run golf groups and can only manage their own (own-scope permissions).
 */
import { defineAdminConfig } from "@gitwork/admin-shell";
import type { RoleDefinition } from "@gitwork/data";
import { createMockAdapters } from "@gitwork/data/mock";
import { content, coupons, dashboard, notifications, rbac, reports, users } from "@gitwork/modules";

const roles: RoleDefinition[] = [
  { id: "owner", label: "Owner", tone: "accent", description: "Full access, including roles.", permissions: ["*"] },
  { id: "admin", label: "Admin", tone: "info", description: "Runs Wedge day to day.", permissions: ["dashboard.*", "users.*", "reports.*", "coupons.*", "content.*", "notifications.*", "roles.read"] },
  { id: "creator", label: "Creator", tone: "success", description: "Runs golf groups. Can only manage their own.", permissions: ["dashboard.read", "content.read", "content.manage:own", "notifications.read"] },
  { id: "viewer", label: "Viewer", tone: "neutral", description: "Read-only access to numbers.", permissions: ["dashboard.read", "reports.read", "content.read"] },
];

export default defineAdminConfig({
  brand: {
    productName: "Wedge Admin",
    theme: "wedge",
    // Real wordmark from the Wedge Figma (white, for the green sidebar).
    logo: { full: "/brand/wedge-wordmark.svg", alt: "Wedge", badge: "Admin console" },
    icons: "heroicons",
    // Owners and admins get the premium dark green; everyone else gets brand green.
    variantByRole: { owner: "premium", admin: "premium" },
    version: "2.4.0",
  },
  modules: [
    dashboard(),
    reports(),
    users({ title: "Members", basePath: "/members" }),
    content({ title: "Groups", basePath: "/groups" }),
    coupons({ title: "Promotions", basePath: "/promotions" }),
    notifications(),
    rbac(),
  ],
  nav: [
    {
      items: [
        { label: "Dashboard", href: "/", icon: "dashboard" },
        { label: "Reports", href: "/reports", icon: "reports", permission: "reports.read" },
      ],
    },
    {
      label: "Community",
      items: [
        { label: "Members", href: "/members", icon: "users", permission: "users.read" },
        { label: "Groups", href: "/groups", icon: "flag", permission: "content.read" },
      ],
    },
    {
      label: "Engage",
      items: [
        { label: "Promotions", href: "/promotions", icon: "coupons", permission: "coupons.read" },
        { label: "Notifications", href: "/notifications", icon: "megaphone", permission: "notifications.read" },
      ],
    },
    { label: "Settings", items: [{ label: "Roles", href: "/roles", icon: "shield", permission: "roles.read" }] },
  ],
  roles,
  adapters: createMockAdapters({ flavour: "golf", roleIds: roles.map((r) => r.id), ownerRoleId: "creator", roles, seed: 7, links: { users: "/members" } }),
  features: {},
});
