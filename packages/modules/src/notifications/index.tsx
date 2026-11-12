"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { PLATFORM_LABELS, type PushNotification } from "@gitwork/data";
import { Can, moduleHref, PageHeader, useAdapter, useAdminConfig, useSession, type AdminModule } from "@gitwork/admin-shell";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  createColumns,
  DataTable,
  DateField,
  FilterChips,
  formatDateTime,
  formatNumber,
  formatPercent,
  Icon,
  RadioCards,
  RadioCardsField,
  SearchInput,
  StatusPill,
  TextField,
  toast,
  useZodForm,
} from "@gitwork/ui";
import { useListParams } from "../shared";

const col = createColumns<PushNotification>();

function History({ basePath }: { basePath: string }) {
  const adapter = useAdapter("notifications");
  const router = useRouter();
  const { params, setSearch, setFilter, setPage } = useListParams();
  const q = useQuery({ queryKey: ["notifications", "list", params], queryFn: () => adapter.list(params), placeholderData: keepPreviousData });
  const audiences = useQuery({ queryKey: ["notifications", "audiences"], queryFn: () => adapter.audiences() });
  const audienceLabel = useMemo(() => new Map((audiences.data ?? []).map((a) => [a.id, a.label])), [audiences.data]);

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("title", { header: "Notification", enableSorting: false, cell: ({ row }) => <span><span className="block font-medium">{row.original.title}</span><span className="block max-w-md truncate text-xs text-text-muted">{row.original.body}</span></span> }),
        col.accessor("status", { header: "Status", enableSorting: false, cell: (c) => <StatusPill status={c.getValue()} /> }),
        col.accessor("audienceId", { header: "Audience", enableSorting: false, cell: (c) => audienceLabel.get(c.getValue()) ?? c.getValue() }),
        col.accessor("platforms", { header: "Platforms", enableSorting: false, cell: (c) => c.getValue().map((p) => PLATFORM_LABELS[p]).join(", ") }),
        col.accessor((n) => n.sentAt ?? n.scheduledFor, { id: "when", header: "When", enableSorting: false, cell: (c) => (c.getValue() ? formatDateTime(c.getValue()!) : "–") }),
        col.accessor("delivered", { header: "Delivered", enableSorting: false, meta: { align: "right" }, cell: (c) => (c.getValue() !== undefined ? formatNumber(c.getValue()!) : "–") }),
        col.accessor((n) => (n.delivered ? (n.opened ?? 0) / n.delivered : undefined), { id: "openRate", header: "Opened", enableSorting: false, meta: { align: "right" }, cell: (c) => (c.getValue() !== undefined ? formatPercent(c.getValue()! * 100, 1) : "–") }),
      ]),
    [audienceLabel],
  );

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Push notifications to app users"
        actions={<Can permission="notifications.send"><Button icon="plus" onClick={() => router.push(moduleHref({ basePath }, "new"))}>New notification</Button></Can>}
      >
        <FilterChips
          label="Status"
          value={params.filters?.status?.[0] ?? "all"}
          onChange={(v) => setFilter("status", v === "all" ? [] : [v])}
          options={[{ value: "all", label: "All" }, { value: "sent", label: "Sent" }, { value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" }, { value: "failed", label: "Failed" }]}
        />
      </PageHeader>
      <DataTable
        label="Notification history"
        data={q.data?.items}
        loading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        columns={columns}
        getRowId={(n) => n.id}
        server={{ rowCount: q.data?.total ?? 0, pagination: { pageIndex: params.page, pageSize: params.pageSize }, onPaginationChange: (p) => setPage(p.pageIndex, p.pageSize) }}
        toolbar={<SearchInput value={params.search ?? ""} onChange={setSearch} placeholder="Search notifications…" />}
        empty={{ title: "No notifications yet", description: "Send your first push notification to app users." }}
      />
    </>
  );
}

const schema = z
  .object({
    title: z.string().min(3, "Add a title").max(50, "Keep the title under 50 characters"),
    body: z.string().min(3, "Add a message").max(140, "Keep it under 140 characters so it isn't cut off"),
    audienceId: z.string().min(1),
    platforms: z.array(z.enum(["ios", "android"])).min(1, "Pick at least one platform"),
    deepLink: z.string().optional(),
    timing: z.enum(["now", "later"]),
    date: z.string().optional(),
    time: z.string().optional(),
  })
  .refine((v) => v.timing === "now" || (v.date && v.time), { path: ["date"], message: "Choose when to send it" });

/** Lock-screen preview of a push notification. */
export function LockScreenPreview({ title, body, appName, icon }: { title: string; body: string; appName: string; icon?: string }) {
  const now = new Date();
  return (
    <div className="mx-auto w-full max-w-[300px]" aria-label="Lock screen preview">
      <div className="relative aspect-[9/19] overflow-hidden rounded-[2.5rem] border-[10px] border-text bg-bg-elevated shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/70 via-surface-raised to-bg" />
        <div className="relative flex flex-col items-center pt-10 text-text">
          <p className="text-xs font-medium opacity-80">{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(now)}</p>
          <p className="font-display text-6xl font-semibold leading-none tracking-tight">{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(now)}</p>
        </div>
        <div className="absolute inset-x-3 top-[42%] rounded-2xl bg-surface/85 p-3 shadow-md backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            {icon ? <img src={icon} alt="" className="size-5 rounded-md bg-bg object-contain p-0.5" /> : <span className="size-5 rounded-md bg-accent" />}
            <span className="flex-1 truncate font-medium uppercase tracking-wide">{appName}</span>
            <span>now</span>
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold text-text">{title || "Notification title"}</p>
          <p className="line-clamp-3 text-sm text-text">{body || "Your message appears here."}</p>
        </div>
      </div>
    </div>
  );
}

function Composer({ basePath }: { basePath: string }) {
  const adapter = useAdapter("notifications");
  const config = useAdminConfig();
  const { user } = useSession();
  const router = useRouter();
  const client = useQueryClient();
  const audiences = useQuery({ queryKey: ["notifications", "audiences"], queryFn: () => adapter.audiences() });
  const form = useZodForm(schema, { title: "", body: "", audienceId: "all", platforms: ["ios", "android"], deepLink: "", timing: "now", date: "", time: "" });
  const [title, body, timing, audienceId] = useWatch({ control: form.control, name: ["title", "body", "timing", "audienceId"] });
  const audience = audiences.data?.find((a) => a.id === audienceId);

  const send = useMutation({
    mutationFn: (v: z.output<typeof schema>) =>
      adapter.create({
        title: v.title,
        body: v.body,
        audienceId: v.audienceId,
        platforms: v.platforms,
        deepLink: v.deepLink || undefined,
        scheduledFor: v.timing === "later" ? new Date(`${v.date}T${v.time}`).toISOString() : undefined,
        sendNow: v.timing === "now",
        createdBy: user?.name ?? "Admin",
      }),
    onSuccess: (n) => {
      void client.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(n.status === "sent" ? "Notification sent" : `Scheduled for ${formatDateTime(n.scheduledFor!)}`);
      router.push(basePath);
    },
  });

  return (
    <>
      <PageHeader title="New notification" back={{ href: basePath, label: "All notifications" }} />
      <form onSubmit={form.handleSubmit((v) => send.mutate(v))} noValidate className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Message" />
            <CardBody className="grid gap-4">
              <TextField control={form.control} name="title" label="Title" required description={`${title.length}/50`} />
              <TextField control={form.control} name="body" label="Message" multiline rows={3} required description={`${body.length}/140`} />
              <TextField control={form.control} name="deepLink" label="Open in app" optional placeholder="/series/loaded-live" description="Where tapping the notification takes people." />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Audience" description={audience ? `About ${formatNumber(audience.size)} people` : undefined} />
            <CardBody className="grid gap-5">
              <RadioCardsField
                control={form.control}
                name="audienceId"
                label="Who gets it"
                columns={2}
                options={(audiences.data ?? []).map((a) => ({ value: a.id, title: a.label, description: `${a.description ?? ""} · ${formatNumber(a.size)}` }))}
              />
              <Controller
                control={form.control}
                name="platforms"
                render={({ field, fieldState }) => (
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-text">Platforms</legend>
                    <div className="flex gap-6">
                      {(["ios", "android"] as const).map((p) => (
                        <label key={p} className="flex items-center gap-2 text-sm text-text">
                          <Checkbox checked={field.value.includes(p)} onCheckedChange={(on) => field.onChange(on ? [...field.value, p] : field.value.filter((x) => x !== p))} />
                          {PLATFORM_LABELS[p]}
                        </label>
                      ))}
                    </div>
                    {fieldState.error && <p role="alert" className="mt-1 text-xs font-medium text-danger">{fieldState.error.message}</p>}
                  </fieldset>
                )}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Schedule" />
            <CardBody className="grid gap-4">
              <Controller
                control={form.control}
                name="timing"
                render={({ field }) => (
                  <RadioCards label="When" value={field.value} onValueChange={field.onChange} options={[{ value: "now", title: "Send now", icon: "megaphone" }, { value: "later", title: "Schedule", icon: "calendar" }]} />
                )}
              />
              {timing === "later" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField control={form.control} name="date" label="Date" required />
                  <DateField control={form.control} name="time" label="Time" kind="time" required />
                </div>
              )}
              {timing === "now" && audience && <Callout tone="warning">This goes to about {formatNumber(audience.size)} people straight away and can't be recalled.</Callout>}
            </CardBody>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => router.push(basePath)}>Cancel</Button>
            <Button type="submit" icon={timing === "now" ? "megaphone" : "calendar"} loading={send.isPending}>
              {timing === "now" ? "Send now" : "Schedule"}
            </Button>
          </div>
        </div>
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-text-muted"><Icon name="phone" size="sm" />Lock screen preview</p>
          <LockScreenPreview title={title} body={body} appName={config.brand.productName.replace(/ Admin$/, "")} icon={config.brand.logo?.mark} />
        </aside>
      </form>
    </>
  );
}

/** Push notifications: composer with audience, schedule and lock-screen preview, plus history. */
export function notifications(options: { basePath?: string; title?: string } = {}): AdminModule {
  const basePath = options.basePath ?? "/notifications";
  return {
    id: "notifications",
    title: options.title ?? "Notifications",
    icon: "megaphone",
    basePath,
    permission: "notifications.read",
    permissions: [
      { id: "notifications.read", label: "View notification history" },
      { id: "notifications.send", label: "Send and schedule notifications" },
    ],
    adapters: ["notifications"],
    routes: [
      { path: "", component: () => <History basePath={basePath} /> },
      { path: "new", component: () => <Composer basePath={basePath} />, permission: "notifications.send" },
    ],
  };
}
