/**
 * Imperative WebTool: get_time (global). The user's current date, time and time zone, and what relative dates mean
 * for them ("tomorrow", "this weekend", "next week", the next 14 days by weekday), so "fly next Friday" becomes a
 * YYYY-MM-DD the agent didn't have to work out. The week start and weekend follow the user's locale where the browser
 * says (Intl.Locale week info), e.g. a Sunday-first week with a Friday–Saturday weekend.
 */
import { defineWebTool } from "@webmcp-agents/react";
import { z } from "zod";
import { calendarAt, DEFAULT_WEEK, utcOffset, type WeekInfo } from "../lib/calendar";

/** The locale's week, where the browser knows it (`getWeekInfo()`, or the older `weekInfo` property). */
function localeWeek(): WeekInfo {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?(): WeekInfo; weekInfo?: WeekInfo };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    return info?.firstDay && info.weekend?.length ? { firstDay: info.firstDay, weekend: info.weekend } : DEFAULT_WEEK;
  } catch {
    return DEFAULT_WEEK;
  }
}

const NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const getTime = defineWebTool({
  id: "get_time",
  title: "Current date and time",
  description:
    "The user's current date, time and time zone, and the dates of tomorrow, this weekend, next week and the next 14 days by weekday. Use whenever the user gives a relative date (today, tomorrow, this weekend, next Friday, next week, in 3 days) before searching: never guess today's date. Next: search_flights with date as YYYY-MM-DD.",
  inputSchema: z.object({}),
  annotations: { readOnlyHint: true },
  execute: () => {
    const now = new Date();
    const week = localeWeek();
    const cal = calendarAt(now, week);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = utcOffset(now);
    const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const range = (r: { start: string; end: string }) => (r.start === r.end ? r.start : `${r.start} to ${r.end}`);
    // one fact per line, no full stop after a date: models copy "2026-11-13." into arguments
    const text = [
      `Now: ${time} on ${cal.today.weekday} ${cal.today.date} for the user (${timeZone}, ${offset})`,
      `Today: ${cal.today.date}`,
      `Tomorrow: ${cal.tomorrow.date} (${cal.tomorrow.weekday})`,
      `This weekend: ${range(cal.weekend)}`,
      `Next week: ${range(cal.nextWeek)} (weeks start on ${NAMES[week.firstDay - 1]} here)`,
      `Next 14 days: ${cal.upcoming.map((d) => `${d.weekday} ${d.date}`).join(", ")}`,
      "Pass dates to search_flights exactly as YYYY-MM-DD",
    ].join("\n");
    return {
      content: [{ type: "text", text }],
      structuredContent: { now: now.toISOString(), time, timeZone, utcOffset: offset, week, ...cal },
    };
  },
});
