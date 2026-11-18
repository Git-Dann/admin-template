"use client";

import {
  Area,
  AreaChart as RAreaChart,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { useId } from "react";
import { cn } from "../lib/cn";
import { formatCompact, formatCurrency, formatNumber, formatPercent, sum, toShares } from "../lib/format";
import { seriesColor, type ChartSeries } from "./chart-card";

export type ValueFormat = "number" | "currency" | "percent" | ((value: number) => string);

export function formatValue(value: number, format: ValueFormat = "number"): string {
  if (typeof format === "function") return format(value);
  if (format === "currency") return formatCurrency(value);
  if (format === "percent") return formatPercent(value);
  return formatNumber(value);
}

function axisFormat(format: ValueFormat): (v: number) => string {
  if (format === "percent") return (v) => formatPercent(v);
  if (format === "currency") return (v) => formatCompact(v, { currency: true });
  if (typeof format === "function") return format;
  return (v) => formatCompact(v);
}

const axis = { stroke: "var(--gw-color-border)", tick: { fill: "var(--gw-color-text-muted)", fontSize: 12 }, tickLine: false, axisLine: false } as const;

function ChartTooltip({ active, payload, label, format, series }: TooltipContentProps<number, string> & { format: ValueFormat; series: ChartSeries[] }) {
  if (!active || !payload?.length) return null;
  const total = payload.length > 1 ? sum(payload.map((p) => Number(p.value) || 0)) : null;
  return (
    <div className="min-w-40 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-text">{label}</p>
      <ul className="space-y-1">
        {payload.map((p) => {
          const s = series.find((x) => x.key === p.dataKey);
          return (
            <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
                {s?.label ?? p.name}
              </span>
              <span className="font-medium text-text numeric">{formatValue(Number(p.value), format)}</span>
            </li>
          );
        })}
      </ul>
      {total !== null && (
        <p className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-semibold text-text">
          <span>Total</span>
          <span className="numeric">{formatValue(total, format)}</span>
        </p>
      )}
    </div>
  );
}

/** Screen-reader table mirroring the chart's data. */
function DataTableFallback({ data, xKey, series, format, caption }: { data: Record<string, unknown>[]; xKey: string; series: ChartSeries[]; format: ValueFormat; caption: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{xKey}</th>
          {series.map((s) => (
            <th key={s.key} scope="col">{s.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <th scope="row">{String(row[xKey])}</th>
            {series.map((s) => (
              <td key={s.key}>{formatValue(Number(row[s.key] ?? 0), format)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface CartesianChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  series: ChartSeries[];
  format?: ValueFormat;
  height?: number;
  /** Index of a bar/point to emphasise (e.g. best month). Other bars are muted. */
  highlightIndex?: number;
  /** Short description for screen readers. */
  ariaLabel?: string;
  className?: string;
}

function Frame({ height, ariaLabel, children, className }: { height: number; ariaLabel: string; children: React.ReactElement; className?: string }) {
  return (
    <figure className={cn("w-full", className)} aria-label={ariaLabel}>
      <div aria-hidden style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function BarChart<T extends Record<string, unknown>>({ data, xKey, series, format = "number", height = 260, highlightIndex, ariaLabel = "Bar chart", stacked, className }: CartesianChartProps<T> & { stacked?: boolean }) {
  return (
    <>
      <Frame height={height} ariaLabel={ariaLabel} className={className}>
        <RBarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="var(--gw-color-border)" strokeDasharray="3 3" />
          <XAxis dataKey={String(xKey)} {...axis} />
          <YAxis {...axis} width={56} tickFormatter={axisFormat(format)} />
          <Tooltip cursor={{ fill: "var(--gw-color-surface-raised)" }} content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} format={format} series={series} />} />
          {series.map((s, si) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "stack" : undefined}
              fill={seriesColor(s, si)}
              radius={stacked ? (si === series.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            >
              {highlightIndex !== undefined &&
                data.map((_, i) => <Cell key={i} fillOpacity={i === highlightIndex ? 1 : 0.35} />)}
            </Bar>
          ))}
        </RBarChart>
      </Frame>
      <DataTableFallback data={data} xKey={xKey} series={series} format={format} caption={ariaLabel} />
    </>
  );
}

export function StackedBarChart<T extends Record<string, unknown>>(props: CartesianChartProps<T>) {
  return <BarChart {...props} stacked ariaLabel={props.ariaLabel ?? "Stacked bar chart"} />;
}

export function LineChart<T extends Record<string, unknown>>({ data, xKey, series, format = "number", height = 260, ariaLabel = "Line chart", className }: CartesianChartProps<T>) {
  return (
    <>
      <Frame height={height} ariaLabel={ariaLabel} className={className}>
        <RLineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--gw-color-border)" strokeDasharray="3 3" />
          <XAxis dataKey={String(xKey)} {...axis} />
          <YAxis {...axis} width={56} tickFormatter={axisFormat(format)} />
          <Tooltip cursor={{ stroke: "var(--gw-color-border-strong)" }} content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} format={format} series={series} />} />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={seriesColor(s, i)} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          ))}
        </RLineChart>
      </Frame>
      <DataTableFallback data={data} xKey={xKey} series={series} format={format} caption={ariaLabel} />
    </>
  );
}

export function AreaChart<T extends Record<string, unknown>>({ data, xKey, series, format = "number", height = 260, ariaLabel = "Area chart", stacked, className }: CartesianChartProps<T> & { stacked?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <Frame height={height} ariaLabel={ariaLabel} className={className}>
        <RAreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColor(s, i)} stopOpacity={0.35} />
                <stop offset="100%" stopColor={seriesColor(s, i)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--gw-color-border)" strokeDasharray="3 3" />
          <XAxis dataKey={String(xKey)} {...axis} />
          <YAxis {...axis} width={56} tickFormatter={axisFormat(format)} />
          <Tooltip cursor={{ stroke: "var(--gw-color-border-strong)" }} content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} format={format} series={series} />} />
          {series.map((s, i) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId={stacked ? "stack" : undefined} stroke={seriesColor(s, i)} strokeWidth={2} fill={`url(#${id}-${s.key})`} isAnimationActive={false} />
          ))}
        </RAreaChart>
      </Frame>
      <DataTableFallback data={data} xKey={xKey} series={series} format={format} caption={ariaLabel} />
    </>
  );
}

export interface ShareItem {
  label: string;
  value: number;
  icon?: React.ReactNode;
}

/**
 * Horizontal share bars (by platform, by country). Plain HTML, so it's readable without
 * a chart. Percentages use the largest-remainder method and always sum to 100.
 */
export function ShareBars({ items, format = "number", max, className }: { items: ShareItem[]; format?: ValueFormat; max?: number; className?: string }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const shown = max && sorted.length > max ? [...sorted.slice(0, max - 1), { label: "Other", value: sum(sorted.slice(max - 1).map((i) => i.value)) }] : sorted;
  const shares = toShares(shown.map((i) => i.value));
  const top = shown[0]?.value ?? 0;
  return (
    <ul className={cn("space-y-3", className)}>
      {shown.map((item, i) => (
        <li key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-text">
              {"icon" in item && item.icon}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2 numeric">
              <span className="font-medium text-text">{formatValue(item.value, format)}</span>
              <span className="w-10 text-right text-xs text-text-muted">{formatPercent(shares[i] ?? 0)}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-pill bg-surface-raised" role="presentation">
            <div className="h-full rounded-pill" style={{ width: `${top ? (item.value / top) * 100 : 0}%`, background: `var(--gw-color-chart-${(i % 6) + 1})` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
