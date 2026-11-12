import type { Meta, StoryObj } from "@storybook/react-vite";
import { SEMANTIC_COLORS } from "@gitwork/tokens";

const meta = { title: "Foundations/Tokens" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Colours: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
      {SEMANTIC_COLORS.map((name) => (
        <div key={name} className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="h-14" style={{ background: `var(--gw-color-${name})` }} />
          <p className="px-2 py-1.5 font-mono text-xs text-text">{name}</p>
        </div>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="space-y-3">
      <h1 className="text-4xl font-semibold">Display: £48,210 this month</h1>
      <h2 className="text-2xl font-semibold">Section heading</h2>
      <p className="max-w-prose text-text">Body copy uses the body font. Numbers in tables use tabular figures: <span className="numeric">1,234.50</span></p>
      <p className="text-sm text-text-muted">Muted secondary text.</p>
      <p className="font-mono text-sm">FELLAS20</p>
    </div>
  ),
};

export const RadiiAndShadows: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {[
        ["radius sm · shadow sm", "rounded-sm shadow-sm"],
        ["radius md · shadow sm", "rounded-md shadow-sm"],
        ["radius lg · shadow md", "rounded-lg shadow-md"],
        ["radius xl · shadow lg", "rounded-xl shadow-lg"],
      ].map(([label, cls]) => (
        <div key={label} className={`flex size-28 items-center justify-center border border-border bg-surface p-2 text-center text-xs ${cls}`}>{label}</div>
      ))}
    </div>
  ),
};
