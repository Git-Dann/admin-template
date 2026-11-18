"use client";

import { Suspense, type ReactNode } from "react";
import { Spinner } from "@gitwork/ui";
import type { AdminConfig } from "./config";
import { AdminProvider } from "./context";
import { AppShell } from "./app-shell";
import { AuthGuard, LoginScreen } from "./auth";

/** Everything an authenticated admin page needs: providers, auth guard and layout. */
export function AdminApp({ config, children }: { config: AdminConfig; children: ReactNode }) {
  return (
    <AdminProvider config={config}>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </AdminProvider>
  );
}

/** The /login page. */
export function AdminLogin({ config }: { config: AdminConfig }) {
  return (
    <AdminProvider config={config}>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <LoginScreen />
      </Suspense>
    </AdminProvider>
  );
}
