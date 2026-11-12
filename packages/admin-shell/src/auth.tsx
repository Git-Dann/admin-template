"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Input, Label, RoleBadge, Spinner } from "@gitwork/ui";
import { useAdminConfig, useSession } from "./context";
import { BrandLogo } from "./brand-logo";

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center p-4">{children}</div>;
}

/** Renders children only for signed-in users; otherwise sends them to /login. */
export function AuthGuard({ children, loginPath = "/login" }: { children: ReactNode; loginPath?: string }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === "anonymous") router.replace(`${loginPath}?next=${encodeURIComponent(pathname ?? "/")}`);
  }, [status, router, pathname, loginPath]);
  if (status !== "authenticated") {
    return (
      <FullScreen>
        <Spinner label="Checking your session" />
      </FullScreen>
    );
  }
  return <>{children}</>;
}

/** Login screen. With mock auth it also offers one-click sign-in per role for design reviews. */
export function LoginScreen() {
  const config = useAdminConfig();
  const { signIn, switchRole, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, router, next]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const { productName } = config.brand;
  return (
    <FullScreen>
      <Card className="w-full max-w-sm p-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex w-full justify-center rounded-lg bg-sidebar px-5 py-4 text-sidebar-text">
            <BrandLogo />
          </div>
          <h1 className="text-xl font-semibold text-text">Sign in to {productName}</h1>
        </div>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" block loading={busy}>
            Sign in
          </Button>
        </form>
        {switchRole && config.devRolePicker !== false && (
          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-text-muted">Mock data · sign in as</p>
            <div className="flex flex-wrap justify-center gap-2">
              {config.roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="rounded-pill focus-ring"
                  onClick={async () => {
                    await signIn(`${r.id}@example.com`);
                    await switchRole(r.id);
                  }}
                >
                  <RoleBadge role={r.label} tone={r.tone} />
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </FullScreen>
  );
}
