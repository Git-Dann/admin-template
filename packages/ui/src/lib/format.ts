/**
 * Number formatting and reconciliation. Admin numbers must add up:
 * totals equal the sum of their parts and percentages sum to exactly 100.
 * Everything formats en-GB with £ by default.
 */

export const LOCALE = "en-GB";
export const CURRENCY = "GBP";

const cache = new Map<string, Intl.NumberFormat>();
function nf(options: Intl.NumberFormatOptions, locale = LOCALE) {
  const key = locale + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) cache.set(key, (f = new Intl.NumberFormat(locale, options)));
  return f;
}

/** 12,345 */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return nf({ maximumFractionDigits: 0, ...options }).format(value);
}

/** £12,345 or £12,345.67 when `pence` is true. */
export function formatCurrency(value: number, { pence = false, currency = CURRENCY } = {}): string {
  return nf({ style: "currency", currency, minimumFractionDigits: pence ? 2 : 0, maximumFractionDigits: pence ? 2 : 0 }).format(value);
}

/** 12.3K / £1.2M for tight spaces such as chart axes. */
export function formatCompact(value: number, { currency = false } = {}): string {
  return nf({ notation: "compact", maximumFractionDigits: 1, ...(currency ? { style: "currency", currency: CURRENCY } : {}) }).format(value);
}

/** 42% from 42 (not 0.42). */
export function formatPercent(value: number, digits = 0): string {
  return `${nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}%`;
}

/** +12% / −3% with a real minus sign. */
export function formatDelta(value: number, digits = 0): string {
  const abs = formatPercent(Math.abs(value), digits);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Whole-number percentage shares that always sum to exactly 100
 * (largest remainder method). Use for "share" bars, pie legends and breakdowns.
 */
export function toShares(values: readonly number[], digits = 0): number[] {
  const total = sum(values);
  if (total <= 0) return values.map(() => 0);
  const scale = 10 ** digits;
  const target = 100 * scale;
  const raw = values.map((v) => (v / total) * target);
  const floored = raw.map(Math.floor);
  let remainder = target - sum(floored);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (remainder <= 0) break;
    floored[i]! += 1;
    remainder -= 1;
  }
  return floored.map((v) => v / scale);
}

/** Percentage change from previous to current, or null if there's no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Throws in development when parts don't add up to the total. Call it in adapters and
 * module view-models so mismatched numbers never reach a screen.
 */
export function assertReconciles(label: string, total: number, parts: readonly number[], tolerance = 0.005): void {
  const diff = Math.abs(total - sum(parts));
  if (diff > tolerance && process.env.NODE_ENV !== "production") {
    throw new Error(`${label}: total ${total} does not equal the sum of its parts (${sum(parts)}).`);
  }
}

/** Initials for avatars: "Dan Smith" → "DS", "fellas" → "F". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", year: "2-digit" });

export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));
export const formatMonth = (d: Date | string) => monthFmt.format(new Date(d));

/** 1.2 MB */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${formatNumber(value, { maximumFractionDigits: 1 })} ${units[unit]}`;
}
