---
description: "Lists the WebMCP tools registered on this page right now, as a model reads them."
---

# `listToolDescriptors`

Lists the WebMCP tools registered on this page right now, as a model reads them. Use it in an adapter or a request of your own that does not go through the session.

## Import

```ts
import { listToolDescriptors } from "@webmcp-agents/chat";
import type { ToolDescriptor } from "@webmcp-agents/chat";
```

## Example

Send the page's current tools with a chat request.

<include meta='title="list-tools.ts"'>/_examples/shared/reference/chat/list-tool-descriptors.ts</include>

## Options

None. `listToolDescriptors()` takes no arguments and reads `document.modelContext` at the moment you call it.

## Returns

A `Promise<ToolDescriptor[]>` from `document.modelContext.getTools()`. A [`ToolDescriptor`](./adapter-types.md#tooldescriptor-and-tooloutput) is `{ name, description, inputSchema }`.

- Tools whose `origin` is another origin are left out (Chrome reports where a tool lives).
- `description` falls back to the tool's `title`, then its `name`.
- `inputSchema` is parsed when it is a JSON string. A missing or unreadable schema becomes `{ type: "object", properties: {} }`.
- Without `document.modelContext` (no WebMCP, or on the server) it resolves to `[]`.

## Notes

- Tools change as the page changes (a route swaps, a form hides itself). Read the list again before every model call; [`useAgentSession`](./use-agent-session.md) refreshes it on every `toolchange` and after each tool call.
- It rejects if `getTools()` rejects; `useAgentSession` treats that as an empty list.

## See also

- [Add the chat](../../build/add-the-chat.mdx)
- [`callModelContextTool`](./call-model-context-tool.md)
- [`ToolDescriptor`](./adapter-types.md#tooldescriptor-and-tooloutput)
- [`inspectTools`](../core/inspect-tools.md), where each tool's cursor would go
