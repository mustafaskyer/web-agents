# `listToolDescriptors`

Lists the WebMCP tools registered on this page right now, as the model sees them. Use it in an adapter that doesn't
use the widget.

```ts
import { listToolDescriptors } from "@webmcp-agents/chat";
```

## Signature

```ts
function listToolDescriptors(): Promise<ToolDescriptor[]>;

interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}
```

## Parameters

None.

## Returns

A `Promise<ToolDescriptor[]>` from `document.modelContext.getTools()`:

- Tools whose `origin` is another origin are left out (Chrome reports where a tool lives).
- `description` falls back to the tool's `title`, then its `name`.
- `inputSchema` is parsed when it is a JSON string. A missing or unreadable schema becomes
  `{ type: "object", properties: {} }`.

Without `document.modelContext` (no WebMCP, or on the server) it resolves to `[]`.

## Example

```ts
const tools = await listToolDescriptors();
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ messages, tools, page: { url: location.href } }),
});
```

## Notes

- Tools change as the page changes (a route swaps, a form hides itself). Read the list again before every model call;
  `useAgentSession` refreshes it on every `toolchange` and after each tool call.
- It rejects if `getTools()` rejects; `useAgentSession` treats that as an empty list.

## See also

- [`callModelContextTool`](./call-model-context-tool.md)
- [`ToolDescriptor`](./adapter-types.md#tooldescriptor-and-tooloutput)
- [`useAgentSession`](./use-agent-session.md)
