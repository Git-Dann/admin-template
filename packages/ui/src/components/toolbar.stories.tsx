import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "./button";
import { FilterChips, FilterPill, SearchInput, Toolbar } from "./toolbar";

const meta = { title: "Layout/Toolbar" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const FiltersAndActions: Story = {
  render: function Render() {
    const [status, setStatus] = useState("all");
    const [platforms, setPlatforms] = useState<string[]>(["ios"]);
    const [country, setCountry] = useState<string[]>([]);
    const [q, setQ] = useState("");
    return (
      <div className="space-y-4">
        <FilterChips
          value={status}
          onChange={setStatus}
          label="Status"
          options={[
            { value: "all", label: "All", count: 24 },
            { value: "live", label: "Live", count: 2 },
            { value: "scheduled", label: "Scheduled", count: 3 },
            { value: "draft", label: "Draft", count: 7 },
            { value: "ended", label: "Ended", count: 12 },
          ]}
        />
        <Toolbar actions={<><Button variant="secondary" icon="download">Export</Button><Button icon="plus">New theme</Button></>}>
          <SearchInput value={q} onChange={setQ} placeholder="Search themes…" />
          <FilterPill label="Platform" icon="phone" value={platforms} onChange={setPlatforms} options={[{ value: "ios", label: "iOS" }, { value: "android", label: "Android" }, { value: "web", label: "Web" }]} />
          <FilterPill label="Country" value={country} onChange={setCountry} single options={[{ value: "gb", label: "United Kingdom" }, { value: "us", label: "United States" }]} />
        </Toolbar>
      </div>
    );
  },
};
