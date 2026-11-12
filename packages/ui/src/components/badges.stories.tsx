import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeChip, CountBadge, RoleBadge, StatusPill, Tag } from "./badges";

const meta = { title: "Data display/Badges" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const StatusPills: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {["live", "scheduled", "draft", "ended", "paused", "failed", "requires release"].map((s) => (
        <StatusPill key={s} status={s} />
      ))}
    </div>
  ),
};

export const RoleBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <RoleBadge role="Owner" tone="accent" icon="shield" />
      <RoleBadge role="Admin" tone="info" />
      <RoleBadge role="Creator" tone="success" />
      <RoleBadge role="Viewer" tone="neutral" />
    </div>
  ),
};

export const TagsAndCodes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Tag>Comedy</Tag>
      <Tag tone="info">iOS</Tag>
      <Tag onRemove={() => {}}>United Kingdom</Tag>
      <CodeChip code="FELLAS20" />
      <CodeChip code="STAFF-7Q2K" copyable={false} />
      <CountBadge value={12} />
      <CountBadge value="new" tone="success" />
      <CountBadge value={240} />
    </div>
  ),
};
