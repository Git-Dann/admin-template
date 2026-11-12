import type { Meta, StoryObj } from "@storybook/react-vite";
import { formatCurrency } from "../lib/format";
import { AreaChart, BarChart, LineChart, ShareBars, StackedBarChart } from "./charts";
import { ChartCard } from "./chart-card";

const meta = { title: "Charts/Chart cards" } satisfies Meta;
export default meta;
type Story = StoryObj;

const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const revenue = months.map((m, i) => ({ month: m, ios: 14000 + i * 900 + (i === 8 ? 6000 : 0), android: 9000 + i * 500, web: 4000 + i * 250 }));
const totals = revenue.map((r) => ({ month: r.month, revenue: r.ios + r.android + r.web }));
const best = totals.reduce((a, b, i) => (b.revenue > totals[a]!.revenue ? i : a), 0);

export const Bar: Story = {
  render: () => (
    <ChartCard title="Monthly revenue" description="Last 12 months" headline={formatCurrency(totals.at(-1)!.revenue)} highlight={{ label: "Best month", value: `${totals[best]!.month} · ${formatCurrency(totals[best]!.revenue)}` }}>
      <BarChart data={totals} xKey="month" series={[{ key: "revenue", label: "Revenue" }]} format="currency" highlightIndex={best} ariaLabel="Monthly revenue" />
    </ChartCard>
  ),
};

const platformSeries = [
  { key: "ios", label: "iOS" },
  { key: "android", label: "Android" },
  { key: "web", label: "Web" },
];

export const Stacked: Story = {
  render: () => (
    <ChartCard title="Revenue by platform" series={platformSeries}>
      <StackedBarChart data={revenue} xKey="month" series={platformSeries} format="currency" ariaLabel="Revenue by platform" />
    </ChartCard>
  ),
};

export const LineAndArea: Story = {
  render: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Subscribers" series={platformSeries}>
        <LineChart data={revenue} xKey="month" series={platformSeries} ariaLabel="Subscribers" />
      </ChartCard>
      <ChartCard title="Plays">
        <AreaChart data={totals} xKey="month" series={[{ key: "revenue", label: "Plays" }]} ariaLabel="Plays" />
      </ChartCard>
    </div>
  ),
};

export const Share: Story = {
  render: () => (
    <ChartCard title="By country" description="Share of revenue, sums to 100%" height={0}>
      <ShareBars format="currency" max={5} items={[{ label: "United Kingdom", value: 31240 }, { label: "Ireland", value: 6120 }, { label: "United States", value: 4410 }, { label: "Australia", value: 2210 }, { label: "Canada", value: 1330 }, { label: "Spain", value: 410 }]} />
    </ChartCard>
  ),
};

export const States: Story = {
  render: () => (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="Loading" loading>{null}</ChartCard>
      <ChartCard title="Empty" isEmpty>{null}</ChartCard>
      <ChartCard title="Error" error={new Error("Couldn't load revenue.")} onRetry={() => {}}>{null}</ChartCard>
    </div>
  ),
};
