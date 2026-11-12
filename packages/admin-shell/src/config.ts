import type { Adapters, RoleDefinition } from "@gitwork/data";
import type { IconLike, IconSet, IconSetName } from "@gitwork/ui/icons";
import type { AdminModule } from "./module";

export interface NavItem {
  label: string;
  href: string;
  icon?: IconLike;
  /** Static badge. Modules can also provide a live one. */
  badge?: number | "new";
  /** Hide unless the user has this permission. Defaults to the module's permission. */
  permission?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface AdminConfig {
  brand: {
    /** Shown in the sidebar, browser tab and login screen: "Fellas Admin". */
    productName: string;
    /** Theme id from packages/tokens/themes/<id>.json. */
    theme: string;
    logo?: { full: string; mark?: string; alt?: string };
    /** Icon set for the whole app. */
    icons?: IconSetName;
    /** Swap individual icons for brand-specific ones. */
    iconOverrides?: Partial<IconSet>;
    /** Shown in the sidebar footer. */
    version?: string;
  };
  /** Enabled modules, in order. Nav is generated from these unless `nav` is set. */
  modules: AdminModule[];
  /**
   * Sidebar groups. Optional: when omitted, one group is generated from `modules`.
   * Items without a matching module still render (for external links or custom pages).
   */
  nav?: NavGroup[];
  roles: RoleDefinition[];
  /** Every adapter. Spread the mocks and override what you've built: { ...mock, reports: myReports }. */
  adapters: Adapters;
  /** Feature flags, read with useFeature("flag"). */
  features?: Record<string, boolean>;
  /** Shown in the login screen's dev role picker (mock auth only). */
  devRolePicker?: boolean;
}

/** Identity function that gives admin.config.ts full type checking and autocomplete. */
export function defineAdminConfig(config: AdminConfig): AdminConfig {
  return config;
}

/** Nav to render: explicit groups, or one group generated from enabled modules. */
export function resolveNav(config: AdminConfig): NavGroup[] {
  if (config.nav) return config.nav;
  return [
    {
      items: config.modules.map((m) => ({ label: m.title, href: m.basePath, icon: m.icon, permission: m.permission })),
    },
  ];
}

/** Startup checks with readable messages, so misconfiguration fails loudly in dev. */
export function validateConfig(config: AdminConfig): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const m of config.modules) {
    if (ids.has(m.id)) problems.push(`Module "${m.id}" is enabled twice.`);
    ids.add(m.id);
    for (const key of m.adapters ?? []) {
      if (!config.adapters[key]) problems.push(`Module "${m.id}" needs the "${key}" adapter. Add it to adapters in admin.config.ts.`);
    }
  }
  const roleIds = new Set(config.roles.map((r) => r.id));
  if (roleIds.size === 0) problems.push("Define at least one role in admin.config.ts.");
  for (const group of config.nav ?? []) {
    for (const item of group.items) {
      if (!item.href.startsWith("/") && !item.href.startsWith("http")) problems.push(`Nav item "${item.label}" href should start with "/".`);
    }
  }
  return problems;
}
