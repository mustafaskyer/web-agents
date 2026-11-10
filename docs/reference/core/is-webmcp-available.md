---
description: "Returns true when the page has document.modelContext, from native WebMCP or the polyfill."
---

# `isWebMCPAvailable`

Returns `true` when the page has `document.modelContext`, from native WebMCP or the polyfill. Use it to decide whether to show tool-related UI.

## Import

```ts
import { isWebMCPAvailable } from "@webmcp-agents/core";
```

## Example

Show a hint only where an agent could use the page. `@webmcp-agents/react` reads it the same way in `useWebTool`.

```ts
import { isWebMCPAvailable } from "@webmcp-agents/core";

const hint = document.querySelector("#agent-hint");

if (hint instanceof HTMLElement) {
  hint.hidden = !isWebMCPAvailable();
}
```

## Options

None: `isWebMCPAvailable()` takes no arguments.

## Returns

`true` when `document` exists and `document.modelContext` is set; `false` otherwise, including on the server.

## Notes

- It is a plain check with no events: while `createWebAgents` (or `<WebAgentsProvider>`) loads the polyfill it is `false`, so ask again later, or wait with [`whenModelContext`](./when-model-context.md).
- It says nothing about tools: an empty `modelContext` is still available.

## See also

- [Installation](<../../(get-started)/installation/index.mdx>)
- [`registerWebTool`](./register-web-tool.md)
- [`executeTool`](./execute-tool.md)
- [WebMCP types](./webmcp-types.md)
