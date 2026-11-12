"use client";

import { useQuery } from "@tanstack/react-query";
import type { Format, Metric } from "@gitwork/data";
import { PageHeader, useAdapter, type AdminModule } from "@gitwork/admin-shell";
import { BarChart, ChartCard, ErrorState, formatCurrency, formatNumber, formatPercent, KpiStrip, ShareBars, StatCard } from "@gitwork/ui";
import { lastMonths, monthLabel } from "../shared";

const fmt = (value: number, format: Format) =>
  format === "currency" ? formatCurrency(value, { pence: value < 100 && !Number.isInteger(value) }) : format === "percent" ? formatPercent(value) : formatNumber(value);

function DashboardPage() {
  const adapter = useAdapter("dashboard");
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => adapter.getSummary(lastMonths(12)) });
  const d = q.data;

  if (q.isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </>
    );
  }

  const points: Array<Record<string, string | number>> = d?.trend.points.map((p) => ({ ...p, label: monthLabel(String(p[d.trend.xKey])) })) ?? [];
  const key = d?.trend.series[0]?.key ?? "";
  const best = points.reduce<number>((b, p, i) => (Number(p[key]) > Number(points[b]?.[key] ?? -1) ? i : b), 0);
  const placeholderKpis: Metric[] = Array.from({ length: 4 }, () => ({ label: "…", value: 0, format: "number" }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="How things are going this month" />
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          emphasis
          loading={q.isPending}
          label={d?.headline.label ?? "…"}
          value={d ? fmt(d.headline.value, d.headline.format) : ""}
          delta={d?.headline.delta !== undefined ? { value: d.headline.delta, label: d.headline.caption } : undefined}
          icon="money"
        />
        <ChartCard className="lg:col-span-2" title={d?.breakdown.title ?? "Breakdown"} loading={q.isPending} isEmpty={d?.breakdown.items.length === 0} height={0}>
          {d && <ShareBars items={d.breakdown.items} format={d.breakdown.format} />}
        </ChartCard>
      </div>
      <KpiStrip
        className="mt-4"
        loading={q.isPending}
        items={(d?.kpis ?? placeholderKpis).map((k) => ({
          label: k.label,
          value: fmt(k.value, k.format),
          delta: k.delta !== undefined ? { value: k.delta, upIsGood: k.upIsGood } : undefined,
          caption: k.caption,
        }))}
      />
      <ChartCard
        className="mt-4"
        title={d?.trend.title ?? "Trend"}
        loading={q.isPending}
        isEmpty={points.length === 0}
        highlight={d && points[best] ? { label: "Best month", value: `${points[best]!.label} · ${fmt(Number(points[best]![key]), d.trend.format)}` } : undefined}
        series={d?.trend.series}
      >
        {d && <BarChart data={points} xKey="label" series={d.trend.series} format={d.trend.format} highlightIndex={best} ariaLabel={d.trend.title} />}
      </ChartCard>
    </>
  );
}

/** Home dashboard: one headline number, a breakdown, a KPI strip and a 12-month trend. */
export function dashboard(options: { basePath?: string; title?: string } = {}): AdminModule {
  return {
    id: "dashboard",
    title: options.title ?? "Dashboard",
    icon: "dashboard",
    basePath: options.basePath ?? "/",
    permission: "dashboard.read",
    permissions: [{ id: "dashboard.read", label: "View dashboard" }],
    adapters: ["dashboard"],
    routes: [{ path: "", component: DashboardPage }],
  };
}
