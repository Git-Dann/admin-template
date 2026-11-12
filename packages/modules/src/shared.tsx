"use client";

import { useState } from "react";
import type { ListParams } from "@gitwork/data";

/** Server-table state (page, sort, search, filters) in one place, ready for an adapter's list(). */
export function useListParams(initial: Partial<ListParams> = {}) {
  const [params, setParams] = useState<ListParams>({ page: 0, pageSize: 10, ...initial });
  return {
    params,
    setSearch: (search: string) => setParams((p) => ({ ...p, search, page: 0 })),
    setFilter: (field: string, values: string[]) => setParams((p) => ({ ...p, page: 0, filters: { ...p.filters, [field]: values } })),
    setPage: (page: number, pageSize: number) => setParams((p) => ({ ...p, page, pageSize })),
    setSort: (sort: ListParams["sort"]) => setParams((p) => ({ ...p, sort, page: 0 })),
  };
}

/** Escape and join rows as CSV (RFC 4180). */
export function toCsv(rows: Array<Array<string | number>>): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** yyyy-mm → "Nov 26" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(y!, m! - 1, 1)));
}

export function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Inclusive range covering the last `months` whole months including the current one. */
export function lastMonths(months: number, today = new Date()): { from: string; to: string } {
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months + 1, 1));
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  return { from: isoDay(from), to: isoDay(to) };
}
