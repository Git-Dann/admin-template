"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import type { Coupon, CouponStatus, StaffCode } from "@gitwork/data";
import { PageHeader, useAdapter, useCan } from "@gitwork/admin-shell";
import {
  Button,
  CodeChip,
  createColumns,
  DataState,
  DataTable,
  Dialog,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  FilterChips,
  formatDate,
  formatNumber,
  SearchInput,
  SelectField,
  Skeleton,
  StatusPill,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TextField,
  TicketCard,
  toast,
  useZodForm,
  DateField,
} from "@gitwork/ui";
import { useListParams } from "../shared";

export function couponValue(c: Pick<Coupon, "kind" | "amount">): string {
  if (c.kind === "percent") return `${c.amount}% off`;
  if (c.kind === "fixed") return `£${c.amount} off`;
  return c.amount % 30 === 0 ? `${c.amount / 30} month${c.amount > 30 ? "s" : ""} free` : `${c.amount} days free`;
}

const couponSchema = z.object({
  title: z.string().min(3, "Give the code a name"),
  code: z.string().regex(/^[A-Z0-9-]{4,16}$/, "4–16 capital letters, numbers or dashes"),
  kind: z.enum(["percent", "fixed", "trial"]),
  amount: z.coerce.number<string>().positive("Must be more than 0"),
  startsAt: z.string().min(1, "Choose a start date"),
  endsAt: z.string().optional(),
  limit: z.coerce.number<string>().int().positive().optional().or(z.literal("").transform(() => undefined)),
});

function NewCouponDialog() {
  const adapter = useAdapter("coupons");
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useZodForm(couponSchema, { title: "", code: "", kind: "percent", amount: "20", startsAt: "", endsAt: "", limit: "" });
  const create = useMutation({
    mutationFn: (v: z.output<typeof couponSchema>) =>
      adapter.createCoupon({ ...v, startsAt: new Date(v.startsAt).toISOString(), endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : undefined, audience: "Everyone", platforms: ["ios", "android", "web"] }),
    onSuccess: (c) => {
      void client.invalidateQueries({ queryKey: ["coupons"] });
      toast.success(`${c.code} created as a draft`);
      setOpen(false);
      form.reset();
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon="plus">New code</Button>
      </DialogTrigger>
      <DialogContent title="New promo code" description="Codes start as drafts. Set them live when you're ready.">
        <form className="grid gap-4" onSubmit={form.handleSubmit((v) => create.mutate(v))} noValidate>
          <TextField control={form.control} name="title" label="Name" placeholder="Black Friday" required />
          <TextField control={form.control} name="code" label="Code" placeholder="BLACKFRI40" required description="What people type in the app." />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField control={form.control} name="kind" label="Type" options={[{ value: "percent", label: "Percentage off" }, { value: "fixed", label: "Amount off (£)" }, { value: "trial", label: "Free trial (days)" }]} />
            <TextField control={form.control} name="amount" label="Amount" type="number" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField control={form.control} name="startsAt" label="Starts" required />
            <DateField control={form.control} name="endsAt" label="Ends" optional />
          </div>
          <TextField control={form.control} name="limit" label="Redemption limit" type="number" optional />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create code</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PromoCodes() {
  const adapter = useAdapter("coupons");
  const client = useQueryClient();
  const canManage = useCan("coupons.manage");
  const [status, setStatus] = useState<CouponStatus | "all">("all");
  const q = useQuery({ queryKey: ["coupons", "list"], queryFn: () => adapter.listCoupons() });
  const setCouponStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CouponStatus }) => adapter.setCouponStatus(id, status),
    onSuccess: (c) => {
      void client.invalidateQueries({ queryKey: ["coupons"] });
      toast.success(`${c.code} is now ${c.status}`);
    },
  });
  const all = q.data ?? [];
  const count = (s: CouponStatus) => all.filter((c) => c.status === s).length;
  const shown = status === "all" ? all : all.filter((c) => c.status === status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All", count: all.length },
            { value: "live", label: "Live", count: count("live") },
            { value: "scheduled", label: "Scheduled", count: count("scheduled") },
            { value: "draft", label: "Draft", count: count("draft") },
            { value: "ended", label: "Ended", count: count("ended") },
          ]}
        />
        <div className="flex-1" />
        {canManage && <NewCouponDialog />}
      </div>
      <DataState
        query={{ ...q, data: q.data ? shown : undefined }}
        loading={<div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
        empty={<EmptyState icon="coupons" title={status === "all" ? "No promo codes yet" : `No ${status} codes`} description="Create a code to offer a discount or free trial." action={canManage && status === "all" ? <NewCouponDialog /> : undefined} />}
      >
        {(coupons) => (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {coupons.map((c) => (
              <TicketCard
                key={c.id}
                title={c.title}
                value={couponValue(c)}
                code={c.code}
                status={c.status}
                meta={`${c.audience} · ${formatDate(c.startsAt)}${c.endsAt ? ` – ${formatDate(c.endsAt)}` : ""}`}
                footer={c.limit ? `${formatNumber(c.redemptions)} of ${formatNumber(c.limit)} redeemed` : `${formatNumber(c.redemptions)} redeemed`}
                actions={
                  canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" icon="more" aria-label={`Actions for ${c.code}`} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {c.status !== "live" && <DropdownMenuItem icon="play" onSelect={() => setCouponStatus.mutate({ id: c.id, status: "live" })}>Set live</DropdownMenuItem>}
                        {c.status === "live" && <DropdownMenuItem icon="clock" onSelect={() => setCouponStatus.mutate({ id: c.id, status: "paused" })}>Pause</DropdownMenuItem>}
                        {c.status !== "ended" && <DropdownMenuItem icon="close" tone="danger" onSelect={() => setCouponStatus.mutate({ id: c.id, status: "ended" })}>End now</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }
              />
            ))}
          </div>
        )}
      </DataState>
    </div>
  );
}

