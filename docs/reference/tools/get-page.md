---
description: "The getpage tool: where the user is on the site, read from the page itself: its title, path, query parameters, hash and language, the text the user selected, and its headings (the outline an agent can scrollto)."
---

# `getPage`

The `get_page` tool: where the user is on the site, read from the page itself: its title, path, query parameters, hash and language, the text the user selected, and its headings (the outline an agent can [`scroll_to`](./scroll-to.md)). Reach for it when the user says "this page" or "what I selected".

## Import

```ts
import { getPage } from "@webmcp-agents/tools";
import type {
  GetPageOptions,
  PageAnswer,
  PageHeading,
  PageInfo,
} from "@webmcp-agents/tools";
```

## Example

<include meta='title="tools/get-page.ts"'>/_examples/shared/reference/tools/get-page.ts</include>

## Input

### Parameters

None: the tool takes no input.

### Options

`getPage(options?)` takes a `GetPageOptions`, which extends the options every common tool takes (`id`, `description`).

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | `"get_page"` | The tool's name (`a-z A-Z 0-9 _ . -`, 1 to 128). |
| `description` | `string` | says what it answers, to use it for "this page" and "the selected text" | What the agent reads to decide when to call it. |
| `maxHeadings` | `number` | `40` | At most this many headings in the answer, in page order. Lower it on pages with long outlines to keep the answer short. |

## Answer

A summary for the agent, and `structuredContent`, a `PageInfo`:

| Field | Description |
|---|---|
| `title`, `url`, `path` | `document.title`, `location.href`, `location.pathname`. |
| `query` | The URL's query parameters; a repeated one is a list (`?tag=a&tag=b` is `{ tag: ["a", "b"] }`). |
| `hash` | The hash without `#`, or `""`. |
| `language` | `<html lang>`, else the browser's language. |
| `selection` | The text the user selected on the page, or `""`, capped at 2000 characters. |
| `headings` | The visible headings (`h1` to `h6`, `[role=heading]`) in page order: `level`, `text`, and `id` when it has one. |

## Notes

- Flags: `readOnly`. The tool has no control, so it runs unseen, and it never fails.
- "Query" means the URL's query parameters: filters, search terms and ids in the URL, which is what the agent needs to act on what the user sees.
- A selection inside library UI (the chat, the devtools) is ignored, and so are headings that are hidden, `inert`, `aria-hidden` or inside library UI.
- A heading's level comes from `aria-level` when it has one, else its tag; a `[role=heading]` without a level counts as 2.

## See also

- [Common tools](../../build/common-tools.mdx), the page that teaches it
- [`scrollTo`](./scroll-to.md), which shows one of the headings
- [`defineWebTool`](../core/define-web-tool.md)
