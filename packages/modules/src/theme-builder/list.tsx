"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLATFORM_LABELS, type ThemeStatus } from "@gitwork/data";
import { Can, moduleHref, PageHeader, useAdapter } from "@gitwork/admin-shell";
import { Button, DataState, EmptyState, FilterChips, formatDate, MediaCard, Skeleton } from "@gitwork/ui";

export function ThemeList({ basePath }: { basePath: string }) {
  const adapter = useAdapter("themes");
  const router = useRouter();
  const [status, setStatus] = useState<ThemeStatus | "all">("all");
  const q = useQuery({ queryKey: ["themes", "list"], queryFn: () => adapter.list() });
  const all = q.data ?? [];
  const count = (s: ThemeStatus) => all.filter((t) => t.status === s).length;
  const order: ThemeStatus[] = ["live", "scheduled", "draft", "ended"];
  const shown = (status === "all" ? all : all.filter((t) => t.status === status)).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const newTheme = <Button icon="plus" onClick={() => router.push(moduleHref({ basePath }, "new"))}>New theme</Button>;

  return (
    <>
      <PageHeader title="Theme builder" subtitle="Seasonal looks for the app and web" actions={<Can permission="themes.manage">{newTheme}</Can>}>
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
      </PageHeader>
      <DataState
        query={{ ...q, data: q.data ? shown : undefined }}
        loading={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-video" />)}</div>}
        empty={<EmptyState icon="theme" title={status === "all" ? "No seasonal themes yet" : `No ${status} themes`} description="Create a theme to change the app's splash, icon, background and colours for a season." />}
      >
        {(themes) => (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {themes.map((t) => (
              <MediaCard
                key={t.id}
                image={t.assets.background.desktop?.url ?? t.assets.background.mobile?.url}
                title={t.name}
                subtitle={t.startsAt ? `${formatDate(t.startsAt)}${t.endsAt ? ` – ${formatDate(t.endsAt)}` : ""}` : "No dates set"}
                status={t.status}
                meta={t.platforms.map((p) => PLATFORM_LABELS[p]).join(" · ")}
                onClick={() => router.push(moduleHref({ basePath }, ":id", { id: t.id }))}
              />
            ))}
          </div>
        )}
      </DataState>
    </>
  );
}
