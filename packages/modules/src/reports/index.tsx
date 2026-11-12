import type { AdminModule } from "@gitwork/admin-shell";
import { ReportsPage } from "./page";
export { reportToCsv } from "./page";

/** Revenue reporting: headline, monthly chart, platform and country breakdowns, table and CSV export. */
export function reports(options: { basePath?: string; title?: string } = {}): AdminModule {
  return {
    id: "reports",
    title: options.title ?? "Reports",
    icon: "reports",
    basePath: options.basePath ?? "/reports",
    permission: "reports.read",
    permissions: [
      { id: "reports.read", label: "View revenue reports" },
      { id: "reports.export", label: "Export reports as CSV" },
    ],
    adapters: ["reports"],
    routes: [{ path: "", component: ReportsPage }],
  };
}
