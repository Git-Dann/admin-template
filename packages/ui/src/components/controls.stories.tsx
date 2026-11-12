import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Avatar, Checkbox, Radio, RadioGroup, SectionHeader, Select, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "./controls";
import { Input, Label, Textarea } from "./input";
import { Card, CardBody } from "./card";

const meta = { title: "Primitives/Controls" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Inputs: Story = {
  render: () => (
    <div className="grid max-w-md gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="s1">Search</Label>
        <Input id="s1" icon="search" placeholder="Search users…" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="s2">Invalid</Label>
        <Input id="s2" aria-invalid defaultValue="not-an-email" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="s3">Notes</Label>
        <Textarea id="s3" placeholder="Internal notes" />
      </div>
      <Select aria-label="Platform" options={[{ value: "ios", label: "iOS", icon: "phone" }, { value: "android", label: "Android", icon: "phone" }, { value: "web", label: "Web", icon: "globe" }]} />
    </div>
  ),
};

export const Toggles: Story = {
  render: function Render() {
    const [on, setOn] = useState(true);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="c1" defaultChecked />
          <Label htmlFor="c1">Send receipt</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="c2" checked="indeterminate" />
          <Label htmlFor="c2">Some selected</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="sw" checked={on} onCheckedChange={setOn} />
          <Label htmlFor="sw">Notifications {on ? "on" : "off"}</Label>
        </div>
        <RadioGroup defaultValue="all" aria-label="Audience" className="flex gap-4">
          {["all", "subscribers", "lapsed"].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <Radio value={v} id={`r-${v}`} />
              <Label htmlFor={`r-${v}`}>{v}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  },
};

export const TabsAndAvatars: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4 text-sm text-text-muted">Overview content</TabsContent>
      </Tabs>
      <div className="flex items-center gap-3">
        <Avatar name="Dan Smith" />
        <Avatar name="Priya Kaur" size={44} />
        <Avatar name="fellas" size={28} />
      </div>
    </div>
  ),
};

export const CollapsibleSection: Story = {
  render: () => (
    <SectionHeader title="Revenue" description="Last 12 months">
      <Card>
        <CardBody>Section content stays mounted when collapsed.</CardBody>
      </Card>
    </SectionHeader>
  ),
};
