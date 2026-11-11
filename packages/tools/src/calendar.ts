/**
 * What "today", "tomorrow", "this weekend" and "next week" mean for the user, as `YYYY-MM-DD` dates. Models are bad
 * at date arithmetic and don't know the date at all, so `get_time` hands them the answers. Pure: no DOM, no clock.
 */

/** Day numbers as `Intl.Locale` week info uses them: 1 = Monday … 7 = Sunday. */
export interface WeekInfo {
  /** The first day of the week. */
  firstDay: number;
  /** The days of the weekend. */
  weekend: readonly number[];
}

/** Monday-first, Saturday–Sunday weekend: when the browser can't say. */
export const DEFAULT_WEEK: WeekInfo = { firstDay: 1, weekend: [6, 7] };

/** One date and its weekday. */
export interface Day {
  /** `YYYY-MM-DD`. */
  date: string;
  /** "Mon" … "Sun". */
  weekday: string;
}

/** The dates around today a person means by relative words. */
export interface Calendar {
  today: Day;
  tomorrow: Day;
  /** The next weekend, or this one when it's already the weekend. */
  weekend: { start: string; end: string };
  /** The week after this one, by the locale's first day of the week. */
  nextWeek: { start: string; end: string };
  /** The `days` days after today. */
  upcoming: Day[];
}

const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** The full name of a day number (1 = Monday). */
export const dayName = (day: number): string =>
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day - 1] ?? "Monday";

/** The local calendar date of `now`, as `YYYY-MM-DD`. */
export function isoDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `iso` moved by `days` (arithmetic in UTC, so no time zone shifts a day). */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = Monday … 7 = Sunday, for a `YYYY-MM-DD` date. */
const dayOf = (iso: string): number => new Date(`${iso}T00:00:00Z`).getUTCDay() || 7;
const day = (date: string): Day => ({ date, weekday: NAMES[dayOf(date) - 1]! });

/** The calendar around `now` (its local date), for a locale's week. */
export function calendarAt(now: Date, week: WeekInfo = DEFAULT_WEEK, days = 14): Calendar {
  const today = isoDate(now);
  const dow = dayOf(today);

  let weekendStart = today;
  while (!week.weekend.includes(dayOf(weekendStart))) weekendStart = addDays(weekendStart, 1);
  // a weekend that started yesterday (today is its second day) still counts as this weekend
  while (week.weekend.includes(dayOf(addDays(weekendStart, -1))) && addDays(weekendStart, -1) >= addDays(today, -6))
    weekendStart = addDays(weekendStart, -1);
  let weekendEnd = weekendStart;
  while (week.weekend.includes(dayOf(addDays(weekendEnd, 1)))) weekendEnd = addDays(weekendEnd, 1);

  const nextWeekStart = addDays(today, (week.firstDay - dow + 7) % 7 || 7);
  return {
    today: day(today),
    tomorrow: day(addDays(today, 1)),
    weekend: { start: weekendStart, end: weekendEnd },
    nextWeek: { start: nextWeekStart, end: addDays(nextWeekStart, 6) },
    upcoming: Array.from({ length: days }, (_, i) => day(addDays(today, i + 1))),
  };
}

/** "UTC+03:00" for a Date's local offset. */
export function utcOffset(now: Date): string {
  const minutes = -now.getTimezoneOffset();
  const abs = Math.abs(minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `UTC${minutes < 0 ? "-" : "+"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * A locale's week, where the runtime knows it (`Intl.Locale#getWeekInfo()`, or the older `weekInfo` property): e.g.
 * en-US starts on Sunday, ar-AE has a Saturday–Sunday weekend, fa-IR a Friday one. `DEFAULT_WEEK` otherwise.
 */
export function weekOf(locale: string): WeekInfo {
  try {
    const info = (() => {
      const l = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?(): WeekInfo; weekInfo?: WeekInfo };
      return l.getWeekInfo?.() ?? l.weekInfo;
    })();
    return info?.firstDay && info.weekend?.length ? { firstDay: info.firstDay, weekend: [...info.weekend] } : DEFAULT_WEEK;
  } catch {
    return DEFAULT_WEEK;
  }
}
