import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-surface border border-border rounded-lg shadow-sm", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

/**
 * Accent edge for "active" or highlighted containers. Never put a thick one-sided border on a
 * rounded box (it renders as a crescent); place this bar inside the container instead.
 */
export function IndicatorBar({ className, side = "left" }: { className?: string; side?: "left" | "top" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute bg-accent",
        side === "left" ? "left-0 top-3 bottom-3 w-1 rounded-r-pill" : "top-0 left-3 right-3 h-1 rounded-b-pill",
        className,
      )}
    />
  );
}
