/**
 * Dates as plain `YYYY-MM-DD` strings. Arithmetic happens in UTC, so a
 * timezone never shifts a day; only "today" uses the person's local date.
 */
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** The local calendar date. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const long = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const short = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
/** `Sat, 8 Nov 2026` (or `Sat, 8 Nov` with `year: false`). */
export const formatDate = (iso: string, { year = true } = {}): string => (year ? long : short).format(new Date(`${iso}T00:00:00Z`));
