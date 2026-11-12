"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PLATFORM_LABELS, type UserRecord, type UserStatus } from "@gitwork/data";
import { PageHeader, useAdapter, useAdminConfig, useCan, type AdminModule } from "@gitwork/admin-shell";
import {
  Avatar,
  Button,
  ConfirmDialog,
  createColumns,
  DataTable,
  Drawer,
  FilterChips,
  FilterPill,
  formatCurrency,
  formatDate,
  RoleBadge,
  SearchInput,
  Select,
  StatusPill,
  toast,
} from "@gitwork/ui";
import { useListParams } from "../shared";

const col = createColumns<UserRecord>();

function useRoleLookup() {
  const { roles } = useAdminConfig();
  return useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
}

function UserDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const users = useAdapter("users");
  const { roles } = useAdminConfig();
  const roleById = useRoleLookup();
  const client = useQueryClient();
  const canChangeRole = useCan("users.roles");
  const canManage = useCan("users.manage");
  const [confirm, setConfirm] = useState(false);
  const q = useQuery({ queryKey: ["users", "detail", userId], queryFn: () => users.get(userId!), enabled: !!userId });
  const u = q.data;

  const done = (msg: string) => {
    void client.invalidateQueries({ queryKey: ["users"] });
    toast.success(msg);
  };
  const changeRole = useMutation({ mutationFn: (roleId: string) => users.updateRole(userId!, roleId), onSuccess: (x) => done(`${x.name} is now ${roleById.get(x.roleId)?.label ?? x.roleId}`) });
  const setStatus = useMutation({
    mutationFn: (status: UserStatus) => users.setStatus(userId!, status),
    onSuccess: (x) => {
      setConfirm(false);
      done(x.status === "suspended" ? `${x.name} is suspended` : `${x.name} is active again`);
    },
  });

  const suspended = u?.status === "suspended";
  return (
    <Drawer
      open={!!userId}
      onOpenChange={(open) => !open && onClose()}
      title={u?.name ?? "Loading…"}
      description={u?.email}
      footer={
        canManage && u ? (
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            tone={suspended ? "default" : "danger"}
            title={suspended ? `Reactivate ${u.name}?` : `Suspend ${u.name}?`}
            description={suspended ? "They'll be able to sign in again straight away." : "They'll be signed out and blocked until reactivated."}
            confirmLabel={suspended ? "Reactivate" : "Suspend user"}
            loading={setStatus.isPending}
            onConfirm={() => setStatus.mutate(suspended ? "active" : "suspended")}
            trigger={<Button variant={suspended ? "secondary" : "danger"} icon={suspended ? "refresh" : "lock"}>{suspended ? "Reactivate" : "Suspend"}</Button>}
          />
        ) : undefined
      }
    >
      {u && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={u.name} size={56} />
            <div className="space-y-1.5">
              <StatusPill status={u.status} />
              <p className="text-sm text-text-muted">Joined {formatDate(u.createdAt)}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ["Plan", u.plan],
              ["Platform", u.platform ? PLATFORM_LABELS[u.platform] : "–"],
              ["Country", u.country],
              ["Lifetime spend", u.spend !== undefined ? formatCurrency(u.spend, { pence: true }) : "–"],
              ["Last active", u.lastActiveAt ? formatDate(u.lastActiveAt) : "–"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-text-muted">{k}</dt>
                <dd className="font-medium text-text numeric">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-1.5">
            <label htmlFor="role" className="text-sm font-medium text-text">Role</label>
            {canChangeRole ? (
              <Select id="role" value={u.roleId} onValueChange={(v) => changeRole.mutate(v)} options={roles.map((r) => ({ value: r.id, label: r.label }))} />
            ) : (
              <div><RoleBadge role={roleById.get(u.roleId)?.label ?? u.roleId} tone={roleById.get(u.roleId)?.tone} /></div>
            )}
            {roleById.get(u.roleId)?.description && <p className="text-xs text-text-muted">{roleById.get(u.roleId)?.description}</p>}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function UsersPage() {
  const users = useAdapter("users");
  const { roles } = useAdminConfig();
  const roleById = useRoleLookup();
  const { params, setSearch, setFilter, setPage, setSort } = useListParams({ sort: { id: "createdAt", desc: true } });
  const [selected, setSelected] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["users", "list", params], queryFn: () => users.list(params), placeholderData: keepPreviousData });
  const facets = useQuery({ queryKey: ["users", "facets"], queryFn: () => users.facets() });

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: "User",
          cell: ({ row }) => (
            <span className="flex items-center gap-3">
              <Avatar name={row.original.name} size={32} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{row.original.name}</span>
                <span className="block truncate text-xs text-text-muted">{row.original.email}</span>
              </span>
            </span>
          ),
        }),
        col.accessor("roleId", { header: "Role", cell: (c) => <RoleBadge role={roleById.get(c.getValue())?.label ?? c.getValue()} tone={roleById.get(c.getValue())?.tone ?? "neutral"} /> }),
        col.accessor("status", { header: "Status", cell: (c) => <StatusPill status={c.getValue()} /> }),
        col.accessor("platform", { header: "Platform", cell: (c) => (c.getValue() ? PLATFORM_LABELS[c.getValue()!] : "–") }),
        col.accessor("spend", { header: "Spend", meta: { align: "right" }, cell: (c) => formatCurrency(c.getValue() ?? 0, { pence: true }) }),
        col.accessor("createdAt", { header: "Joined", cell: (c) => formatDate(c.getValue()) }),
      ]),
    [roleById],
  );

  const statusCounts = Object.fromEntries((facets.data?.status ?? []).map((f) => [f.value, f.count]));
  const total = (facets.data?.status ?? []).reduce((s, f) => s + f.count, 0);
  const status = params.filters?.status?.[0] ?? "all";

  return (
    <>
      <PageHeader title="Users" subtitle={facets.data ? `${total.toLocaleString("en-GB")} people` : undefined}>
        <FilterChips
          label="Status"
          value={status}
          onChange={(v) => setFilter("status", v === "all" ? [] : [v])}
          options={[
            { value: "all", label: "All", count: facets.data ? total : undefined },
            { value: "active", label: "Active", count: statusCounts.active },
            { value: "invited", label: "Invited", count: statusCounts.invited },
            { value: "suspended", label: "Suspended", count: statusCounts.suspended },
          ]}
        />
      </PageHeader>
      <DataTable
        label="Users"
        data={list.data?.items}
        loading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        columns={columns}
        getRowId={(u) => u.id}
        onRowClick={(u) => setSelected(u.id)}
        rowActions={[{ label: "View details", icon: "eye", onSelect: (u) => setSelected(u.id) }]}
        server={{
          rowCount: list.data?.total ?? 0,
          pagination: { pageIndex: params.page, pageSize: params.pageSize },
          onPaginationChange: (p) => setPage(p.pageIndex, p.pageSize),
          sorting: params.sort ? [params.sort] : [],
          onSortingChange: (s) => setSort(s[0]),
        }}
        toolbar={
          <>
            <SearchInput value={params.search ?? ""} onChange={setSearch} placeholder="Search name or email…" />
            <FilterPill label="Role" icon="shield" value={params.filters?.roleId ?? []} onChange={(v) => setFilter("roleId", v)} options={roles.map((r) => ({ value: r.id, label: r.label }))} />
          </>
        }
        empty={{ title: "No users match", description: "Try a different search or clear the filters." }}
      />
      <UserDrawer userId={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/** Users: searchable, filterable list with a detail drawer, role change and suspend. */
export function users(options: { basePath?: string; title?: string } = {}): AdminModule {
  return {
    id: "users",
    title: options.title ?? "Users",
    icon: "users",
    basePath: options.basePath ?? "/users",
    permission: "users.read",
    permissions: [
      { id: "users.read", label: "View users" },
      { id: "users.manage", label: "Suspend and reactivate users" },
      { id: "users.roles", label: "Change user roles" },
    ],
    adapters: ["users"],
    routes: [{ path: "", component: UsersPage }],
  };
}
