import type { AdminModule } from "@gitwork/admin-shell";
import { DashboardPage } from "./page";

/** Home dashboard: one headline number, a breakdown, a KPI strip and a 12-month trend. */
export function dashboard(options: { basePath?: string; title?: string } = {}): AdminModule {
  return {
    id: "dashboard",
    title: options.title ?? "Dashboard",
    icon: "dashboard",
    basePath: options.basePath ?? "/",
    permission: "dashboard.read",
    permissions: [{ id: "dashboard.read", label: "View dashboard" }],
    adapters: ["dashboard"],
    routes: [{ path: "", component: DashboardPage }],
  };
}
