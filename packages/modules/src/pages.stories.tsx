import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AdminProvider, AppShell, ModuleRouter } from "@gitwork/admin-shell";
import { storyConfig } from "@gitwork/admin-shell/story-config";
import { content, coupons, dashboard, notifications, rbac, reports, themeBuilder, users } from "./index";

const config = storyConfig([dashboard(), reports(), users(), content(), coupons(), notifications(), themeBuilder(), rbac()]);

const meta = {
  title: "Modules/Pages",
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <AdminProvider config={config}><AppShell><Story /></AppShell></AdminProvider>],
  render: () => <ModuleRouter />,
} satisfies Meta;
export default meta;
type Story = StoryObj;

const at = (pathname: string): Story => ({ parameters: { nextjs: { appDirectory: true, navigation: { pathname } } } });

export const Dashboard = at("/");
export const Reports = at("/reports");
export const Users = at("/users");
export const Content = at("/content");
export const ContentDetail = at("/content/col_0001");
export const Coupons = at("/coupons");
export const Notifications = at("/notifications");
export const NotificationComposer = at("/notifications/new");
export const ThemeBuilder = at("/themes");
export const ThemeEditor = at("/themes/thm_0001");
export const Roles = at("/roles");
export const NotFound = at("/nope");
