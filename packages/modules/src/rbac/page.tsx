"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { RoleDefinition } from "@gitwork/data";
import { PageHeader, scopeOf, setScope, useAdapter, useAdminConfig, useCan, type PermissionDefinition, type ScopeLevel, useModuleTitle } from "@gitwork/admin-shell";
import { Button, Callout, Card, cn, DataState, RoleBadge, Skeleton, toast } from "@gitwork/ui";

const LEVELS: Array<{ value: ScopeLevel; label: string }> = [
  { value: "none", label: "None" },
  { value: "own", label: "Own" },
  { value: "all", label: "All" },
];

function LevelSwitch({ value, onChange, ownable, disabled, label }: { value: ScopeLevel; onChange: (v: ScopeLevel) => void; ownable?: boolean; disabled?: boolean; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-control-sm rounded-md border border-border bg-surface p-0.5">
      {LEVELS.filter((l) => ownable || l.value !== "own").map((l) => (
        <button
          key={l.value}
          type="button"
          role="radio"
          aria-checked={value === l.value}
          disabled={disabled}
          onClick={() => onChange(l.value)}
          className={cn(
            "rounded-sm px-2.5 text-xs font-medium focus-ring disabled:cursor-not-allowed",
            value === l.value ? (l.value === "none" ? "bg-surface-raised text-text" : "bg-accent text-text-on-accent") : "text-text-muted hover:text-text",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function RolesPage() {
  const rbac = useAdapter("rbac");
  const config = useAdminConfig();
  const client = useQueryClient();
  const canManage = useCan("roles.manage");
  const q = useQuery({ queryKey: ["roles"], queryFn: async () => {
    const stored = await rbac.listRoles();
    return stored.length ? stored : config.roles;
  } });
  const [draft, setDraft] = useState<Record<string, RoleDefinition>>({});
  const save = useMutation({
    mutationFn: (roles: RoleDefinition[]) => Promise.all(roles.map((r) => rbac.saveRole(r))),
    onSuccess: () => {
      setDraft({});
      void client.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Permissions saved");
    },
  });

  const permissions: Array<PermissionDefinition & { module: string }> = config.modules.flatMap((m) => (m.permissions ?? []).map((p) => ({ ...p, module: m.title })));
  const groups = [...new Set(permissions.map((p) => p.module))];
  const dirty = Object.values(draft);

  return (
    <>
      <PageHeader
        title={useModuleTitle("Roles & permissions")}
        subtitle="Who can see and change what"
        actions={
          canManage && (
            <>
              <Button variant="secondary" disabled={!dirty.length} onClick={() => setDraft({})}>Discard</Button>
              <Button icon="check" disabled={!dirty.length} loading={save.isPending} onClick={() => save.mutate(dirty)}>
                Save changes
              </Button>
            </>
          )
        }
      />
      <Callout className="mb-4">
        <strong>Own</strong> means the permission only applies to things the person created or was assigned, for example a creator managing only their own groups.
      </Callout>
      <DataState query={q} loading={<Skeleton className="h-96 w-full" />}>
        {(stored) => {
          const roles = stored.map((r) => draft[r.id] ?? r);
          return (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm" aria-label="Permission matrix">
                <thead className="sticky top-0 bg-surface-raised">
                  <tr className="border-b border-border">
                    <th scope="col" className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Permission</th>
                    {roles.map((r) => (
                      <th key={r.id} scope="col" className="px-4 text-left">
                        <RoleBadge role={r.label} tone={r.tone} />
                      </th>
                    ))}
                  </tr>
                </thead>
                {groups.map((group) => (
                  <tbody key={group}>
                    <tr>
                      <th colSpan={roles.length + 1} scope="colgroup" className="bg-bg px-4 pb-2 pt-4 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {group}
                      </th>
                    </tr>
                    {permissions
                      .filter((p) => p.module === group)
                      .map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <th scope="row" className="px-4 py-3 text-left font-normal">
                            <span className="block font-medium text-text">{p.label}</span>
                            <code className="text-xs text-text-muted">{p.id}</code>
                          </th>
                          {roles.map((r) => (
                            <td key={r.id} className="px-4 py-3">
                              <LevelSwitch
                                label={`${p.label} for ${r.label}`}
                                value={scopeOf({ id: "", permissions: r.permissions }, p.id)}
                                ownable={p.ownable}
                                disabled={!canManage || r.permissions.includes("*")}
                                onChange={(level) => setDraft((d) => ({ ...d, [r.id]: setScope(d[r.id] ?? r, p.id, level) }))}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                ))}
              </table>
            </Card>
          );
        }}
      </DataState>
    </>
  );
}
