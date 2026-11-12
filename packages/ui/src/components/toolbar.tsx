"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon, renderIcon, type IconLike } from "../icons";
import { Input } from "./input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./overlays";
import { CountBadge } from "./badges";

/**
 * Toolbar row. Every control inside shares one height (h-control) so chips, pills,
 * inputs and buttons line up exactly.
 */
export function Toolbar({ children, actions, className }: { children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 [&>*]:shrink-0", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface ChipOption<V extends string = string> {
  value: V;
  label: ReactNode;
  count?: number;
  icon?: IconLike;
}

/** Single-select filter chips: All · Live · Scheduled · Draft. */
export function FilterChips<V extends string>({
  options,
  value,
  onChange,
  label = "Filter",
  className,
}: {
  options: ChipOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-control items-center gap-2 rounded-pill border px-4 text-sm font-medium transition-colors focus-ring",
              active ? "border-accent bg-accent-subtle text-accent-text" : "border-border bg-surface text-text-muted hover:text-text hover:border-border-strong",
            )}
          >
            {renderIcon(o.icon, { size: "sm" })}
            {o.label}
            {o.count !== undefined && <span className={cn("numeric text-xs", active ? "text-accent-text" : "text-text-muted")}>{o.count.toLocaleString("en-GB")}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact dropdown filter pill: "Platform: iOS, Android ▾".
 * Multi-select by default; pass `single` for one value.
 */
export function FilterPill<V extends string>({
  label,
  options,
  value,
  onChange,
  single,
  icon,
}: {
  label: string;
  options: ChipOption<V>[];
  value: V[];
  onChange: (value: V[]) => void;
  single?: boolean;
  icon?: IconLike;
}) {
  const selected = options.filter((o) => value.includes(o.value));
  const summary = selected.length === 0 ? "All" : selected.length <= 2 ? selected.map((o) => o.label).join(", ") : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-control items-center gap-2 rounded-pill border px-4 text-sm focus-ring",
          selected.length ? "border-accent bg-accent-subtle text-accent-text" : "border-border bg-surface text-text hover:border-border-strong",
        )}
      >
        {renderIcon(icon, { size: "sm" })}
        <span className="font-medium">{label}</span>
        {summary !== null ? <span className={selected.length ? undefined : "text-text-muted"}>{summary}</span> : <CountBadge value={selected.length} />}
        <Icon name="chevron-down" size="sm" className="opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {options.map((o) =>
          single ? (
            <DropdownMenuItem key={o.value} onSelect={() => onChange([o.value])} icon={value[0] === o.value ? "check" : undefined} className={value[0] === o.value ? undefined : "pl-8.5"}>
              {o.label}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={value.includes(o.value)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(checked) => onChange(checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
            >
              {o.label}
              {o.count !== undefined && <span className="ml-auto text-xs text-text-muted numeric">{o.count}</span>}
            </DropdownMenuCheckboxItem>
          ),
        )}
        {value.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])} icon="close">Clear</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Debounced search input for toolbars. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  delay = 200,
  className,
  "aria-label": ariaLabel = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    // Parent changed the value (e.g. "clear filters"): adopt it.
    setSynced(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), delay);
    return () => clearTimeout(t);
  }, [draft, value, delay, onChange]);
  return (
    <div className={cn("w-full sm:w-72", className)}>
      <Input type="search" icon="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} aria-label={ariaLabel} />
    </div>
  );
}
