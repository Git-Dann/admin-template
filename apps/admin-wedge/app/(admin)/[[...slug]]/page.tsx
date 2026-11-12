"use client";

import { ModuleRouter } from "@gitwork/admin-shell";

/** Every admin URL is resolved against the enabled modules in admin.config.ts. */
export default function Page() {
  return <ModuleRouter />;
}
