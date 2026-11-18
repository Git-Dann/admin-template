import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../lib/format";
import { RoleBadge, StatusPill } from "../components/badges";
import { Avatar } from "../components/controls";
import { Button } from "../components/button";
import { FilterChips, SearchInput } from "../components/toolbar";
import { createColumns, DataTable } from "./data-table";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Creator" | "Viewer";
  status: "active" | "invited" | "suspended";
  spend: number;
  joined: string;
}

const names = ["Priya Kaur", "Tom Ellis", "Aisha Bello", "Jack Murphy", "Sofia Rossi", "Liam Walsh", "Mia Chen", "Noah Patel", "Ella Byrne", "Oscar Green", "Grace Hall", "Leo Wright"];
const roles = ["Owner", "Admin", "Creator", "Viewer"] as const;
const statuses = ["active", "active", "invited", "suspended"] as const;
const users: User[] = Array.from({ length: 48 }, (_, i) => ({
  id: `u${i + 1}`,
  name: names[i % names.length]!,
  email: `${names[i % names.length]!.toLowerCase().replace(" ", ".")}${i}@example.com`,
  role: roles[i % 4]!,
  status: statuses[i % 4]!,
  spend: (i * 37.5) % 420,
  joined: new Date(2025, i % 12, (i % 27) + 1).toISOString(),
}));

const col = createColumns<User>();
const columns = col.columns([
  col.accessor("name", {
    header: "User",
    cell: ({ row }) => (
      <span className="flex items-center gap-3">
        <Avatar name={row.original.name} size={32} />
        <span className="min-w-0">
          <span className="block font-medium">{row.original.name}</span>
          <span className="block text-xs text-text-muted">{row.original.email}</span>
        </span>
      </span>
    ),
  }),
  col.accessor("role", { header: "Role", cell: (c) => <RoleBadge role={c.getValue()} tone={c.getValue() === "Owner" ? "accent" : "neutral"} /> }),
  col.accessor("status", { header: "Status", cell: (c) => <StatusPill status={c.getValue()} /> }),
  col.accessor("spend", { header: "Lifetime spend", meta: { align: "right" }, cell: (c) => formatCurrency(c.getValue(), { pence: true }) }),
  col.accessor("joined", { header: "Joined", sortFn: "datetime", cell: (c) => formatDate(c.getValue()) }),
]);

const meta = { title: "Data display/DataTable", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Users: Story = {
  render: function Render() {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const data = useMemo(
      () => users.filter((u) => (status === "all" || u.status === status) && `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())),
      [q, status],
    );
    return (
      <DataTable
        label="Users"
        data={data}
        columns={columns}
        getRowId={(u) => u.id}
        selectable
        bulkActions={() => <Button size="sm" variant="secondary" icon="download">Export selected</Button>}
        rowActions={[
          { label: "View", icon: "eye", onSelect: () => {} },
          { label: "Change role", icon: "shield", onSelect: () => {} },
          { label: "Suspend", icon: "lock", tone: "danger", onSelect: () => {} },
        ]}
        onRowClick={() => {}}
        toolbar={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Search users…" />
            <FilterChips value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "invited", label: "Invited" }, { value: "suspended", label: "Suspended" }]} />
          </>
        }
        initialSorting={[{ id: "joined", desc: true }]}
      />
    );
  },
};

export const Loading: Story = { render: () => <DataTable label="Users" data={undefined} loading columns={columns} getRowId={(u) => u.id} /> };
export const Empty: Story = { render: () => <DataTable label="Users" data={[]} columns={columns} getRowId={(u) => u.id} empty={{ title: "No users match", description: "Clear filters to see everyone." }} /> };
export const Error: Story = { render: () => <DataTable label="Users" data={[]} error={new globalThis.Error("Request timed out")} onRetry={() => {}} columns={columns} getRowId={(u) => u.id} /> };
export const StickyHeader: Story = { render: () => <DataTable label="Users" data={users} columns={columns} getRowId={(u) => u.id} pageSize={50} maxHeight={360} /> };
