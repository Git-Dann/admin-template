import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, IconButton } from "./button";

const meta = { title: "Primitives/Button", component: Button, args: { children: "Save changes" } } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="subtle">Subtle</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger" icon="trash">Delete</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const SizesAndIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button icon="plus">New code</Button>
      <Button size="sm" icon="download" variant="secondary">Export CSV</Button>
      <Button iconRight="arrow-right" variant="secondary">Continue</Button>
      <IconButton icon="more" label="More actions" />
      <IconButton icon="close" label="Close" size="icon-sm" />
      <Button loading>Publishing</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const Playground: Story = {};
