"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AdapterKey, Adapters, AdminUser, Session } from "@gitwork/data";
import { IconProvider } from "@gitwork/ui/icons";
import { Callout, Toaster, TooltipProvider } from "@gitwork/ui";
import { can, permissionsFor, scopeOf, type RbacSubject, type Scope, type ScopeLevel } from "./rbac";
import { validateConfig, type AdminConfig } from "./config";

/* --------------------------------- config --------------------------------- */

const ConfigContext = createContext<AdminConfig | null>(null);

export function useAdminConfig(): AdminConfig {
  const config = useContext(ConfigContext);
  if (!config) throw new Error("useAdminConfig must be used inside <AdminProvider>.");
  return config;
}

/** The adapter for a module's data. Modules never call fetch() directly. */
export function useAdapter<K extends AdapterKey>(key: K): Adapters[K] {
  return useAdminConfig().adapters[key];
}

export function useFeature(flag: string): boolean {
  return useAdminConfig().features?.[flag] ?? false;
}

/* --------------------------------- session --------------------------------- */

export interface SessionUser extends AdminUser, RbacSubject {
  roleLabel: string;
}

interface SessionState {
  status: "loading" | "authenticated" | "anonymous";
  user: SessionUser | null;
  signIn: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Mock auth only: switch the current user's role to review permissions. */
  switchRole?: (roleId: string) => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

function SessionProvider({ children }: { children: ReactNode }) {
  const config = useAdminConfig();
  const auth = config.adapters.auth;
  const client = useQueryClient();
  const session = useQuery({ queryKey: ["session"], queryFn: () => auth.getSession(), staleTime: Infinity });

  const user = useMemo<SessionUser | null>(() => {
    const u = session.data?.user;
    if (!u) return null;
    const role = config.roles.find((r) => r.id === u.roleId);
    return { ...u, roleLabel: role?.label ?? u.roleId, permissions: permissionsFor(u.roleId, config.roles) };
  }, [session.data, config.roles]);

  const set = useCallback((s: Session | null) => {
    client.setQueryData(["session"], s);
  }, [client]);

  const value: SessionState = {
    status: session.isPending ? "loading" : user ? "authenticated" : "anonymous",
    user,
    signIn: async (email, password) => {
      set(await auth.signIn({ email, password }));
    },
    signOut: async () => {
      await auth.signOut();
      set(null);
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== "session" });
    },
    switchRole: auth.switchRole
      ? async (roleId) => {
          set(await auth.switchRole!(roleId));
          await client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "session" });
        }
      : undefined,
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside <AdminProvider>.");
  return s;
}

/** `const canEdit = useCan("groups.manage", { ownerId: group.ownerId })` */
export function useCan(permission: string, scope?: Scope): boolean {
  return can(useSession().user, permission, scope);
}

export function useScope(permission: string): ScopeLevel {
  return scopeOf(useSession().user, permission);
}

/** Render children only when allowed. */
export function Can({ permission, scope, children, fallback = null }: { permission: string; scope?: Scope; children: ReactNode; fallback?: ReactNode }) {
  return <>{useCan(permission, scope) ? children : fallback}</>;
}

/* -------------------------------- provider -------------------------------- */

export function AdminProvider({ config, children }: { config: AdminConfig; children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  const problems = process.env.NODE_ENV === "production" ? [] : validateConfig(config);
  if (problems.length) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Callout tone="danger" title="admin.config.ts needs attention">
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Callout>
      </div>
    );
  }
  return (
    <ConfigContext.Provider value={config}>
      <QueryClientProvider client={client}>
        <IconProvider set={config.brand.icons} overrides={config.brand.iconOverrides}>
          <TooltipProvider delayDuration={200}>
            <SessionProvider>{children}</SessionProvider>
            <Toaster />
          </TooltipProvider>
        </IconProvider>
      </QueryClientProvider>
    </ConfigContext.Provider>
  );
}