const staffCol = createColumns<StaffCode>();
const staffColumns = staffCol.columns([
  staffCol.accessor("staffName", { header: "Staff member", cell: ({ row }) => <span><span className="block font-medium">{row.original.staffName}</span><span className="block text-xs text-text-muted">{row.original.email}</span></span> }),
  staffCol.accessor("code", { header: "Code", enableSorting: false, cell: (c) => <CodeChip code={c.getValue()} /> }),
  staffCol.accessor("uses", { header: "Uses", meta: { align: "right" }, cell: (c) => formatNumber(c.getValue()) }),
  staffCol.accessor("status", { header: "Status", cell: (c) => <StatusPill status={c.getValue()} /> }),
  staffCol.accessor("createdAt", { header: "Created", cell: (c) => formatDate(c.getValue()) }),
]);

function StaffCodes() {
  const adapter = useAdapter("coupons");
  const client = useQueryClient();
  const canManage = useCan("coupons.manage");
  const { params, setSearch, setPage, setSort } = useListParams({ sort: { id: "createdAt", desc: true } });
  const q = useQuery({ queryKey: ["coupons", "staff", params], queryFn: () => adapter.listStaffCodes(params), placeholderData: keepPreviousData });
  const [open, setOpen] = useState(false);
  const form = useZodForm(z.object({ staffName: z.string().min(2, "Enter their name"), email: z.email("Enter a valid email") }), { staffName: "", email: "" });
  const create = useMutation({
    mutationFn: (v: { staffName: string; email: string }) => adapter.createStaffCode(v),
    onSuccess: (s) => {
      void client.invalidateQueries({ queryKey: ["coupons", "staff"] });
      toast.success(`Created ${s.code} for ${s.staffName}`);
      setOpen(false);
      form.reset();
    },
  });
  return (
    <DataTable
      label="Staff codes"
      data={q.data?.items}
      loading={q.isPending}
      error={q.error}
      onRetry={() => void q.refetch()}
      columns={staffColumns}
      getRowId={(s) => s.id}
      server={{ rowCount: q.data?.total ?? 0, pagination: { pageIndex: params.page, pageSize: params.pageSize }, onPaginationChange: (p) => setPage(p.pageIndex, p.pageSize), sorting: params.sort ? [params.sort] : [], onSortingChange: (s) => setSort(s[0]) }}
      toolbar={
        <>
          <SearchInput value={params.search ?? ""} onChange={setSearch} placeholder="Search staff or code…" />
          <div className="flex-1" />
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button icon="plus">New staff code</Button>
              </DialogTrigger>
              <DialogContent title="New staff code" size="sm">
                <form className="grid gap-4" onSubmit={form.handleSubmit((v) => create.mutate(v))} noValidate>
                  <TextField control={form.control} name="staffName" label="Name" required />
                  <TextField control={form.control} name="email" label="Email" type="email" required />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" loading={create.isPending}>Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </>
      }
      empty={{ title: "No staff codes", description: "Staff codes give team members free access." }}
    />
  );
}

export function CouponsPage() {
  return (
    <>
      <PageHeader title="Coupons" subtitle="Promo codes and staff access" />
      <Tabs defaultValue="promo">
        <TabsList className="mb-6">
          <TabsTrigger value="promo">Promo codes</TabsTrigger>
          <TabsTrigger value="staff">Staff codes</TabsTrigger>
        </TabsList>
        <TabsContent value="promo"><PromoCodes /></TabsContent>
        <TabsContent value="staff"><StaffCodes /></TabsContent>
      </Tabs>
    </>
  );
}
