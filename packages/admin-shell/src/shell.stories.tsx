import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Card, CardBody, EmptyState, FilterChips, SearchInput } from "@gitwork/ui";
import { useState } from "react";
import { AdminProvider } from "./context";
import { AppShell } from "./app-shell";
import { PageHeader, PageMetaProvider } from "./page-header";
import { TopBar } from "./top-bar";
import { storyConfig } from "./story-config";
import type { AdminModule } from "./module";

const Page = () => <EmptyState title="Module content" description="Modules render here." />;
const fake = (id: string, title: string, icon: AdminModule["icon"], basePath: string, badge?: number | "new"): AdminModule => ({
  id,
  title,
  icon,
  basePath,
  routes: [{ path: "", component: Page }],
  badge: badge === undefined ? undefined : async () => badge,
});
const modules = [fake("dashboard", "Dashboard", "dashboard", "/"), fake("reports", "Reports", "reports", "/reports"), fake("users", "Users", "users", "/users", 12), fake("themes", "Theme builder", "theme", "/themes", "new")];
const config = storyConfig(modules, {
  nav: [
    { items: [{ label: "Dashboard", href: "/", icon: "dashboard" }, { label: "Reports", href: "/reports", icon: "reports" }] },
    { label: "Manage", items: [{ label: "Users", href: "/users", icon: "users" }, { label: "Theme builder", href: "/themes", icon: "theme" }] },
  ],
});

const meta = {
  title: "Layout/AppShell",
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true, navigation: { pathname: "/reports" } } },
  decorators: [(Story) => <AdminProvider config={config}><Story /></AdminProvider>],
} satisfies Meta;
export default meta;
type Story = StoryObj;

function ToolbarDemo() {
  const [q, setQ] = useState("");
  const [range, setRange] = useState("12");
  return (
    <>
      <PageHeader title="Reports" subtitle="Revenue across every platform" actions={<><Button variant="secondary" icon="download">Export CSV</Button><Button icon="plus">New report</Button></>}>
        <SearchInput value={q} onChange={setQ} />
        <FilterChips value={range} onChange={setRange} options={[{ value: "12", label: "Last 12 months" }, { value: "6", label: "Last 6 months" }]} />
      </PageHeader>
      <Card><CardBody className="h-64 text-sm text-text-muted">Page content</CardBody></Card>
    </>
  );
}

/** Grouped nav with active indicator bar, count and "New" badges, footer with logout and version. */
export const Shell: Story = { render: () => <AppShell><ToolbarDemo /></AppShell> };

/** Below the lg breakpoint the sidebar becomes a drawer behind the menu button. */
export const Mobile: Story = { globals: { viewport: { value: "mobile1" } }, render: () => <AppShell><ToolbarDemo /></AppShell> };

/** Every top bar control is 44px (h-control). */
export const TopBarOnly: Story = { render: () => <PageMetaProvider fallback="Dashboard"><TopBar onMenu={() => {}} /></PageMetaProvider> };
