"use client";

import { Dialog } from "radix-ui";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@gitwork/ui";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { PageMetaProvider } from "./page-header";
import { useAdminConfig } from "./context";

const COLLAPSE_KEY = "gw-sidebar-collapsed";

/**
 * The admin layout: collapsible grouped sidebar (drawer on mobile), sticky top bar and
 * a content area. Wrap it in <AdminProvider> and <AuthGuard>, or use <AdminApp>.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const config = useAdminConfig();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read persisted preference after hydration
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  // Close the mobile drawer on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage blocked */
      }
      return !c;
    });
  };

  return (
    <PageMetaProvider fallback={config.brand.productName}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-text-on-accent">
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <aside className={cn("sticky top-0 hidden h-dvh shrink-0 border-r border-border transition-[width] duration-200 lg:block", collapsed ? "w-sidebar-collapsed" : "w-sidebar")}>
          <Sidebar collapsed={collapsed} onToggle={toggle} />
        </aside>

        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay lg:hidden" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-sidebar max-w-[85vw] border-r border-border shadow-lg focus:outline-none lg:hidden">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Dialog.Description className="sr-only">Main navigation</Dialog.Description>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenu={() => setMobileOpen(true)} />
          <main id="main" className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </PageMetaProvider>
  );
}
