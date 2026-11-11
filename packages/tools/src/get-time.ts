/**
 * `get_time`: the user's date, time, time zone and locale, and what relative dates mean for them ("tomorrow", "this
 * weekend", "next Friday"), so "book it for next Friday" becomes a `YYYY-MM-DD` the agent didn't have to work out.
 * The week start and weekend follow the user's locale where the browser knows it (a Sunday-first week, a
 * Friday–Saturday weekend).
 */
import { defineWebTool, type WebTool } from "@webmcp-agents/core";
import { type Calendar, calendarAt, dayName, utcOffset, type WeekInfo, weekOf } from "./calendar";
import type { CommonToolOptions } from "./shared";

/** Options for `getTime`. */
export interface GetTimeOptions extends CommonToolOptions {
  /** The user's locale, for the week's first day and weekend. Default: the browser's language (`navigator.language`). */
  locale?: string;
}

/** What `get_time` knows, in `structuredContent` (and what `invoke` resolves to there). */
export interface TimeInfo extends Calendar {
  /** The moment, as an ISO string (UTC). */
  now: string;
  /** "14:05", the user's local time. */
  time: string;
  /** The IANA time zone, e.g. "Europe/London". */
  timeZone: string;
  /** "UTC+01:00". */
  utcOffset: string;
  /** The locale the week came from, e.g. "en-GB". */
  locale: string;
  /** The locale's week: first day and weekend (1 = Monday … 7 = Sunday). */
  week: WeekInfo;
}

/** What the tool answers: one fact per line for the agent, `structuredContent` for code. */
export interface TimeAnswer {
  content: [{ type: "text"; text: string }];
  structuredContent: TimeInfo;
}

const DESCRIPTION =
  "Answer the user's current date, time, time zone and locale, and the dates of tomorrow, this weekend, next week and the next 14 days by weekday. Use whenever the user gives a relative date (today, tomorrow, this weekend, next Friday, in 3 days) or asks the time: never guess today's date. Needs nothing first. Next: pass the date you need to the tool that takes it, as YYYY-MM-DD.";

/** The `get_time` tool: date, time, time zone, locale and relative dates. Read-only. */
export function getTime({
  id = "get_time",
  description = DESCRIPTION,
  locale,
}: GetTimeOptions = {}): WebTool<Record<string, never>, TimeAnswer> {
  return defineWebTool<Record<string, never>, TimeAnswer>({
    id,
    title: "Current date and time",
    description,
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    execute: () => {
      const now = new Date();
      const lang = locale ?? (typeof navigator === "undefined" ? "en" : navigator.language) ?? "en";
      const week = weekOf(lang);
      const cal = calendarAt(now, week);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = utcOffset(now);
      const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const range = (r: { start: string; end: string }) => (r.start === r.end ? r.start : `${r.start} to ${r.end}`);
      // one fact per line, no full stop after a date: models copy "2026-11-13." into arguments
      const text = [
        `Now: ${time} on ${cal.today.weekday} ${cal.today.date} for the user (${timeZone}, ${offset})`,
        `Today: ${cal.today.date} (${cal.today.weekday})`,
        `Tomorrow: ${cal.tomorrow.date} (${cal.tomorrow.weekday})`,
        `This weekend: ${range(cal.weekend)}`,
        `Next week: ${range(cal.nextWeek)} (weeks start on ${dayName(week.firstDay)} for ${lang})`,
        `Next 14 days: ${cal.upcoming.map((d) => `${d.weekday} ${d.date}`).join(", ")}`,
        "Pass dates exactly as YYYY-MM-DD",
      ].join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: { now: now.toISOString(), time, timeZone, utcOffset: offset, locale: lang, week, ...cal },
      };
    },
  });
}
