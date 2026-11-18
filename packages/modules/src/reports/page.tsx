"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PLATFORM_LABELS, PLATFORMS, type MonthRevenue, type RevenueReport } from "@gitwork/data";
import { PageHeader, useAdapter, useCan, useModuleTitle } from "@gitwork/admin-shell";
import {
  BarChart,
  Button,
  ChartCard,
  createColumns,
  DataTable,
  ErrorState,
  FilterChips,
  formatCurrency,
  percentChange,
  ShareBars,
  StackedBarChart,
  StatCard,
  sum,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@gitwork/ui";
import { downloadBlob, lastMonths, monthLabel, toCsv } from "../shared";

type Row = MonthRevenue & { label: string };
const col = createColumns<Row>();
const columns = col.columns([
  col.accessor("label", { header: "Month", enableSorting: false }),
  ...PLATFORMS.map((p) =>
    col.accessor((r) => r.byPlatform[p], { id: p, header: PLATFORM_LABELS[p], meta: { align: "right" }, cell: (c) => formatCurrency(c.getValue()) }),
  ),
  col.accessor("refunds", { header: "Refunds", meta: { align: "right" }, cell: (c) => formatCurrency(c.getValue()) }),
  col.accessor("revenue", { header: "Revenue", meta: { align: "right", className: "font-semibold" }, cell: (c) => formatCurrency(c.getValue()) }),
]);

const RANGES = [
  { value: "12", label: "Last 12 months" },
  { value: "6", label: "Last 6 months" },
  { value: "3", label: "Last 3 months" },
];

export function reportToCsv(report: RevenueReport): string {
  const header = ["Month", ...PLATFORMS.map((p) => PLATFORM_LABELS[p]), "Refunds", "Revenue"];
  const rows = report.months.map((m) => [m.month, ...PLATFORMS.map((p) => m.byPlatform[p]), m.refunds, m.revenue]);
  const totals = ["Total", ...PLATFORMS.map((p) => sum(report.months.map((m) => m.byPlatform[p]))), sum(report.months.map((m) => m.refunds)), report.total];
  return toCsv([header, ...rows, totals]);
}

export function ReportsPage() {
  const reports = useAdapter("reports");
  const title = useModuleTitle("Reports");
  const canExport = useCan("reports.export");
  const [range, setRange] = useState("12");
  const [view, setView] = useState<"total" | "platform">("total");
  const dates = useMemo(() => lastMonths(Number(range)), [range]);
  const q = useQuery({ queryKey: ["reports", "revenue", dates], queryFn: () => reports.getRevenue(dates) });
  const r = q.data;

  const rows: Row[] = useMemo(() => (r?.months ?? []).map((m) => ({ ...m, label: monthLabel(m.month) })).reverse(), [r]);
  const chart = useMemo(() => [...rows].reverse().map((m) => ({ label: m.label, revenue: m.revenue, ...m.byPlatform })), [rows]);
  const best = chart.reduce((b, m, i) => (m.revenue > (chart[b]?.revenue ?? -1) ? i : b), 0);
  const delta = r ? percentChange(r.total, r.previousTotal) : null;
  const empty = !!r && r.months.length === 0;

  if (q.isError) {
    return (
      <>
        <PageHeader title={title} />
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle="Revenue across every platform"
        actions={
          canExport && (
            <Button variant="secondary" icon="download" disabled={!r || empty} onClick={() => r && downloadBlob(new Blob([reportToCsv(r)], { type: "text/csv" }), `revenue-${dates.from}-to-${dates.to}.csv`)}>
              Export CSV
            </Button>
          )
        }
      >
        <FilterChips label="Date range" value={range} onChange={setRange} options={RANGES} />
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          emphasis
          loading={q.isPending}
          label={`Revenue, ${RANGES.find((x) => x.value === range)!.label.toLowerCase()}`}
          value={r ? formatCurrency(r.total) : ""}
          delta={delta !== null ? { value: Math.round(delta * 10) / 10, label: "vs previous period" } : undefined}
          caption={r ? `Refunds ${formatCurrency(sum(r.months.map((m) => m.refunds)))}` : undefined}
          icon="money"
        />
        <ChartCard title="By platform" loading={q.isPending} isEmpty={empty} height={0}>
          {r && <ShareBars format="currency" items={r.byPlatform.map((p) => ({ label: PLATFORM_LABELS[p.platform], value: p.revenue }))} />}
        </ChartCard>
        <ChartCard title="By country" loading={q.isPending} isEmpty={empty} height={0}>
          {r && <ShareBars format="currency" max={5} items={r.byCountry.map((c) => ({ label: c.country, value: c.revenue }))} />}
        </ChartCard>
      </div>

      <ChartCard
        className="mt-4"
        title="Monthly revenue"
        loading={q.isPending}
        isEmpty={empty}
        highlight={chart[best] ? { label: "Best month", value: `${chart[best]!.label} · ${formatCurrency(chart[best]!.revenue)}` } : undefined}
        series={view === "platform" ? PLATFORMS.map((p) => ({ key: p, label: PLATFORM_LABELS[p] })) : undefined}
        actions={
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="total">Total</TabsTrigger>
              <TabsTrigger value="platform">By platform</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        {view === "total" ? (
          <BarChart data={chart} xKey="label" series={[{ key: "revenue", label: "Revenue" }]} format="currency" highlightIndex={best} ariaLabel="Monthly revenue" />
        ) : (
          <StackedBarChart data={chart} xKey="label" series={PLATFORMS.map((p) => ({ key: p, label: PLATFORM_LABELS[p] }))} format="currency" ariaLabel="Monthly revenue by platform" />
        )}
      </ChartCard>

      <section className="mt-8" aria-labelledby="month-table">
        <h2 id="month-table" className="mb-3 text-lg font-semibold text-text">Month by month</h2>
        <DataTable label="Revenue by month" data={q.isPending ? undefined : rows} loading={q.isPending} columns={columns} getRowId={(m) => m.month} pageSize={12} columnToggle={false} />
        {r && !empty && (
          <p className="mt-2 text-right text-sm text-text-muted numeric">
            Total <span className="font-semibold text-text">{formatCurrency(r.total)}</span> across {r.months.length} months
          </p>
        )}
      </section>
    </>
  );
}
