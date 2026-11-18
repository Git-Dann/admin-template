"use client";

import type { ReactNode } from "react";
import { cn, tokenVar } from "../lib/cn";
import { Card, CardHeader } from "../components/card";
import { EmptyState, ErrorState, Skeleton } from "../components/feedback";
import { Icon } from "../icons";

export interface ChartSeries {
  key: string;
  label: string;
  /** 1–6 maps to chart-1…chart-6 tokens. Defaults to series order. */
  color?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const seriesColor = (s: ChartSeries, i: number) => tokenVar(`chart-${s.color ?? (i % 6) + 1}` as `chart-${1 | 2 | 3 | 4 | 5 | 6}`);

export interface Highlight {
  /** "Best month" */
  label: string;
  /** "Aug 26 · £48,210" */
  value: ReactNode;
}

export interface ChartStateProps {
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Shown when there's no data. */
  emptyTitle?: string;
  emptyDescription?: string;
}

export function Legend({ series }: { series: ChartSeries[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: seriesColor(s, i) }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function HighlightCallout({ highlight }: { highlight: Highlight }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md bg-accent-subtle px-3 py-1.5 text-sm">
      <Icon name="star" size="sm" className="text-accent-text" />
      <span className="text-text-muted">{highlight.label}</span>
      <span className="font-semibold text-text numeric">{highlight.value}</span>
    </div>
  );
}

/**
 * Card wrapper for every chart: title, legend, highlight callout and
 * loading / empty / error states. Pass `isEmpty` when data loaded but is empty.
 */
export function ChartCard({
  title,
  description,
  actions,
  series = [],
  highlight,
  headline,
  isEmpty,
  loading,
  error,
  onRetry,
  emptyTitle = "No data for this period",
  emptyDescription = "Try a wider date range or different filters.",
  height = 280,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  series?: ChartSeries[];
  highlight?: Highlight;
  /** Optional big number shown above the chart (one clear headline). */
  headline?: ReactNode;
  isEmpty?: boolean;
  height?: number;
  children: ReactNode;
  className?: string;
} & ChartStateProps) {
  let body: ReactNode;
  if (error) body = <ErrorState compact error={error} onRetry={onRetry} />;
  else if (loading) body = <Skeleton className="w-full" style={{ height }} />;
  else if (isEmpty) body = <EmptyState compact icon="reports" title={emptyTitle} description={emptyDescription} />;
  else body = children;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} description={description} actions={actions} />
      {(headline || highlight || series.length > 1) && (
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            {headline && <div className="font-display text-3xl font-semibold text-text numeric">{headline}</div>}
            {highlight && !loading && !error && !isEmpty && <HighlightCallout highlight={highlight} />}
          </div>
          <Legend series={series} />
        </div>
      )}
      <div className="px-3 pb-4 pt-4 sm:px-5" style={{ minHeight: height }}>
        {body}
      </div>
    </Card>
  );
}
