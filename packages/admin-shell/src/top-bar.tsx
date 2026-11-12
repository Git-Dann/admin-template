"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  formatDateTime,
  Icon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  renderIcon,
  RoleBadge,
} from "@gitwork/ui";
import themes from "@gitwork/tokens/themes.json";
import type { ResolvedTheme } from "@gitwork/tokens";
import { can } from "./rbac";
import { resolveNav } from "./config";
import { useAdminConfig, useSession } from "./context";
import { usePageMeta } from "./page-header";
import { useThemeMode } from "./theme-mode";

/** Global search: jumps to any page in the nav. ⌘K / Ctrl+K focuses it. */
function GlobalSearch() {
  const config = useAdminConfig();
  const { user } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () => resolveNav(config).flatMap((g) => g.items.filter((i) => !i.permission || can(user, i.permission)).map((i) => ({ ...i, group: g.label }))),
    [config, user],
  );
  const results = q ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) : items;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative hidden w-full max-w-sm md:block">
          <Icon name="search" size="sm" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls="global-search-results"
            aria-label="Search pages"
            placeholder="Search…"
            value={q}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setIndex(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setIndex((i) => Math.min(i + 1, results.length - 1));
              if (e.key === "ArrowUp") setIndex((i) => Math.max(i - 1, 0));
              if (e.key === "Enter" && results[index]) go(results[index].href);
              if (e.key === "Escape") setOpen(false);
            }}
            className="h-control w-full rounded-md border border-border bg-surface pl-10 pr-14 text-sm text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-sm border border-border px-1.5 text-[11px] text-text-muted">⌘K</kbd>
        </div>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} className="w-(--radix-popover-trigger-width) p-1">
        <ul id="global-search-results" role="listbox" aria-label="Pages">
          {results.map((r, i) => (
            <li key={r.href} role="option" aria-selected={i === index}>
              <button
                type="button"
                onClick={() => go(r.href)}
                onMouseEnter={() => setIndex(i)}
                className={cn("flex h-control-sm w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm", i === index ? "bg-surface-raised text-text" : "text-text-muted")}
              >
                {renderIcon(r.icon, { size: "sm" })}
                <span className="flex-1">{r.label}</span>
                {r.group && <span className="text-xs text-text-muted">{r.group}</span>}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function Notifications() {
  const inbox = useAdminConfig().adapters.inbox;
  const client = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["inbox"], queryFn: () => inbox.list() });
  const markRead = useMutation({ mutationFn: () => inbox.markAllRead(), onSuccess: () => client.invalidateQueries({ queryKey: ["inbox"] }) });
  const unread = data.filter((n) => !n.read).length;
  const router = useRouter();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex size-control shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-muted hover:text-text focus-ring"
        >
          <Icon name="notifications" />
          {unread > 0 && <span aria-hidden className="absolute right-2.5 top-2.5 size-2 rounded-pill bg-accent ring-2 ring-surface" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold text-text">Notifications</p>
          {unread > 0 && (
            <Button variant="link" size="sm" onClick={() => markRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        {data.length === 0 ? (
          <EmptyState compact icon="notifications" title="You're all caught up" />
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {data.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => n.href && router.push(n.href)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-raised focus-ring">
                  <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-pill", n.read ? "bg-transparent" : "bg-accent")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-text">{n.title}</span>
                    {n.body && <span className="block text-xs text-text-muted">{n.body}</span>}
                    <span className="mt-0.5 block text-xs text-text-muted">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AccountMenu() {
  const config = useAdminConfig();
  const { user, signOut, switchRole } = useSession();
  const [mode, setMode] = useThemeMode();
  const theme = (themes as ResolvedTheme[]).find((t) => t.id === config.brand.theme);
  const canToggleMode = (theme?.modes.supported.length ?? 0) > 1;
  if (!user) return null;
  const role = config.roles.find((r) => r.id === user.roleId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-control shrink-0 items-center gap-3 rounded-md pl-1 pr-2 hover:bg-surface-raised focus-ring">
        <Avatar name={user.name} src={user.avatarUrl} size={36} />
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block truncate text-sm font-medium leading-tight text-text">{user.name}</span>
          <span className="block truncate text-xs leading-tight text-text-muted">{user.roleLabel}</span>
        </span>
        <Icon name="chevron-down" size="sm" className="hidden text-text-muted lg:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-text">{user.name}</p>
          <p className="truncate text-xs text-text-muted">{user.email}</p>
          <RoleBadge role={user.roleLabel} tone={role?.tone} className="mt-2" />
        </div>
        <DropdownMenuSeparator />
        {canToggleMode && (
          <DropdownMenuItem icon={mode === "dark" ? "sun" : "moon"} onSelect={() => setMode(mode === "dark" ? "light" : "dark")}>
            {mode === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
        )}
        {switchRole && config.devRolePicker !== false && (
          <>
            <DropdownMenuLabel>View as (mock auth)</DropdownMenuLabel>
            {config.roles.map((r) => (
              <DropdownMenuItem key={r.id} icon={r.id === user.roleId ? "check" : undefined} className={r.id === user.roleId ? undefined : "pl-8.5"} onSelect={() => void switchRole(r.id)}>
                {r.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem icon="logout" onSelect={() => void signOut()}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Top bar. Every control shares one height (h-control, 44px). */
export function TopBar({ onMenu }: { onMenu?: () => void }) {
  const { title, subtitle } = usePageMeta();
  return (
    <header className="sticky top-0 z-30 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur lg:px-8">
      {onMenu && (
        <button type="button" onClick={onMenu} aria-label="Open menu" className="flex size-control shrink-0 items-center justify-center rounded-md text-text hover:bg-surface-raised focus-ring lg:hidden">
          <Icon name="menu" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold leading-tight text-text lg:text-xl">{title}</h1>
        {subtitle && <p className="truncate text-sm text-text-muted">{subtitle}</p>}
      </div>
      <GlobalSearch />
      <Notifications />
      <AccountMenu />
    </header>
  );
}
