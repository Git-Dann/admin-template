import type { AdminModule } from "@gitwork/admin-shell";
import { History, Composer } from "./page";
export { LockScreenPreview } from "./page";

/** Push notifications: composer with audience, schedule and lock-screen preview, plus history. */
export function notifications(options: { basePath?: string; title?: string } = {}): AdminModule {
  const basePath = options.basePath ?? "/notifications";
  return {
    id: "notifications",
    title: options.title ?? "Notifications",
    icon: "megaphone",
    basePath,
    permission: "notifications.read",
    permissions: [
      { id: "notifications.read", label: "View notification history" },
      { id: "notifications.send", label: "Send and schedule notifications" },
    ],
    adapters: ["notifications"],
    routes: [
      { path: "", component: () => <History basePath={basePath} /> },
      { path: "new", component: () => <Composer basePath={basePath} />, permission: "notifications.send" },
    ],
  };
}
