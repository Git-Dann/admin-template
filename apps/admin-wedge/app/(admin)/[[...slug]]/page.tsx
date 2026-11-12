import { ModuleRouter } from "@gitwork/admin-shell";
import { staticModuleParams } from "@gitwork/admin-shell/next";
import config from "../../../admin.config";

/** Prerendered paths for static exports. Other URLs still resolve on the client. */
export function generateStaticParams() {
  return staticModuleParams(config);
}

/** Every admin URL is resolved against the enabled modules in admin.config.ts. */
export default function Page() {
  return <ModuleRouter />;
}
