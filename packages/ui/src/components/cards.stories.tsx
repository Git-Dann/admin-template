import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { MediaCard, TicketCard } from "./cards";

const meta = { title: "Data display/Cards" } satisfies Meta;
export default meta;
type Story = StoryObj;

const art = (h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="hsl(${h} 70% 35%)"/><stop offset="1" stop-color="hsl(${h + 40} 70% 15%)"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>`)}`;

export const Tickets: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 md:grid-cols-2">
      <TicketCard title="Black Friday" value="40% off" code="BLACKFRI40" status="scheduled" meta="Annual plan · 28 Nov – 1 Dec" footer="0 of 5,000 redeemed" />
      <TicketCard title="Creator referral" value="1 month free" code="CREATOR-JAY" status="live" meta="New subscribers only" footer="312 of 1,000 redeemed" actions={<Button size="sm" variant="ghost" icon="more" aria-label="More" />} />
    </div>
  ),
};

export const Media: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-4 sm:grid-cols-3">
      <MediaCard image={art(0)} title="Loaded Live" subtitle="Season 3 · 12 episodes" status="live" meta="1.2M plays" onClick={() => {}} action={<Button size="sm" variant="ghost">Open</Button>} />
      <MediaCard image={art(200)} title="Halloween 2026" subtitle="Seasonal theme" status="scheduled" meta="Starts 24 Oct" />
      <MediaCard title="Untitled series" subtitle="No artwork yet" status="draft" />
    </div>
  ),
};
