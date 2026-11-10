---
slug: reference/tools
description: "Common WebMCP tools, ready-made."
---

# `@webmcp-agents/tools`

Common WebMCP tools, ready-made. Each factory returns a tool from [`defineWebTool`](../core/define-web-tool.md): put it in your catalog beside your own, and an agent can ask what day it is, where the user is, what page they are on, go somewhere, go back, show a section, or switch the theme.

```sh
pnpm add @webmcp-agents/tools @webmcp-agents/core
```

<include meta='title="tools/index.ts"'>/_examples/shared/reference/tools/catalog.ts</include>

```tsx
<WebAgentsProvider tools={tools}>
  <App />
</WebAgentsProvider>
```

The tools need no framework, no router and no app state. Nothing touches the DOM until a tool runs, so they are safe to define on the server (a file that `defineWebAgent` lists tools from may import them). Import only what you use; the rest is tree-shaken. Every factory also takes `{ id?, description? }` to rename a tool or reword what the agent reads (name your own tools in the "next" part).

## The tools

| File | Tool id | Answers or does |
|---|---|---|
| [`getTime`](./get-time.md) | `get_time` | The user's date, time, time zone and locale; what "tomorrow", "this weekend", "next Friday" mean for them. Read-only. |
| [`getLocation`](./get-location.md) | `get_location` | City, region, country and coordinates, after the browser's permission prompt. Read-only. |
| [`getPage`](./get-page.md) | `get_page` | Where the user is: title, path, query parameters, hash, language, selected text, headings. Read-only. |
| [`goTo`](./go-to.md) | `go_to` | Navigate to one of the pages the site lists, by name. |
| [`goBack`](./go-back.md) | `go_back` | Back one step in history. |
| [`scrollTo`](./scroll-to.md) | `scroll_to` | Scroll to a heading or a piece of text and highlight it. |
| [`setTheme`](./set-theme.md) | `set_theme` | Light, dark or system. |
| [`calendarAt`, `weekOf`](./calendar.md) | | The pure calendar `get_time` uses: relative dates for a locale's week. |

Common options: `CommonToolOptions = { id?: string; description?: string }`, extended by each factory's own options.

## Notes

- The tools are ordinary `defineWebTool` tools, so `match`, flags and `invoke` work as for yours: `tools.getTime.invoke()` resolves to the answer (`{ content, structuredContent }`).
- Where a tool has a control the cursor can go to (the link `go_to` clicks, the switch `set_theme` presses, the section `scroll_to` shows), it says so with a `target`, so the cursor shows where it went. The readers have none and run unseen.
- Inputs are JSON Schemas (no schema library needed). Core does not validate a JSON Schema input, so the tools that take a value check it themselves and answer `invalid_input`.

## See also

- [`defineWebTool`](../core/define-web-tool.md)
- [`<WebAgentsProvider>`](../react/web-agents-provider.md)
- [Common tools](../../build/common-tools.mdx)
