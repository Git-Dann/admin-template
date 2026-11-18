import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, ICON_NAMES } from "./index";

const meta = { title: "Foundations/Icons" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Switch "Icons" in the toolbar to compare Lucide and Heroicons. */
export const Gallery: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
      {ICON_NAMES.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-3 text-xs text-text-muted">
          <Icon name={name} size="lg" className="text-text" />
          {name}
        </div>
      ))}
    </div>
  ),
};
