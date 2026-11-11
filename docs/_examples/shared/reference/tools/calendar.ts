import { calendarAt, weekOf } from "@webmcp-agents/tools";

// "Tomorrow" and "this weekend" for a user in en-US, whose
// week starts on Sunday.
const week = weekOf("en-US");
const { tomorrow, weekend, nextWeek } = calendarAt(new Date(), week);

console.log(tomorrow.date); // "2026-11-10"
console.log(weekend.start, weekend.end); // "2026-11-14" "2026-11-15"
console.log(nextWeek.start); // the next Sunday
