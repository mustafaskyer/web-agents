---
description: "The scroll_to tool: bring a heading, or a piece of text, into view and highlight it for a moment, so the agent can show the user where something is (\"where's the refund policy?\")."
---

# `scrollTo`

The `scroll_to` tool: bring a heading, or a piece of text, into view and highlight it for a moment, so the agent can show the user where something is ("where's the refund policy?"). Headings win over body text, and an exact heading over one that only starts with or contains the words. The answer quotes the start of that section, so the agent can read it too.

## Import

```ts
import { scrollTo } from "@webmcp-agents/tools";
import type { ScrollToInput, ScrollToOptions } from "@webmcp-agents/tools";
```

## Example

<include meta='title="tools/scroll-to.ts"'>/_examples/shared/reference/tools/scroll-to.ts</include>

## Input

### Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | required | A heading of this page ([`get_page`](./get-page.md) lists them) or words on it, as the user said them, e.g. `"Shipping"` or `"30-day returns"`. |

### Options

`scrollTo(options?)` takes a `ScrollToOptions`, which extends the options every common tool takes (`id`, `description`).

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | `"scroll_to"` | The tool's name (`a-z A-Z 0-9 _ . -`, 1 to 128). |
| `description` | `string` | says to use it when the user asks where something is on this page, and that `get_page` lists the headings | What the agent reads to decide when to call it. |
| `highlightMs` | `number` | `2500` | How long the highlight stays, in ms. |

## Answer

A sentence (`string`): `Scrolled to the heading "Shipping" and highlighted it. It reads: …`, with up to 300 characters of the section under the heading (up to the next heading of its level or above), or of the block that holds the matched words.

When nothing on the page says the text, the call fails with `invalid_input` and lists the page's headings (up to 20).

## Notes

- Flags: `repeatable`. The tool's `target` is the element it scrolls to, so the cursor goes there.
- The highlight uses the CSS Custom Highlight API (`::highlight(web-agents-scroll-to)`), marking the words themselves; where it is missing, the element gets an outline through a `data-web-agents-scroll-to` attribute. A small `<style>` is added to `<head>` the first time. A new call clears the previous highlight.
- Under `prefers-reduced-motion` the scroll is instant.
- Only content a person could see counts: hidden, `inert` and `aria-hidden` elements, scripts and styles, and library UI are skipped.

## See also

- [Common tools](../../build/common-tools.mdx), the page that teaches it
- [`getPage`](./get-page.md), which lists the headings
- [`defineWebTool`](../core/define-web-tool.md)
