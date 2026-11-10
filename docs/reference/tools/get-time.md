---
description: "The get_time tool: the user's date, time, time zone and locale, and what relative dates like \"next Friday\" mean for them."
---

# `getTime`

The `get_time` tool: the user's date, time, time zone and locale, and what relative dates mean for them ("tomorrow", "this weekend", "next Friday"), so "book it for next Friday" becomes a `YYYY-MM-DD` the agent did not have to work out. Reach for it in any catalog where a tool takes a date.

## Import

```ts
import { getTime } from "@webmcp-agents/tools";
import type { GetTimeOptions, TimeAnswer, TimeInfo } from "@webmcp-agents/tools";
```

## Example

<include meta='title="tools/get-time.ts"'>/_examples/shared/reference/tools/get-time.ts</include>

## Input

### Parameters

None: the tool takes no input.

### Options

`getTime(options?)` takes a `GetTimeOptions`, which extends the options every common tool takes (`id`, `description`).

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | `"get_time"` | The tool's name (`a-z A-Z 0-9 _ . -`, 1 to 128). Change it when your catalog already has a tool of that name. |
| `description` | `string` | says what it answers, to use it whenever the user gives a relative date, and to pass the date on as `YYYY-MM-DD` | What the agent reads to decide when to call it. Replace it to name your site's own tools in the "next" part. |
| `locale` | `string` | `navigator.language` | The user's locale, for the week's first day and weekend. Set it when your app has its own language setting. |

## Answer

`WebTool<Record<string, never>, TimeAnswer>`. The text is one fact per line for the agent (no full stop after a date, because models copy it into arguments); `structuredContent` is a `TimeInfo` for code:

| Field | Description |
|---|---|
| `now` | The moment, as an ISO string (UTC). |
| `time` | The user's local time, `"14:05"`. |
| `timeZone`, `utcOffset` | The IANA time zone (`"Europe/London"`) and `"UTC+01:00"`. |
| `locale`, `week` | The locale the week came from, and its week: `{ firstDay, weekend }` (1 = Monday … 7 = Sunday). |
| `today`, `tomorrow` | `{ date: "YYYY-MM-DD", weekday: "Mon" }`. |
| `weekend` | `{ start, end }` of the next weekend, or this one when it is already the weekend. |
| `nextWeek` | `{ start, end }` of the week after this one, by the locale's first day. |
| `upcoming` | The next 14 days after today, each as `{ date, weekday }`. |

## Notes

- Flags: `readOnly`. The tool has no control, so it runs unseen, and it never fails.
- The calendar is [`calendarAt`](./calendar.md); the week comes from `Intl.Locale#getWeekInfo()` (or the older `weekInfo`) where the runtime has it, else Monday-first with a Saturday and Sunday weekend.
- The clock is read when the tool is called; nothing is cached.
- Without `navigator` (a server) the locale falls back to `"en"`.

## See also

- [Common tools](../../build/common-tools.mdx), the page that teaches it
- [`calendarAt`, `weekOf`](./calendar.md), the calendar behind it
- [`defineWebTool`](../core/define-web-tool.md)
