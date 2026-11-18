"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Collection, ContentItem } from "@gitwork/data";
import { PageHeader, moduleHref, useAdapter, useCan, useScope, useSession, type ModuleRouteProps, useModuleTitle } from "@gitwork/admin-shell";
import {
  AreaChart,
  BarChart,
  Button,
  Card,
  ChartCard,
  createColumns,
  DataState,
  DataTable,
  EmptyState,
  ErrorState,
  FilterChips,
  formatDate,
  formatNumber,
  formatPercent,
  KpiStrip,
  MediaCard,
  SearchInput,
  Skeleton,
  StatusPill,
  Tag,
} from "@gitwork/ui";
import { useRouter } from "next/navigation";
import { monthLabel, useListParams } from "../shared";


export function ContentList({ basePath }: { basePath: string }) {
  const content = useAdapter("content");
  const title = useModuleTitle("Content");
  const router = useRouter();
  const { user } = useSession();
  const scope = useScope("content.manage");
  const { params, setSearch, setFilter } = useListParams({ pageSize: 48, sort: { id: "plays", desc: true } });
  const mine = params.filters?.ownerId?.length ? "mine" : "all";
  const q = useQuery({ queryKey: ["content", "list", params], queryFn: () => content.listCollections(params), placeholderData: keepPreviousData });
  const kind = q.data?.items[0]?.kind ?? "Collection";

  return (
    <>
      <PageHeader title={title} subtitle={q.data ? `${formatNumber(q.data.total)} ${kind.toLowerCase()}s` : undefined}>
        <SearchInput value={params.search ?? ""} onChange={setSearch} placeholder={`Search ${kind.toLowerCase()}s…`} />
        <FilterChips
          label="Status"
          value={params.filters?.status?.[0] ?? "all"}
          onChange={(v) => setFilter("status", v === "all" ? [] : [v])}
          options={[{ value: "all", label: "All" }, { value: "published", label: "Published" }, { value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" }]}
        />
        {scope === "own" && user && (
          <FilterChips label="Owner" value={mine} onChange={(v) => setFilter("ownerId", v === "mine" ? [user.id] : [])} options={[{ value: "all", label: "Everyone's" }, { value: "mine", label: "Mine" }]} />
        )}
      </PageHeader>
      <DataState
        query={{ ...q, data: q.data?.items }}
        loading={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}</div>}
        empty={<EmptyState icon="content" title="Nothing here" description="Try a different search or filter." />}
      >
        {(items: Collection[]) => (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((c) => (
              <MediaCard
                key={c.id}
                image={c.artwork}
                title={c.title}
                subtitle={`${c.itemCount} ${c.kind === "Group" ? "rounds" : "episodes"} · ${c.tags.join(", ")}`}
                status={c.status}
                badge={user && c.ownerId === user.id ? <Tag tone="accent">Yours</Tag> : undefined}
                meta={`${formatNumber(c.plays)} plays`}
                onClick={() => router.push(moduleHref({ basePath }, ":id", { id: c.id }))}
              />
            ))}
          </div>
        )}
      </DataState>
    </>
  );
}

const itemCol = createColumns<ContentItem>();
const itemColumns = itemCol.columns([
  itemCol.accessor("number", { header: "#", meta: { className: "w-12 text-text-muted" } }),
  itemCol.accessor("title", { header: "Title", cell: (c) => <span className="font-medium">{c.getValue()}</span> }),
  itemCol.accessor("status", { header: "Status", cell: (c) => <StatusPill status={c.getValue()} /> }),
  itemCol.accessor("durationSeconds", { header: "Length", meta: { align: "right" }, cell: (c) => `${Math.round(c.getValue() / 60)} min` }),
  itemCol.accessor("completionRate", { header: "Completion", meta: { align: "right" }, cell: (c) => formatPercent(c.getValue() * 100) }),
  itemCol.accessor("plays", { header: "Plays", meta: { align: "right" }, cell: (c) => formatNumber(c.getValue()) }),
  itemCol.accessor("publishedAt", { header: "Published", cell: (c) => (c.getValue() ? formatDate(c.getValue()!) : "–") }),
]);

export function ContentDetail({ params, basePath }: ModuleRouteProps & { basePath: string }) {
  const content = useAdapter("content");
  const title = useModuleTitle("Content");
  const q = useQuery({ queryKey: ["content", "detail", params.id], queryFn: () => content.getCollection(params.id!) });
  const c = q.data;
  const canEdit = useCan("content.manage", { ownerId: c?.ownerId ?? "__none" });
  const top = useMemo(() => [...(c?.items ?? [])].sort((a, b) => b.plays - a.plays).slice(0, 8).map((i) => ({ label: i.title.replace(/^(Episode|Round) /, "#"), plays: i.plays })), [c]);
  const months = useMemo(() => (c?.playsByMonth ?? []).map((m) => ({ label: monthLabel(m.month), plays: m.plays })), [c]);
  const back = { href: basePath, label: `All ${title.toLowerCase()}` };

  if (q.isError) {
    return (
      <>
        <PageHeader title={title} back={back} />
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </>
    );
  }

  const avgCompletion = c && c.items.length ? (c.items.reduce((s, i) => s + i.completionRate, 0) / c.items.length) * 100 : 0;

  return (
    <>
      <PageHeader title={c?.title ?? "Loading…"} subtitle={c ? `${c.kind} · updated ${formatDate(c.updatedAt)}` : undefined} back={back} actions={canEdit && <Button icon="edit" variant="secondary">Edit {c?.kind.toLowerCase()}</Button>} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          {c ? <img src={c.artwork} alt="" className="aspect-video w-full object-cover" /> : <Skeleton className="aspect-video" />}
          <div className="space-y-3 p-5">
            {c && <StatusPill status={c.status} />}
            <p className="text-sm text-text-muted">{c?.description}</p>
            <div className="flex flex-wrap gap-1.5">{c?.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          </div>
        </Card>
        <div className="space-y-4">
          <KpiStrip
            loading={q.isPending}
            items={[
              { label: "Total plays", value: c ? formatNumber(c.plays) : "" },
              { label: c?.kind === "Group" ? "Rounds" : "Episodes", value: c ? formatNumber(c.itemCount) : "" },
              { label: "Avg completion", value: formatPercent(avgCompletion) },
            ]}
          />
          <ChartCard title="Plays per month" loading={q.isPending} isEmpty={months.length === 0} height={220}>
            <AreaChart data={months} xKey="label" series={[{ key: "plays", label: "Plays" }]} height={220} ariaLabel="Plays per month" />
          </ChartCard>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="mb-3 text-lg font-semibold text-text">{c?.kind === "Group" ? "Rounds" : "Episodes"}</h2>
          <DataTable label="Items" data={c?.items} loading={q.isPending} columns={itemColumns} getRowId={(i) => i.id} initialSorting={[{ id: "number", desc: false }]} columnToggle={false} />
        </section>
        <ChartCard title="Top by plays" loading={q.isPending} isEmpty={top.length === 0}>
          <BarChart data={top} xKey="label" series={[{ key: "plays", label: "Plays" }]} highlightIndex={0} ariaLabel="Top items by plays" />
        </ChartCard>
      </div>
    </>
  );
}
