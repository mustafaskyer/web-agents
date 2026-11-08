/**
 * What "today", "tomorrow", "this weekend" and "next week" mean for the user, as `YYYY-MM-DD` dates. Models are
 * bad at date arithmetic and don't know the date at all, so get_time hands them the answers. Pure (node-tested).
 */
import { addDays, todayIso } from "./dates";

/** Day numbers as `Intl.Locale` week info uses them: 1 = Monday … 7 = Sunday. */
export interface WeekInfo {
  firstDay: number;
  weekend: readonly number[];
}

/** Monday-first, Saturday–Sunday weekend: when the browser can't say. */
export const DEFAULT_WEEK: WeekInfo = { firstDay: 1, weekend: [6, 7] };

export interface Day {
  date: string;
  /** "Mon" … "Sun". */
  weekday: string;
}

export interface Calendar {
  today: Day;
  tomorrow: Day;
  /** The next weekend, or this one when it's already the weekend. */
  weekend: { start: string; end: string };
  /** The week after this one, by the locale's first day of the week. */
  nextWeek: { start: string; end: string };
  /** The next `days` days after today. */
  upcoming: Day[];
}

const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** 1 = Monday … 7 = Sunday, for a `YYYY-MM-DD` date. */
const dayOf = (iso: string): number => new Date(`${iso}T00:00:00Z`).getUTCDay() || 7;
const day = (date: string): Day => ({ date, weekday: NAMES[dayOf(date) - 1]! });

/** The calendar around `now` (the local date), for a locale's week. */
export function calendarAt(now: Date, week: WeekInfo = DEFAULT_WEEK, days = 14): Calendar {
  const today = todayIso(now);
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
