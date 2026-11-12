import type { AdapterKey, ListParams, Page } from "../types";

/** Small seeded PRNG so mock data is identical on every load. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
    weighted: <T>(items: readonly (readonly [T, number])[]): T => {
      const total = items.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [item, w] of items) if ((r -= w) <= 0) return item;
      return items.at(-1)![0];
    },
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof rng>;

/** Split an integer total across weights so the parts sum exactly to the total. */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest-- <= 0) break;
    out[i]! += 1;
  }
  return out;
}

export function reconcile(label: string, total: number, parts: number[]) {
  const sum = parts.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - total) > 0.005) throw new Error(`[mock] ${label}: ${total} ≠ ${sum}`);
}

export interface MockBehaviour {
  latency: [number, number];
  /** Adapters that should throw, e.g. to review error states. */
  fail: AdapterKey[];
  /** Adapters that should return nothing, to review empty states. */
  empty: AdapterKey[];
}

/** Reads `?mock-fail=reports,users`, `?mock-empty=coupons` and `?mock-latency=0` from the URL. */
export function urlBehaviour(base: MockBehaviour): MockBehaviour {
  if (typeof window === "undefined") return base;
  const q = new URLSearchParams(window.location.search);
  const list = (k: string) => (q.get(k)?.split(",").filter(Boolean) ?? []) as AdapterKey[];
  const latency = q.get("mock-latency");
  return {
    latency: latency !== null ? [Number(latency), Number(latency)] : base.latency,
    fail: [...base.fail, ...list("mock-fail")],
    empty: [...base.empty, ...list("mock-empty")],
  };
}

export function makeRunner(key: AdapterKey, behaviour: () => MockBehaviour) {
  return async function run<T>(fn: () => T | Promise<T>, emptyValue?: () => T): Promise<T> {
    const b = behaviour();
    const [min, max] = b.latency;
    const delay = min + Math.random() * (max - min);
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    if (b.fail.includes(key)) throw new Error(`The ${key} service didn't respond (mock failure).`);
    if (emptyValue && b.empty.includes(key)) return emptyValue();
    // Return copies so UI code can't mutate the mock store by accident.
    return structuredClone(await fn());
  };
}

/** Generic in-memory list query: search, filters, sort, paginate. */
export function query<T extends object>(rows: T[], params: ListParams, searchFields: (keyof T)[]): Page<T> {
  let out = rows;
  const q = params.search?.trim().toLowerCase();
  if (q) out = out.filter((r) => searchFields.some((f) => String(r[f] ?? "").toLowerCase().includes(q)));
  for (const [field, values] of Object.entries(params.filters ?? {})) {
    if (values.length) out = out.filter((r) => values.includes(String((r as Record<string, unknown>)[field])));
  }
  if (params.sort) {
    const { id, desc } = params.sort;
    out = [...out].sort((a, b) => {
      const x = (a as Record<string, unknown>)[id];
      const y = (b as Record<string, unknown>)[id];
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
      return desc ? -cmp : cmp;
    });
  }
  const start = params.page * params.pageSize;
  return { items: out.slice(start, start + params.pageSize), total: out.length };
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const isoMonth = (d: Date) => d.toISOString().slice(0, 7);
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
export function addMonths(d: Date, n: number) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  return x;
}
export const id = (prefix: string, n: number) => `${prefix}_${n.toString(36).padStart(4, "0")}`;

/** Simple generated artwork as an SVG data URL (no network needed). */
export function artwork(seed: number, label = "", ratio: [number, number] = [16, 9]): string {
  const h1 = (seed * 47) % 360;
  const h2 = (h1 + 50) % 360;
  const [w, h] = ratio;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * 20} ${h * 20}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 65% 42%)"/><stop offset="1" stop-color="hsl(${h2} 70% 18%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 15}" cy="${h * 5}" r="${h * 6}" fill="white" fill-opacity="0.08"/>${label ? `<text x="20" y="${h * 20 - 24}" font-family="system-ui,sans-serif" font-size="${h * 2.4}" font-weight="700" fill="white" fill-opacity="0.92">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>` : ""}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
