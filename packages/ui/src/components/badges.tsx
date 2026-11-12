"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon, renderIcon, type IconLike } from "../icons";
import { toneDot, toneSoft, type Tone } from "./tone";

export type { Tone };

const pill = "inline-flex items-center gap-1.5 rounded-pill font-medium whitespace-nowrap";

/** Default status → tone mapping. Modules pass their own status strings; unknown ones are neutral. */
export const STATUS_TONES: Record<string, Tone> = {
  live: "success",
  active: "success",
  published: "success",
  paid: "success",
  sent: "success",
  approved: "success",
  scheduled: "info",
  pending: "info",
  processing: "info",
  invited: "info",
  draft: "neutral",
  ended: "neutral",
  archived: "neutral",
  expired: "neutral",
  inactive: "neutral",
  paused: "warning",
  review: "warning",
  "requires release": "warning",
  failed: "danger",
  suspended: "danger",
  banned: "danger",
  refunded: "danger",
};

export function StatusPill({
  status,
  tone,
  label,
  size = "md",
  className,
}: {
  status: string;
  tone?: Tone;
  label?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = tone ?? STATUS_TONES[status.toLowerCase()] ?? "neutral";
  return (
    <span className={cn(pill, toneSoft[t], size === "md" ? "h-6 px-2.5 text-xs" : "h-5 px-2 text-[11px]", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-pill", toneDot[t])} />
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/** Role badge. Tone comes from the client's role config (admin.config.ts `roles[].tone`). */
export function RoleBadge({ role, tone = "accent", icon, className }: { role: string; tone?: Tone; icon?: IconLike; className?: string }) {
  return (
    <span className={cn(pill, toneSoft[tone], "h-6 px-2.5 text-xs", className)}>
      {renderIcon(icon, { size: 12 })}
      {role}
    </span>
  );
}

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  onRemove?: () => void;
  removeLabel?: string;
}

/** Neutral metadata label (genre, platform, country). Optionally removable. */
export function Tag({ tone = "neutral", onRemove, removeLabel = "Remove", className, children, ...props }: TagProps) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-sm px-2 text-xs font-medium", toneSoft[tone], className)} {...props}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`${removeLabel} ${typeof children === "string" ? children : ""}`.trim()} className="-mr-1 rounded-sm p-0.5 hover:bg-surface focus-ring">
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  );
}

/** Monospace code (promo codes, IDs) with a copy button. */
export function CodeChip({ code, copyable = true, className }: { code: string; copyable?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context) */
    }
  };
  return (
    <span className={cn("inline-flex h-7 items-center gap-1 rounded-sm border border-dashed border-border-strong bg-surface-raised pl-2 font-mono text-xs tracking-wide text-text", !copyable && "pr-2", className)}>
      {code}
      {copyable && (
        <button
          type="button"
          onClick={copy}
          className="flex h-full items-center px-1.5 text-text-muted hover:text-text focus-ring rounded-r-sm"
          aria-label={copied ? `Copied ${code}` : `Copy ${code}`}
        >
          <Icon name={copied ? "check" : "copy"} size={14} className={copied ? "text-success" : undefined} />
        </button>
      )}
      <span role="status" className="sr-only">{copied ? "Copied" : ""}</span>
    </span>
  );
}

/** Small count / "New" badge used in nav and tabs. */
export function CountBadge({ value, tone = "accent", className }: { value: number | "new" | string; tone?: Tone; className?: string }) {
  const label = value === "new" ? "New" : typeof value === "number" && value > 99 ? "99+" : String(value);
  return (
    <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11px] font-semibold numeric", tone === "accent" ? "bg-accent text-text-on-accent" : toneSoft[tone], className)}>
      {label}
    </span>
  );
}
