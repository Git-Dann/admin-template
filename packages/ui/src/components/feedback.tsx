"use client";

import type { CSSProperties, ReactNode } from "react";
import { Toaster as Sonner, toast } from "sonner";
import { cn } from "../lib/cn";
import { Icon, renderIcon, type IconLike } from "../icons";
import { Button } from "./button";
import { toneSoft } from "./tone";

/* ------------------------------- Empty state ------------------------------- */

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  compact,
  className,
}: {
  icon?: IconLike;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-2 py-8" : "gap-3 py-14", className)}>
      <span className="flex size-12 items-center justify-center rounded-lg bg-surface-raised text-text-muted">{renderIcon(icon, { size: "lg" })}</span>
      <div className="max-w-sm">
        <p className="font-semibold text-text">{title}</p>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Error state with a retry button. */
export function ErrorState({ title = "Something went wrong", error, onRetry, compact }: { title?: ReactNode; error?: unknown; onRetry?: () => void; compact?: boolean }) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Please try again.";
  return (
    <EmptyState
      compact={compact}
      icon="error"
      title={title}
      description={message}
      action={onRetry && <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}
    />
  );
}

/* --------------------------------- Callout --------------------------------- */

const calloutIcon = { info: "info", warning: "warning", success: "success", danger: "error" } as const;

export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "note"} className={cn("flex gap-3 rounded-md p-4 text-sm", toneSoft[tone], className)}>
      <Icon name={calloutIcon[tone]} size="md" className="mt-px" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn("text-text", title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

/* --------------------------------- Loading --------------------------------- */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden style={style} className={cn("animate-pulse rounded-sm bg-surface-raised", className)} />;
}

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-text-muted", className)}>
      <Icon name="spinner" className="animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* -------------------------------- Data state -------------------------------- */

export interface DataStateProps<T> {
  /** Anything shaped like a TanStack Query result. */
  query: { data?: T; isLoading?: boolean; isPending?: boolean; isError?: boolean; error?: unknown; refetch?: () => unknown };
  /** Decide whether loaded data counts as empty. Defaults to empty arrays. */
  isEmpty?: (data: T) => boolean;
  loading?: ReactNode;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
  compact?: boolean;
}

/**
 * One place for the loading / error / empty / ready decision, so no list or chart forgets one.
 */
export function DataState<T>({ query, isEmpty, loading, empty, children, compact }: DataStateProps<T>) {
  if (query.isError) return <ErrorState compact={compact} error={query.error} onRetry={query.refetch ? () => void query.refetch?.() : undefined} />;
  if (query.isLoading || query.isPending || query.data === undefined) return <>{loading ?? <Skeleton className="h-40 w-full" />}</>;
  const emptyCheck = isEmpty ?? ((d: T) => Array.isArray(d) && d.length === 0);
  if (emptyCheck(query.data)) return <>{empty ?? <EmptyState compact={compact} title="Nothing here yet" />}</>;
  return <>{children(query.data)}</>;
}

/* ---------------------------------- Toast ---------------------------------- */

/** Mount once in the app shell. Use `toast.success("Saved")` anywhere. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!bg-bg-elevated !text-text !border !border-border !shadow-lg !rounded-md !font-body",
          description: "!text-text-muted",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
          warning: "[&_[data-icon]]:!text-warning",
          info: "[&_[data-icon]]:!text-info",
          actionButton: "!bg-accent !text-text-on-accent",
        },
      }}
    />
  );
}

export { toast };
