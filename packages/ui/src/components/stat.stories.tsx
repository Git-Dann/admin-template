import type { Meta, StoryObj } from "@storybook/react-vite";
import { formatCurrency, formatNumber } from "../lib/format";
import { KpiStrip, StatCard } from "./stat";

const meta = { title: "Data display/Stats" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const HeadlineAndSupport: Story = {
  render: () => (
    <div className="grid gap-4 lg:grid-cols-3">
      <StatCard emphasis className="lg:col-span-1" label="Revenue this month" value={formatCurrency(48210)} delta={{ value: 12.4, label: "vs October" }} icon="money" caption="Net of refunds" />
      <StatCard label="Active subscribers" value={formatNumber(18342)} delta={{ value: -2.1, label: "vs October" }} icon="users" tone="info" />
      <StatCard label="Churn" value="3.2%" delta={{ value: 0.4, upIsGood: false, label: "vs October" }} icon="trend-down" tone="warning" />
    </div>
  ),
};

export const Strip: Story = {
  render: () => (
    <KpiStrip
      items={[
        { label: "New users", value: formatNumber(1204), delta: { value: 8 } },
        { label: "Trials started", value: formatNumber(402) },
        { label: "Conversion", value: "33%", caption: "Trial → paid" },
        { label: "ARPU", value: formatCurrency(4.82, { pence: true }) },
      ]}
    />
  ),
};

export const Loading: Story = { render: () => <StatCard label="Revenue" value="" loading icon="money" /> };
