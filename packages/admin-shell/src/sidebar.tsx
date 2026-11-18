"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { CountBadge, cn, Icon, IndicatorBar, renderIcon, Tooltip } from "@gitwork/ui";
import { can } from "./rbac";
import { resolveNav, type NavItem } from "./config";
import { useAdminConfig, useSession } from "./context";
import { BrandLogo } from "./brand-logo";

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useNavBadges(): Record<string, number | "new" | undefined> {
  const config = useAdminConfig();
  const withBadges = config.modules.filter((m) => m.badge);
  const results = useQueries({
    queries: withBadges.map((m) => ({ queryKey: ["nav-badge", m.id], queryFn: () => m.badge!(config.adapters), staleTime: 60_000 })),
  });
  return Object.fromEntries(withBadges.map((m, i) => [m.basePath, results[i]?.data]));
}

function NavLink({ item, collapsed, badge, onNavigate }: { item: NavItem; collapsed: boolean; badge?: number | "new"; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  const active = isActive(pathname, item.href);
  const shownBadge = item.badge ?? badge;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-control items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-ring",
        active ? "bg-sidebar-active text-sidebar-active-text" : "text-sidebar-text-muted hover:bg-sidebar-text/10 hover:text-sidebar-text",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <IndicatorBar className="bg-sidebar-indicator" />}
      {renderIcon(item.icon ?? "layers", { size: "md" })}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {shownBadge !== undefined && shownBadge !== 0 &&
        (collapsed ? (
          <span aria-label={shownBadge === "new" ? "New" : `${shownBadge} new`} className="absolute right-3 top-2.5 size-2 rounded-pill bg-accent" />
        ) : (
          <CountBadge value={shownBadge} tone={shownBadge === "new" ? "success" : "accent"} />
        ))}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function Sidebar({ collapsed = false, onToggle, onNavigate, className }: { collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void; className?: string }) {
  const config = useAdminConfig();
  const { user, signOut } = useSession();
  const badges = useNavBadges();
  const groups = resolveNav(config)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(user, i.permission)) }))
    .filter((g) => g.items.length > 0);
  const { version } = config.brand;

  return (
    <nav aria-label="Main" className={cn("flex h-full flex-col bg-sidebar text-sidebar-text", className)}>
      <div className={cn("flex min-h-topbar shrink-0 items-center gap-3 px-5 py-4", collapsed && "justify-center px-0")}>
        <BrandLogo collapsed={collapsed} />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi}>
            {group.label && !collapsed && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-text-muted">{group.label}</p>}
            {group.label && collapsed && gi > 0 && <div className="mx-3 mb-2 h-px bg-sidebar-border" />}
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} collapsed={collapsed} badge={badges[item.href]} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="shrink-0 space-y-1 border-t border-sidebar-border p-3">
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("flex h-control w-full items-center gap-3 rounded-md px-3 text-sm text-sidebar-text-muted hover:bg-sidebar-text/10 hover:text-sidebar-text focus-ring", collapsed && "justify-center px-0")}
          >
            <Icon name="sidebar" />
            {!collapsed && "Collapse"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          className={cn("flex h-control w-full items-center gap-3 rounded-md px-3 text-sm text-sidebar-text-muted hover:bg-sidebar-text/10 hover:text-sidebar-text focus-ring", collapsed && "justify-center px-0")}
          aria-label={collapsed ? "Log out" : undefined}
        >
          <Icon name="logout" />
          {!collapsed && <span className="flex-1 text-left">Log out</span>}
          {!collapsed && version && <span className="text-xs text-sidebar-text-muted numeric">v{version}</span>}
        </button>
      </div>
    </nav>
  );
}
