import { describe, expect, it } from "vitest";
import { calendarAt } from "./calendar";

// local dates: new Date(y, m, d, h) is in the test machine's zone, as the browser's would be
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 14, 5);
const SAUDI = { firstDay: 7, weekend: [5, 6] }; // Sunday-first, Friday–Saturday weekend

describe("calendarAt", () => {
  it("names today, tomorrow and the next 14 days", () => {
    const cal = calendarAt(at(2026, 11, 8)); // a Sunday
    expect(cal.today).toEqual({ date: "2026-11-08", weekday: "Sun" });
    expect(cal.tomorrow).toEqual({ date: "2026-11-09", weekday: "Mon" });
    expect(cal.upcoming).toHaveLength(14);
    expect(cal.upcoming.find((d) => d.weekday === "Fri")?.date).toBe("2026-11-13"); // "next Friday"
  });

  it("next week starts on the locale's first day", () => {
    expect(calendarAt(at(2026, 11, 8)).nextWeek).toEqual({ start: "2026-11-09", end: "2026-11-15" }); // Monday-first
    expect(calendarAt(at(2026, 11, 8), SAUDI).nextWeek).toEqual({ start: "2026-11-15", end: "2026-11-21" }); // Sunday-first
    expect(calendarAt(at(2026, 11, 9)).nextWeek.start).toBe("2026-11-16"); // on a Monday, next week is 7 days on
  });

  it("this weekend follows the locale, and includes today when it's the weekend", () => {
    expect(calendarAt(at(2026, 11, 10)).weekend).toEqual({ start: "2026-11-14", end: "2026-11-15" }); // Tue → Sat–Sun
    expect(calendarAt(at(2026, 11, 10), SAUDI).weekend).toEqual({ start: "2026-11-13", end: "2026-11-14" }); // Fri–Sat
    expect(calendarAt(at(2026, 11, 8)).weekend).toEqual({ start: "2026-11-07", end: "2026-11-08" }); // on Sunday: this one
  });
});
