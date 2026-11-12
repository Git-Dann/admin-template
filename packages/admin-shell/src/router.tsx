"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext } from "react";
import { EmptyState, Button } from "@gitwork/ui";
import Link from "next/link";
import { can } from "./rbac";
import { matchRoute, type AdminModule } from "./module";
import { useAdminConfig, useSession } from "./context";
import { PageHeader } from "./page-header";

const ModuleContext = createContext<AdminModule | null>(null);

/** The module whose route is rendering. Pages use it for their title, so `users({ title: "Members" })` works. */
export function useCurrentModule(): AdminModule | null {
  return useContext(ModuleContext);
}

/** The current module's title, or a fallback outside the router (e.g. in a story). */
export function useModuleTitle(fallback: string): string {
  return useContext(ModuleContext)?.title ?? fallback;
}

/** Renders the module route for the current URL. Mount it in app/(admin)/[[...slug]]/page.tsx. */
export function ModuleRouter() {
  const config = useAdminConfig();
  const { user } = useSession();
  const pathname = usePathname() ?? "/";
  const match = matchRoute(pathname, config.modules);

  if (!match) {
    return (
      <>
        <PageHeader title="Page not found" />
        <EmptyState icon="search" title="We couldn't find that page" description={`Nothing lives at ${pathname}.`} action={<Button asChild variant="secondary"><Link href="/">Go to the dashboard</Link></Button>} />
      </>
    );
  }

  const needed = [match.module.permission, match.route.permission].filter(Boolean) as string[];
  if (!needed.every((p) => can(user, p))) {
    return (
      <>
        <PageHeader title={match.module.title} />
        <EmptyState icon="lock" title="You don't have access to this page" description="Ask an owner to change your role if you need it." />
      </>
    );
  }

  const Page = match.route.component;
  return (
    <ModuleContext.Provider value={match.module}>
      <Page params={match.params} />
    </ModuleContext.Provider>
  );
}
