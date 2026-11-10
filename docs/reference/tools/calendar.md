---
description: "The pure calendar behind getTime: what \"today\", \"tomorrow\", \"this weekend\" and \"next week\" mean for a user, as YYYY-MM-DD dates, for a locale's week."
---

# `calendarAt`, `weekOf`

The pure calendar behind [`getTime`](./get-time.md): what "today", "tomorrow", "this weekend" and "next week" mean for a user, as `YYYY-MM-DD` dates, for a locale's week. No DOM, no clock: pass the moment in. Use it when you need the same answers outside the tool, in a server action or a test.

## Import

```ts
import { calendarAt, DEFAULT_WEEK, weekOf } from "@webmcp-agents/tools";
import type { Calendar, Day, WeekInfo } from "@webmcp-agents/tools";
```

## Example

<include meta='title="calendar.ts"'>/_examples/shared/reference/tools/calendar.ts</include>

## Options

`calendarAt(now, week?, days?)` takes three arguments; `weekOf(locale)` takes one.

| Name | Type | Default | Description |
|---|---|---|---|
| `now` | `Date` | required | The moment; its local calendar date is "today". |
| `week` | `WeekInfo` | `DEFAULT_WEEK` | The week's first day and weekend, as `weekOf` returns them. |
| `days` | `number` | `14` | How many days after today `upcoming` lists. |
| `locale` | `string` | required | For `weekOf`: a BCP 47 tag such as `"en-US"`. |

### `WeekInfo`

Day numbers are those of `Intl.Locale`: 1 = Monday … 7 = Sunday.

| Name | Type | Description |
|---|---|---|
| `firstDay` | `number` | The first day of the week. |
| `weekend` | `readonly number[]` | The days of the weekend. |

`DEFAULT_WEEK` is `{ firstDay: 1, weekend: [6, 7] }`: Monday first, Saturday and Sunday off.

## Returns

`calendarAt` returns a `Calendar`:

| Name | Type | Description |
|---|---|---|
| `today`, `tomorrow` | `Day` | `{ date: "YYYY-MM-DD", weekday: "Mon" … "Sun" }`. |
| `weekend` | `{ start: string; end: string }` | The next weekend, or this one when it is already the weekend (its second day included). |
| `nextWeek` | `{ start: string; end: string }` | The week after this one, from the locale's first day, seven days long. |
| `upcoming` | `Day[]` | The `days` days after today. |

`weekOf` returns the locale's `WeekInfo` from `Intl.Locale#getWeekInfo()` (or the older `weekInfo`) where the runtime knows it, else `DEFAULT_WEEK`.

## Notes

- en-US starts its week on Sunday, ar-AE has a Saturday and Sunday weekend, fa-IR a Friday one.
- Date arithmetic is done in UTC, so no time zone shifts a day.
- A locale that is not a valid tag gives `DEFAULT_WEEK` instead of throwing.

## See also

- [`getTime`](./get-time.md), the tool that answers with it
- [Common tools](../../build/common-tools.mdx)
