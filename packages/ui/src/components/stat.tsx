import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatDelta } from "../lib/format";
import { Icon, renderIcon, type IconLike } from "../icons";
import { Card } from "./card";
import { Skeleton } from "./feedback";
import { toneSoft, type Tone } from "./tone";

export interface Delta {
  /** Percentage change, e.g. 12.5 for +12.5%. */
  value: number;
  /** Is "up" good? Defaults to true. Set false for churn, refunds, costs. */
  upIsGood?: boolean;
  /** "vs last month" */
  label?: string;
}

function DeltaBadge({ delta }: { delta: Delta }) {
  const up = delta.value > 0;
  const flat = delta.value === 0;
  const good = flat ? null : up === (delta.upIsGood ?? true);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "inline-flex h-5 items-center gap-0.5 rounded-pill px-1.5 font-semibold numeric",
          good === null ? toneSoft.neutral : good ? toneSoft.success : toneSoft.danger,
        )}
      >
        {!flat && <Icon name={up ? "trend-up" : "trend-down"} size={12} />}
        {formatDelta(delta.value, Math.abs(delta.value) < 10 ? 1 : 0)}
      </span>
      {delta.label && <span className="text-text-muted">{delta.label}</span>}
    </span>
  );
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  caption?: ReactNode;
  delta?: Delta;
  icon?: IconLike;
  tone?: Tone;
  /** Make this the headline number: larger value, spans wider in grids. */
  emphasis?: boolean;
  loading?: boolean;
  className?: string;
}

/** A single metric. Prefer one emphasised StatCard plus a chart over a wall of equal cards. */
export function StatCard({ label, value, caption, delta, icon, tone = "accent", emphasis, loading, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        {icon && <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", toneSoft[tone])}>{renderIcon(icon, { size: "md" })}</span>}
      </div>
      {loading ? (
        <Skeleton className={emphasis ? "h-10 w-40" : "h-8 w-28"} />
      ) : (
        <p className={cn("font-display font-semibold tracking-tight text-text numeric", emphasis ? "text-4xl" : "text-2xl")}>{value}</p>
      )}
      {(delta || caption) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {delta && !loading && <DeltaBadge delta={delta} />}
          {caption && <span className="text-xs text-text-muted">{caption}</span>}
        </div>
      )}
    </Card>
  );
}

export interface KpiItem {
  label: ReactNode;
  value: ReactNode;
  caption?: ReactNode;
  delta?: Delta;
}

/** One card, several divided metrics. Use for secondary numbers under a headline. */
export function KpiStrip({ items, loading, className }: { items: KpiItem[]; loading?: boolean; className?: string }) {
  return (
    <Card className={cn("grid divide-y divide-border sm:divide-x sm:divide-y-0", className)} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))` }}>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-1.5 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{item.label}</p>
          {loading ? <Skeleton className="h-7 w-20" /> : <p className="font-display text-xl font-semibold text-text numeric">{item.value}</p>}
          {item.delta && !loading && <DeltaBadge delta={item.delta} />}
          {item.caption && <p className="text-xs text-text-muted">{item.caption}</p>}
        </div>
      ))}
    </Card>
  );
}

export { DeltaBadge };
